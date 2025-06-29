// public/gameManager.js (VERSIÓN FINAL CON BÚSQUEDA INTEGRADA Y ORDENADA)

import { API_BASE_URL } from './appConfig.js';
import { fetchAuthenticated, updateCurrentUserGameCount } from './authClient.js';
import * as gameService from './gameService.js';
import { getElem, escapeHtml, previewImage, handleScreenshotPreview, updateFormStarsVisual, createFormStars, debounce } from './domUtils.js';
import { notificationService } from './notificationService.js';
import { getText } from './i18n.js';
import { renderPlaceholderGames } from './render.js';

// --- Estado del Módulo ---
export let games = [];
let lastDeletedGamesData = null;

// --- Variables de Estado para Paginación ---
let currentPage = 1;
const GAMES_PER_PAGE = 20;
let isLoadingMore = false;
let hasMoreGamesToLoad = true;
let currentGlobalFilters = {};
let currentGlobalSortOrder = 'title-asc';

// --- Referencias a Elementos del DOM ---
let gameListElement, gameFormElement, editGameIdInputElement, submitButtonElement,
    deleteSelectedBtnElement, undoDeleteBtnElement, addGameBtnElement, titleInputElement,
    platformInputElement, yearInputElement, developerInputElement, publisherInputElement,
    genreInputElement, formatSelectElement, quantityInputElement, capacitySelectElement,
    languageInputElement, regionInputElement, ageRatingInputElement, barcodeInputElement,
    conditionInputElement, progressSelectElement, multiplayerInputElement, numPlayersInputElement,
    additionalInfoInputElement, copyProtectionInputElement, hiddenRatingInputElement,
    coverInputElement, backCoverInputElement, screenshotsInputElement, coverPreviewElement,
    backCoverPreviewElement, screenshotsPreviewContainerElement, existingScreenshotsPreviewElement,
    existingScreenshotsLabelElement, deleteScreenshotsControlsElement, deleteSelectedScreenshotsBtnElement,
    reqCpuInputElement, reqSoundInputElement, reqControllerInputElement, reqGfxInputElement,
    reqMemoryInputElement, reqHddInputElement, formRatingStarsContainerElement,
    quantityContainerElement, capacityContainerElement, numPlayersContainerElement,
    isLoanedSelectElement, loanDetailsContainerElement, loanedToInputElement, loanDateInputElement,
    infiniteScrollLoaderElement;

// --- Callbacks ---
let renderGameListCallback = (gamesToRender, append = false) => console.warn('renderGameListCallback no asignado', gamesToRender, append);
let updatePlatformFilterListCallback = (summaryData) => console.warn('updatePlatformFilterListCallback no asignado', summaryData);
let updateDeleteButtonStateCallback = () => console.warn('updateDeleteButtonStateCallback no asignado');
let showGameDetailsModalCallback = (gameId) => console.warn('showGameDetailsModalCallback no asignado', gameId);
let openGameFormModalCallback = (isEditing = false) => console.warn('openGameFormModalCallback no ha sido configurado en gameManager', isEditing);
let closeGameFormModalCallback = () => console.warn('closeGameFormModalCallback no ha sido configurado en gameManager');

export function setRenderGameListCallback(callback) { renderGameListCallback = callback; }
export function setUpdatePlatformFilterListCallback(callback) { updatePlatformFilterListCallback = callback; }
export function setUpdateDeleteButtonStateCallback(callback) { updateDeleteButtonStateCallback = callback; }
export function setShowGameDetailsModalCallback(callback) { showGameDetailsModalCallback = callback; }
export function setOpenGameFormModalCallback(callback) { openGameFormModalCallback = callback; }
export function setCloseGameFormModalCallback(callback) { closeGameFormModalCallback = callback; }

// --- INICIALIZACIÓN Y LÓGICA PRINCIPAL ---

export async function loadAndSetPlatformSummaries() {
    try {
        const platformSummaries = await gameService.fetchAllPlatformSummaries();
        if (typeof updatePlatformFilterListCallback === 'function') {
            updatePlatformFilterListCallback(platformSummaries);
        }
    } catch (error) {
        console.error("Error cargando resumen de plataformas:", error);
    }
}

export function initGameManager() {
    // Referencias al DOM
    gameListElement = getElem('gameList');
    gameFormElement = getElem('gameForm', false);
    // ... (el resto de tus getElem) ...
    
    // Asignación de Event Listeners
    addGameBtnElement?.addEventListener('click', () => {
        clearAndResetGameForm();
        openGameFormModalCallback(false);
    });
    deleteSelectedBtnElement?.addEventListener('click', handleDeleteSelectedGames);
    undoDeleteBtnElement?.addEventListener('click', handleUndoLastDeletion);
    gameFormElement?.addEventListener('submit', handleGameFormSubmit);
    // ... (el resto de tus listeners) ...
    gameListElement?.addEventListener('click', (ev) => {
        const editBtn = ev.target.closest('.btn-edit-game');
        if (editBtn && editBtn.dataset.id) {
            ev.stopPropagation();
            populateFormForEdit(editBtn.dataset.id);
            return;
        }
        if (ev.target.classList.contains('game-delete-checkbox')) {
            updateDeleteButtonStateCallback();
            return;
        }
        const card = ev.target.closest('.game-card-simple');
        if (card && card.dataset.id && !editBtn) {
            showGameDetailsModalCallback(card.dataset.id);
        }
    });

    window.addEventListener('scroll', debounce(handleScroll, 200));
    
    document.querySelectorAll('.custom-file-upload-btn').forEach(button => {
        if (!button.dataset.listenerAttached) {
            button.addEventListener('click', () => {
                const targetInputId = button.dataset.targetInput;
                if (targetInputId) document.getElementById(targetInputId)?.click();
            });
            button.dataset.listenerAttached = 'true';
        }
    });

    // Se inicializa la nueva funcionalidad del buscador
    setupExternalSearch();
}

// =============================================================
// === LÓGICA PARA LA BÚSQUEDA DE JUEGOS EXTERNOS ===
// =============================================================

function setupExternalSearch() {
    const searchButton = getElem('external-game-search-button', false);
    const searchInput = getElem('external-game-search-input', false);
    
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', performExternalSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performExternalSearch();
            }
        });
    }
}

async function performExternalSearch() {
    const searchInput = getElem('external-game-search-input');
    const query = searchInput.value.trim();
    if (!query) {
        notificationService.warn('Por favor, ingresa un título para buscar.');
        return;
    }

    const loadingIndicator = getElem('search-loading-indicator');
    const resultsContainer = getElem('external-search-results');
    loadingIndicator.style.display = 'block';
    resultsContainer.innerHTML = '';

    try {
        const results = await gameService.searchExternalGames(query);
        renderExternalSearchResults(results);
    } catch (error) {
        notificationService.error(error.message);
        resultsContainer.innerHTML = `<p class="error-message">${escapeHtml(error.message)}</p>`;
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function renderExternalSearchResults(results) {
    const resultsContainer = getElem('external-search-results');
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
    }

    const resultList = document.createElement('ul');
    resultList.className = 'search-result-list'; // Añade estilos para esta clase en tu CSS

    results.forEach(game => {
        const li = document.createElement('li');
        li.className = 'search-result-item';
        li.dataset.id = game.id; // ID de RAWG
        li.innerHTML = `
            <img src="${game.background_image || 'imagenes/placeholder_box.png'}" alt="Cover de ${escapeHtml(game.name)}">
            <div class="result-info">
                <strong>${escapeHtml(game.name)}</strong>
                <span>(${game.released ? game.released.split('-')[0] : 'N/A'})</span>
            </div>
        `;
        li.addEventListener('click', () => selectExternalGame(game.id));
        resultList.appendChild(li);
    });

    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(resultList);
}

async function selectExternalGame(gameId) {
    notificationService.info('Obteniendo detalles del juego...', null, 2000);
    getElem('external-search-results').innerHTML = ''; // Limpia los resultados

    try {
        const gameDetails = await gameService.getExternalGameDetails(gameId);
        populateFormWithData(gameDetails, true);
    } catch (error) {
        notificationService.error(error.message);
    }
}

// =============================================================
// === LÓGICA DEL FORMULARIO Y CRUD (Crear, Leer, Actualizar, Borrar) ===
// =============================================================

function populateFormWithData(gameData, isExternal = false) {
    clearAndResetGameForm();

    // Rellenamos el formulario con los datos recibidos
    if (titleInputElement) titleInputElement.value = gameData.title || '';
    if (yearInputElement) yearInputElement.value = gameData.year || '';
    if (developerInputElement) developerInputElement.value = gameData.developer || '';
    if (publisherInputElement) publisherInputElement.value = gameData.publisher || '';
    if (genreInputElement) genreInputElement.value = gameData.genre || '';
    
    // Mapeo inteligente de plataforma
    if (platformInputElement && gameData.platform) {
        const apiPlatforms = gameData.platform.toLowerCase();
        let bestMatch = '';
        for (let option of platformInputElement.options) {
            if (apiPlatforms.includes(option.text.toLowerCase())) {
                bestMatch = option.value;
                break;
            }
        }
        platformInputElement.value = bestMatch;
    }

    // Si estamos editando (no es externo), rellenamos el resto de los campos
    if (!isExternal) {
        if (editGameIdInputElement) editGameIdInputElement.value = gameData._id || '';
        // Aquí iría el resto de la lógica de tu función populateFormForEdit...
        // por ejemplo:
        // if (formatSelectElement) formatSelectElement.value = gameData.format || '';
        // etc.
    }

    if (isExternal) {
        notificationService.success('¡Datos cargados! Revisa y completa los campos restantes.');
    }
}

export async function populateFormForEdit(gameId) {
    try {
        const gameData = await gameService.fetchGameById(gameId);
        // Ahora usamos la función genérica para rellenar el formulario
        populateFormWithData(gameData, false);
        openGameFormModalCallback(true);
    } catch (error) {
        console.error("Error al obtener datos del juego para edición:", error);
        notificationService.error(getText('gameManager_error_prepareEditForm', { message: error.message }));
        closeGameFormModalCallback();
    }
}
        if (editGameIdInputElement) editGameIdInputElement.value = gameData._id || '';
        if (titleInputElement) titleInputElement.value = gameData.title || '';
        if (platformInputElement) platformInputElement.value = gameData.platform || '';
        if (yearInputElement) yearInputElement.value = gameData.year || '';
        if (developerInputElement) developerInputElement.value = gameData.developer || '';
        if (publisherInputElement) publisherInputElement.value = gameData.publisher || '';
        if (genreInputElement) genreInputElement.value = gameData.genre || '';
        if (formatSelectElement) formatSelectElement.value = gameData.format || '';
        handleFormatChangeInManager();
        if (quantityInputElement) quantityInputElement.value = gameData.quantity || '';
        if (capacitySelectElement) capacitySelectElement.value = gameData.capacity || '';
        if (languageInputElement) languageInputElement.value = gameData.language || '';
        if (regionInputElement) regionInputElement.value = gameData.region || '';
        if (ageRatingInputElement) ageRatingInputElement.value = gameData.ageRating || '';
        if (barcodeInputElement) barcodeInputElement.value = gameData.barcode || '';
        if (conditionInputElement) conditionInputElement.value = gameData.condition || '';
        if (progressSelectElement) progressSelectElement.value = gameData.progress || '';
        if (multiplayerInputElement) multiplayerInputElement.value = gameData.multiplayer ? 'true' : 'false';
        handleMultiplayerChangeInManager();
        if (numPlayersInputElement) numPlayersInputElement.value = gameData.numPlayers || '';
        if (additionalInfoInputElement) additionalInfoInputElement.value = decodeHtml(gameData.additionalInfo || '');
        if (copyProtectionInputElement) copyProtectionInputElement.value = decodeHtml(gameData.copyProtection || '');
        if (hiddenRatingInputElement) hiddenRatingInputElement.value = gameData.rating || '0';
        if (formRatingStarsContainerElement && hiddenRatingInputElement) {
            updateFormStarsVisual(hiddenRatingInputElement.value, formRatingStarsContainerElement);
        }
        if (gameData.systemRequirements) {
            if (reqCpuInputElement) reqCpuInputElement.value = gameData.systemRequirements.cpu || '';
            if (reqControllerInputElement) reqControllerInputElement.value = gameData.systemRequirements.controller || '';
            if (reqGfxInputElement) reqGfxInputElement.value = gameData.systemRequirements.gfx || '';
            if (reqHddInputElement) reqHddInputElement.value = gameData.systemRequirements.hdd || '';
            if (reqSoundInputElement) reqSoundInputElement.value = decodeHtml(gameData.systemRequirements.sound || '');
            if (reqMemoryInputElement) reqMemoryInputElement.value = decodeHtml(gameData.systemRequirements.memory || '');
            }
        if (coverPreviewElement) {
            // CORRECCIÓN 1: Usar directamente la URL de Cloudinary.
            coverPreviewElement.innerHTML = gameData.cover ? `<img src="${gameData.cover}" alt="${getText('alt_coverPreview', { title: gameData.title })}">` : '';
        }
        if (backCoverPreviewElement) {
            // CORRECCIÓN 2: Usar directamente la URL de Cloudinary.
            backCoverPreviewElement.innerHTML = gameData.backCover ? `<img src="${gameData.backCover}" alt="${getText('alt_backCoverPreview', { title: gameData.title })}">` : '';
        }
        if (existingScreenshotsPreviewElement && existingScreenshotsLabelElement && deleteScreenshotsControlsElement && deleteSelectedScreenshotsBtnElement) {
            existingScreenshotsPreviewElement.innerHTML = '';
            if (gameData.screenshots && gameData.screenshots.length > 0) {
                gameData.screenshots.forEach((scrPath, index) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'existing-screenshot-item-wrapper';
                    const img = document.createElement('img');
                    // CORRECCIÓN 3: Usar directamente la URL de Cloudinary.
                    img.src = scrPath;
                    img.alt = getText('gameManager_alt_existingScreenshot').replace('{index}', index + 1);
                    img.className = 'existing-screenshot-image';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'existing-screenshot-checkbox';
                    checkbox.value = scrPath;
                    checkbox.dataset.screenshotPath = scrPath;
                    checkbox.id = `existing_scr_cb_${index}`;
                    const itemContainer = document.createElement('div');
                    itemContainer.className = 'existing-screenshot-item';
                    itemContainer.appendChild(checkbox);
                    itemContainer.appendChild(img);
                    wrapper.appendChild(itemContainer);
                    existingScreenshotsPreviewElement.appendChild(wrapper);
                });
                existingScreenshotsLabelElement.style.display = 'block';
                existingScreenshotsPreviewElement.style.display = 'flex';
                deleteScreenshotsControlsElement.style.display = 'block';
                deleteSelectedScreenshotsBtnElement.disabled = false;
            } else {
                existingScreenshotsLabelElement.style.display = 'none';
                existingScreenshotsPreviewElement.style.display = 'none';
                deleteScreenshotsControlsElement.style.display = 'none';
                deleteSelectedScreenshotsBtnElement.disabled = true;
            }
        }
        if (isLoanedSelectElement) isLoanedSelectElement.value = gameData.isLoaned ? 'true' : 'false';
        if (loanedToInputElement) loanedToInputElement.value = gameData.loanedTo || '';
        if (loanDateInputElement && gameData.loanDate) {
            loanDateInputElement.value = new Date(gameData.loanDate).toISOString().split('T')[0];
        } else if (loanDateInputElement) {
            loanDateInputElement.value = '';
        }
        handleIsLoanedChangeInManager();
        updateCintaOptionStateInManager();
        openGameFormModalCallback(true);
    } catch (error) {
        console.error("Error al obtener datos del juego para edición:", error);
        notificationService.error(getText('gameManager_error_prepareEditForm', { message: error.message }).replace('{message}', error.message || 'Unknown error'), error);
        closeGameFormModalCallback();
    }
}
async function handleDeleteSelectedGames() {
    if (!gameListElement || !deleteSelectedBtnElement) return;
    const checkedBoxes = gameListElement.querySelectorAll('.game-delete-checkbox:checked');
    if (checkedBoxes.length === 0) {
        notificationService.warn(getText('gameManager_warnSelectGamesToDelete'));
        return;
    }
    const idsToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.id);
    const gamesToDeleteDataFiltered = games.filter(game => idsToDelete.includes(game._id));
    const dataToStoreForUndo = gamesToDeleteDataFiltered.map(game => {
        const { _id, createdAt, updatedAt, userId, isLoaned, loanedTo, loanDate, ...restOfGame } = game;
        let processedRest = { ...restOfGame };
        if (processedRest.systemRequirements && typeof processedRest.systemRequirements === 'string') {
            try { processedRest.systemRequirements = JSON.parse(processedRest.systemRequirements); }
            catch (e) { processedRest.systemRequirements = {}; }
        } else if (!processedRest.systemRequirements || typeof processedRest.systemRequirements !== 'object') {
            processedRest.systemRequirements = {};
        }
        if (processedRest.hasOwnProperty('multiplayer')) {
            processedRest.multiplayer = Boolean(String(processedRest.multiplayer).toLowerCase() === 'true');
        }
        return { ...processedRest, isLoaned, loanedTo, loanDate };
    });
    const confirmDeleteMsgKey = idsToDelete.length === 1 ? 'gameManager_confirmDeleteOneGame' : 'gameManager_confirmDeleteMultipleGames';
    const confirmDeleteMsg = getText(confirmDeleteMsgKey).replace('{count}', idsToDelete.length.toString());
    if (confirm(confirmDeleteMsg)) {
        if (deleteSelectedBtnElement) deleteSelectedBtnElement.disabled = true;
        if (undoDeleteBtnElement) undoDeleteBtnElement.disabled = true;
        let errorCount = 0;
        let successCount = 0;
        let errorMessages = [];
        for (const id of idsToDelete) {
            try {
                await gameService.deleteGameById(id);
                successCount++;
            } catch (error) {
                console.error(`Error eliminando juego ${id}: ${error.message}`);
                errorCount++;
                errorMessages.push(error.message);
            }
        }
        if (errorCount > 0) {
            notificationService.error(getText('gameManager_deleteError').replace('{errors}', errorMessages.join("; ")), errorMessages);
        }
        if (successCount > 0) {
            const deleteSuccessMsgKey = successCount === 1 ? 'gameManager_deleteSuccessOneGame' : 'gameManager_deleteSuccessMultipleGames';
            notificationService.success(getText(deleteSuccessMsgKey).replace('{count}', successCount.toString()));
            lastDeletedGamesData = dataToStoreForUndo;
            if (undoDeleteBtnElement && lastDeletedGamesData.length > 0) undoDeleteBtnElement.disabled = false;
            updateCurrentUserGameCount(-successCount);
        } else {
            lastDeletedGamesData = null;
            if (undoDeleteBtnElement) undoDeleteBtnElement.disabled = true;
            if (errorCount > 0 && successCount === 0) {
            } else if (errorCount === 0 && successCount === 0) {
                notificationService.info(getText('gameManager_deleteNone'));
            }
        }
        await loadInitialGames(currentGlobalFilters, currentGlobalSortOrder);
    }
}

async function handleUndoLastDeletion() {
    if (!lastDeletedGamesData || lastDeletedGamesData.length === 0) {
        notificationService.info(getText('gameManager_undoNothingToUndo'));
        return;
    }
    if (undoDeleteBtnElement) undoDeleteBtnElement.disabled = true;
    let restoredCount = 0;
    let errors = 0;
    let errorMessages = [];
    for (const gameData of lastDeletedGamesData) {
        try {
            await gameService.restoreGame(gameData);
            restoredCount++;
        } catch (error) {
            console.error(`Error restaurando juego "${gameData.title || 'Desconocido'}": ${error.message}`);
            errors++;
            errorMessages.push(error.message);
        }
    }
    if (restoredCount > 0) {
        const undoSuccessMsgKey = restoredCount === 1 ? 'gameManager_undoRestoredOneGame' : 'gameManager_undoRestoredMultipleGames';
        notificationService.success(getText(undoSuccessMsgKey).replace('{count}', restoredCount.toString()));
        updateCurrentUserGameCount(restoredCount);
    }
    if (errors > 0) {
        notificationService.error(getText('gameManager_undoErrorRestoring').replace('{errorsCount}', errors.toString()).replace('{errorMessages}', errorMessages.join("; ")), errorMessages);
    }
    if (restoredCount === 0 && errors === 0) {
        notificationService.info(getText('gameManager_undoNoGamesRestored'));
    }
    lastDeletedGamesData = null;
    await loadInitialGames(currentGlobalFilters, currentGlobalSortOrder);
}


async function handleDeleteSelectedScreenshots() {
    if (!editGameIdInputElement || !existingScreenshotsPreviewElement || !deleteSelectedScreenshotsBtnElement) return;
    const gameId = editGameIdInputElement.value;
    if (!gameId) {
        notificationService.error(getText('gameManager_noGameIdForScreenshotDelete'));
        return;
    }
    const selectedCheckboxes = existingScreenshotsPreviewElement.querySelectorAll('.existing-screenshot-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        notificationService.warn(getText('gameManager_warnSelectScreenshotsToDelete'));
        return;
    }
    const screenshotsToDelete = Array.from(selectedCheckboxes).map(cb => cb.dataset.screenshotPath);
    const confirmMsg = getText('gameManager_confirmDeleteScreenshots').replace('{count}', screenshotsToDelete.length.toString());
    if (confirm(confirmMsg)) {
        try {
            deleteSelectedScreenshotsBtnElement.disabled = true;
            await gameService.deleteGameScreenshots(gameId, screenshotsToDelete);
            notificationService.success(getText('gameManager_screenshotsDeletedSuccess'));
            await populateFormForEdit(gameId);
        } catch (error) {
            console.error("Error eliminando capturas de pantalla:", error);
            notificationService.error(getText('gameManager_errorDeletingScreenshots').replace('{message}', error.message || 'Unknown error'), error);
            if (deleteSelectedScreenshotsBtnElement) deleteSelectedScreenshotsBtnElement.disabled = false;
        }
    }
}


function handleFormatChangeInManager() {
    if (!formatSelectElement || !quantityContainerElement || !quantityInputElement || !capacityContainerElement || !capacitySelectElement) return;
    const selectedFormat = formatSelectElement.value;
    const requiresQuantity = ['gameForm_format_diskette', 'gameForm_format_cd', 'gameForm_format_dvd'].includes(selectedFormat);
    const requiresCapacity = selectedFormat === 'gameForm_format_diskette';
    quantityContainerElement.style.display = requiresQuantity ? 'block' : 'none';
    if (quantityInputElement) quantityInputElement.required = requiresQuantity;
    if (!requiresQuantity && quantityInputElement) quantityInputElement.value = '';
    capacityContainerElement.style.display = requiresCapacity ? 'block' : 'none';
    if (capacitySelectElement) capacitySelectElement.required = requiresCapacity;
    if (!requiresCapacity && capacitySelectElement) capacitySelectElement.value = '';
}

function handleMultiplayerChangeInManager() {
    if (!multiplayerInputElement || !numPlayersContainerElement || !numPlayersInputElement) return;
    const isMultiplayer = multiplayerInputElement.value === 'true';
    numPlayersContainerElement.style.display = isMultiplayer ? 'block' : 'none';
    if (numPlayersInputElement) numPlayersInputElement.required = isMultiplayer;
    if (!isMultiplayer && numPlayersInputElement) numPlayersInputElement.value = '';
}

function updateCintaOptionStateInManager() {
    if (!platformInputElement || !formatSelectElement) return;
    const selectedPlatform = platformInputElement.value;
    const tapePlatforms = ['Commodore 64', 'ZX Spectrum', 'MSX', 'Amstrad'];
    const cintaOption = formatSelectElement.querySelector('option[value="gameForm_format_tape"]');
    if (cintaOption) {
        const platformData = platformInputElement.options[platformInputElement.selectedIndex].text;
        const shouldBeEnabled = tapePlatforms.includes(platformData);
        cintaOption.disabled = !shouldBeEnabled;
        if (!shouldBeEnabled && formatSelectElement.value === 'gameForm_format_tape') {
            formatSelectElement.value = '';
            handleFormatChangeInManager();
        }
    }
}