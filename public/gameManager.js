// public/gameManager.js (VERSIÓN CORREGIDA PARA CLOUDINARY)
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
    gameListElement = getElem('gameList');
    gameFormElement = getElem('gameForm', false);
    editGameIdInputElement = getElem('editGameId', false);
    submitButtonElement = getElem('submitGameFormBtn', false);
    deleteSelectedBtnElement = getElem('deleteSelectedBtn');
    undoDeleteBtnElement = getElem('undoDeleteBtn');
    addGameBtnElement = getElem('addGameBtn');
    titleInputElement = getElem('title', false);
    platformInputElement = getElem('platform', false);
    yearInputElement = getElem('year', false);
    developerInputElement = getElem('developer', false);
    publisherInputElement = getElem('publisher', false);
    genreInputElement = getElem('genre', false);
    formatSelectElement = getElem('format', false);
    quantityInputElement = getElem('quantity', false);
    capacitySelectElement = getElem('capacity', false);
    languageInputElement = getElem('language', false);
    regionInputElement = getElem('region', false);
    ageRatingInputElement = getElem('ageRating', false);
    barcodeInputElement = getElem('barcode', false);
    conditionInputElement = getElem('condition', false);
    progressSelectElement = getElem('progress', false);
    multiplayerInputElement = getElem('multiplayer', false);
    numPlayersInputElement = getElem('numPlayers', false);
    additionalInfoInputElement = getElem('additionalInfo', false);
    copyProtectionInputElement = getElem('copyProtection', false);
    hiddenRatingInputElement = getElem('rating', false);
    coverInputElement = getElem('cover', false);
    backCoverInputElement = getElem('backCover', false);
    screenshotsInputElement = getElem('screenshots', false);
    coverPreviewElement = getElem('coverPreview', false);
    backCoverPreviewElement = getElem('backCoverPreview', false);
    screenshotsPreviewContainerElement = getElem('screenshotsPreview', false);
    existingScreenshotsPreviewElement = getElem('existingScreenshotsPreview', false);
    existingScreenshotsLabelElement = getElem('existingScreenshotsLabel', false);
    deleteScreenshotsControlsElement = getElem('deleteScreenshotsControls', false);
    deleteSelectedScreenshotsBtnElement = getElem('deleteSelectedScreenshotsBtn', false);
    reqCpuInputElement = getElem('reqCpu', false);
    reqSoundInputElement = getElem('reqSound', false);
    reqControllerInputElement = getElem('reqController', false);
    reqGfxInputElement = getElem('reqGfx', false);
    reqMemoryInputElement = getElem('reqMemory', false);
    reqHddInputElement = getElem('reqHdd', false);
    formRatingStarsContainerElement = getElem('formRatingStars', false);
    quantityContainerElement = getElem('quantityContainer', false);
    capacityContainerElement = getElem('capacityContainer', false);
    numPlayersContainerElement = getElem('numPlayersContainer', false);
    isLoanedSelectElement = getElem('isLoaned', false);
    loanDetailsContainerElement = getElem('loanDetailsContainer', false);
    loanedToInputElement = getElem('loanedTo', false);
    loanDateInputElement = getElem('loanDate', false);
    infiniteScrollLoaderElement = getElem('infiniteScrollLoader', false);
if (addGameBtnElement) {
        addGameBtnElement.addEventListener('click', () => {
            clearAndResetGameForm();
            openGameFormModalCallback(false);
        });
    }
    if (deleteSelectedBtnElement) {
        deleteSelectedBtnElement.addEventListener('click', handleDeleteSelectedGames);
    }
    if (undoDeleteBtnElement) {
        undoDeleteBtnElement.addEventListener('click', handleUndoLastDeletion);
    }
    if (gameFormElement) {
        gameFormElement.addEventListener('submit', handleGameFormSubmit);
    }
    if (coverInputElement && coverPreviewElement) {
        coverInputElement.addEventListener('change', () => previewImage(coverInputElement, coverPreviewElement));
    }
    if (backCoverInputElement && backCoverPreviewElement) {
        backCoverInputElement.addEventListener('change', () => previewImage(backCoverInputElement, backCoverPreviewElement));
    }
    if (screenshotsInputElement && screenshotsPreviewContainerElement) {
        screenshotsInputElement.addEventListener('change', () => handleScreenshotPreview(screenshotsInputElement, screenshotsPreviewContainerElement));
    }
    if (formRatingStarsContainerElement) {
        createFormStars(formRatingStarsContainerElement);
    }
    if (formatSelectElement) {
        formatSelectElement.addEventListener('change', handleFormatChangeInManager);
    }
    if (multiplayerInputElement) {
        multiplayerInputElement.addEventListener('change', handleMultiplayerChangeInManager);
    }
    if (platformInputElement) {
        platformInputElement.addEventListener('change', updateCintaOptionStateInManager);
        updateCintaOptionStateInManager();
    }
    if (isLoanedSelectElement) {
        isLoanedSelectElement.addEventListener('change', handleIsLoanedChangeInManager);
    }

    if (deleteSelectedScreenshotsBtnElement) {
        deleteSelectedScreenshotsBtnElement.addEventListener('click', handleDeleteSelectedScreenshots);
    }

    if (gameListElement) {
        gameListElement.addEventListener('click', (ev) => {
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
    }

    window.addEventListener('scroll', debounce(handleScroll, 200));
    handleIsLoanedChangeInManager();

    const uploadButtons = document.querySelectorAll('.custom-file-upload-btn');
    uploadButtons.forEach(button => {
        if (!button.dataset.listenerAttached) {
            button.addEventListener('click', () => {
                const targetInputId = button.dataset.targetInput;
                if (targetInputId) {
                    const targetInput = document.getElementById(targetInputId);
                    if (targetInput) {
                        targetInput.click();
                    }
                }
            });
            button.dataset.listenerAttached = 'true';
        }
    });
}


function handleIsLoanedChangeInManager() {
    if (!isLoanedSelectElement || !loanDetailsContainerElement || !loanedToInputElement || !loanDateInputElement) return;
    const isLoaned = isLoanedSelectElement.value === 'true';
    loanDetailsContainerElement.style.display = isLoaned ? 'grid' : 'none';
    if (loanedToInputElement) {
        loanedToInputElement.required = isLoaned;
        if (!isLoaned) loanedToInputElement.classList.remove('input-error');
    }
    if (loanDateInputElement) {
        loanDateInputElement.required = isLoaned;
        if (!isLoaned) loanDateInputElement.classList.remove('input-error');
    }
    if (!isLoaned) {
        if (loanedToInputElement) loanedToInputElement.value = '';
        if (loanDateInputElement) loanDateInputElement.value = '';
    }
}

function handleScroll() {
    if ((window.innerHeight + window.pageYOffset) >= document.documentElement.scrollHeight - 100) {
        loadMoreGames();
    }
}

async function showLoading(isInitial = false, numSkeletons = GAMES_PER_PAGE) {
    if (isInitial && gameListElement) {
        gameListElement.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < numSkeletons; i++) {
            const skeletonLi = document.createElement('li');
            skeletonLi.className = 'skeleton-card';
            skeletonLi.innerHTML = `
                <div class="skeleton-image"></div>
                <div class="skeleton-line title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            `;
            frag.appendChild(skeletonLi);
        }
        gameListElement.appendChild(frag);
    } else if (!isInitial && infiniteScrollLoaderElement) {
        infiniteScrollLoaderElement.style.display = 'block';
    }
}

function hideLoading() {
    if (infiniteScrollLoaderElement) {
        infiniteScrollLoaderElement.style.display = 'none';
    }
}

export async function loadInitialGames(filters = currentGlobalFilters, sortOrder = currentGlobalSortOrder) {
    currentGlobalFilters = filters;
    currentGlobalSortOrder = sortOrder;
    currentPage = 1;
    games = [];
    hasMoreGamesToLoad = true;
    isLoadingMore = true;

    if (gameListElement) gameListElement.innerHTML = '';
    
    showLoading(true, GAMES_PER_PAGE);

    try {
        const response = await gameService.fetchAllGames(currentPage, GAMES_PER_PAGE, currentGlobalFilters, currentGlobalSortOrder);
        games = response.games || [];
        hasMoreGamesToLoad = response.hasNextPage || false;
        currentPage = response.currentPage || 1;

        if (gameListElement) {
            gameListElement.innerHTML = '';
        }

        renderGameListCallback(games, false);

        const noActiveFilters = Object.values(filters).every(f_val =>
            f_val === null || f_val === undefined || (typeof f_val === 'string' && f_val.trim() === '')
        );

        if (noActiveFilters) {
            const placeholdersNeeded = 10 - games.length;
            if (placeholdersNeeded > 0) {
                renderPlaceholderGames(placeholdersNeeded);
            }
        } else {
            if (games.length === 0 && gameListElement) {
                let msgKey = 'gameManager_noGamesFoundFilters';
                gameListElement.innerHTML = `<li style="list-style:none; text-align:center; grid-column:1/-1; color: var(--clr-text-secondary); padding-top: 2rem;">${escapeHtml(getText(msgKey))}</li>`;
            }
        }

    } catch (error) {
        console.error("Error cargando juegos iniciales:", error);
        notificationService.error(getText('gameManager_errorLoadGames_notification'), error);
        games = [];
        hasMoreGamesToLoad = false;
        if (gameListElement) {
            gameListElement.innerHTML = `<li style="list-style:none; color:red; text-align:center; grid-column: 1 / -1;">${getText('gameManager_errorLoadGames_list')}</li>`;
        }
    } finally {
        isLoadingMore = false;
        hideLoading();
        updateDeleteButtonStateCallback();
        if (undoDeleteBtnElement) {
            undoDeleteBtnElement.disabled = (lastDeletedGamesData === null || lastDeletedGamesData.length === 0);
        }
    }
}

async function loadMoreGames() {
    if (isLoadingMore || !hasMoreGamesToLoad) {
        return;
    }
    isLoadingMore = true;
    showLoading(false);

    try {
        const response = await gameService.fetchAllGames(currentPage + 1, GAMES_PER_PAGE, currentGlobalFilters, currentGlobalSortOrder);

        if (response.games && response.games.length > 0) {
            games.push(...response.games);
            renderGameListCallback(response.games, true);
        }

        currentPage = response.currentPage || currentPage + 1;
        hasMoreGamesToLoad = response.hasNextPage || false;

    } catch (error) {
        console.error("Error cargando más juegos:", error);
        notificationService.error(getText('gameManager_errorLoadMoreGames'), error);
        hasMoreGamesToLoad = false;
    } finally {
        isLoadingMore = false;
        if (!hasMoreGamesToLoad || (infiniteScrollLoaderElement && infiniteScrollLoaderElement.textContent !== getText('gameManager_errorLoadMoreGames'))) {
            hideLoading();
        }
    }
}

export function reloadGamesWithCriteria(newFilters, newSortOrder) {
    currentGlobalFilters = newFilters;
    currentGlobalSortOrder = newSortOrder;
    window.scrollTo(0, 0);
    loadInitialGames(currentGlobalFilters, currentGlobalSortOrder);
}

async function handleGameFormSubmit(event) {
    event.preventDefault();
    if (!gameFormElement || !titleInputElement || !platformInputElement || !genreInputElement || !formatSelectElement || !submitButtonElement) {
        console.error("Elementos del formulario esenciales no encontrados para submit.");
        notificationService.error(getText('gameManager_error_formInternal'));
        return;
    }

    notificationService.clearFieldErrors(gameFormElement);

    const titleValue = titleInputElement.value.trim();
    const platformValue = platformInputElement.value;
    const genreValue = genreInputElement.value;
    const formatValue = formatSelectElement.value;
    let validationErrors = [];
    if (!titleValue) { validationErrors.push({ path: 'title', msg: getText('gameManager_validation_titleRequired') }); }
    if (!platformValue) { validationErrors.push({ path: 'platform', msg: getText('gameManager_validation_platformRequired') }); }
    if (!genreValue) { validationErrors.push({ path: 'genre', msg: getText('gameManager_validation_genreRequired') }); }
    if (!formatValue) { validationErrors.push({ path: 'format', msg: getText('gameManager_validation_formatRequired') }); }
    if (isLoanedSelectElement && isLoanedSelectElement.value === 'true') {
        if (loanedToInputElement && !loanedToInputElement.value.trim()) {
            validationErrors.push({ path: 'loanedTo', msg: getText('gameManager_validation_loanedToRequired') });
        }
        if (loanDateInputElement && !loanDateInputElement.value) {
            validationErrors.push({ path: 'loanDate', msg: getText('gameManager_validation_loanDateRequired') });
        }
    }
    if (validationErrors.length > 0) {
        notificationService.clearFieldErrors(gameFormElement);
        notificationService.displayFieldErrors(validationErrors, gameFormElement);
        notificationService.error(getText('gameManager_formErrorsReview'), null, 7000);
        return;
    }

    const editingId = editGameIdInputElement?.value;
    const confirmationMessageKey = editingId ? 'gameManager_confirmUpdateGame' : 'gameManager_confirmAddGame';

    if (!confirm(getText(confirmationMessageKey))) {
        return;
    }

    if (submitButtonElement) submitButtonElement.disabled = true;

    const formData = new FormData();
    formData.append('title', titleValue);
    formData.append('platform', platformValue);
    formData.append('year', yearInputElement?.value || '');
    formData.append('developer', developerInputElement?.value.trim() || '');
    formData.append('publisher', publisherInputElement?.value.trim() || '');
    formData.append('genre', genreValue);
    formData.append('format', formatValue);
    const reqQty = ['gameForm_format_diskette', 'gameForm_format_cd', 'gameForm_format_dvd'].includes(formatValue);
    const reqCap = formatValue === 'gameForm_format_diskette';
    if (reqQty && quantityInputElement?.value) formData.append('quantity', quantityInputElement.value);
    if (reqCap && capacitySelectElement?.value) formData.append('capacity', capacitySelectElement.value);
    formData.append('language', languageInputElement?.value || '');
    formData.append('region', regionInputElement?.value || '');
    formData.append('ageRating', ageRatingInputElement?.value || '');
    formData.append('barcode', barcodeInputElement?.value.trim() || '');
    formData.append('condition', conditionInputElement?.value.trim() || '');
    formData.append('progress', progressSelectElement?.value || '');
    formData.append('multiplayer', (multiplayerInputElement?.value === 'true').toString());
    if (multiplayerInputElement?.value === 'true' && numPlayersInputElement?.value) {
        formData.append('numPlayers', parseInt(numPlayersInputElement.value, 10) || '');
    }
    formData.append('additionalInfo', additionalInfoInputElement?.value.trim() || '');
    formData.append('copyProtection', copyProtectionInputElement?.value.trim() || '');
    formData.append('rating', hiddenRatingInputElement?.value || '0');
    const systemRequirements = {
        cpu: reqCpuInputElement?.value || '', sound: reqSoundInputElement?.value.trim() || '',
        controller: reqControllerInputElement?.value || '', gfx: reqGfxInputElement?.value || '',
        memory: reqMemoryInputElement?.value.trim() || '', hdd: reqHddInputElement?.value.trim() || ''
    };
    formData.append('systemRequirements', JSON.stringify(systemRequirements));
    if (coverInputElement?.files[0]) formData.append('cover', coverInputElement.files[0]);
    if (backCoverInputElement?.files[0]) formData.append('backCover', backCoverInputElement.files[0]);
    if (screenshotsInputElement?.files && screenshotsInputElement.files.length > 0) {
        for (let i = 0; i < screenshotsInputElement.files.length; i++) {
            formData.append('screenshots', screenshotsInputElement.files[i]);
        }
    }
    if (isLoanedSelectElement) {
        const isLoanedValue = isLoanedSelectElement.value === 'true';
        formData.append('isLoaned', isLoanedValue.toString());
        if (isLoanedValue) {
            if (loanedToInputElement?.value) formData.append('loanedTo', loanedToInputElement.value.trim());
            if (loanDateInputElement?.value) formData.append('loanDate', loanDateInputElement.value);
        } else {
            formData.append('loanedTo', '');
            formData.append('loanDate', '');
        }
    }
    
    try {
        let resultData;
        if (editingId) {
            resultData = await gameService.updateGame(editingId, formData);
        } else {
            resultData = await gameService.createGame(formData);
            updateCurrentUserGameCount(1);
        }
        const successMessageKey = editingId ? 'gameManager_gameUpdatedSuccess' : 'gameManager_gameAddedSuccess';
        notificationService.success(getText(successMessageKey));

        // --- INICIO DE LA CORRECCIÓN ---
        // Se recargan tanto los juegos como el resumen de plataformas.
        await Promise.all([
            loadInitialGames(currentGlobalFilters, currentGlobalSortOrder),
            loadAndSetPlatformSummaries() 
        ]);
        // --- FIN DE LA CORRECCIÓN ---
        
        closeGameFormModalCallback();
    } catch (error) {
        console.error(`Error al ${editingId ? 'actualizar' : 'crear'} juego:`, error);
    
        if (error.response && error.response.status === 403) {
            const errorData = error.data || {}; 
            
            if (errorData.messageKey && errorData.messageParams) {
                const message = getText(errorData.messageKey, errorData.messageParams);
                notificationService.warn(message, 8000);
            } else {
                notificationService.warn(error.message || 'Límite del plan alcanzado.', 8000);
            }
        
        } else if (error.errors && Array.isArray(error.errors)) {
            notificationService.clearFieldErrors(gameFormElement);
            notificationService.displayFieldErrors(error.errors, gameFormElement);
            notificationService.error(getText("gameManager_validationErrorsSaving"), null, 7000);
        } else if (error.message && error.message.toLowerCase().includes(getText('server_error_titleInUse_snippet'))) {
            notificationService.error(error.message, error);
        } else {
            let userMessageKey = 'gameManager_errorSavingGame';
            if (error.message && error.message.includes("CSRF")) {
                userMessageKey = "gameManager_securityErrorSaving";
            }
            notificationService.error(getText(userMessageKey), error);
        }
        
        if (submitButtonElement) {
            submitButtonElement.disabled = false;
        }
    }
}

export function clearAndResetGameForm() {
    if (gameFormElement) {
        gameFormElement.reset();
        notificationService.clearFieldErrors(gameFormElement);
    }
    if (coverPreviewElement) coverPreviewElement.innerHTML = '';
    if (backCoverPreviewElement) backCoverPreviewElement.innerHTML = '';
    if (screenshotsInputElement) screenshotsInputElement.value = null;
    if (screenshotsPreviewContainerElement) screenshotsPreviewContainerElement.innerHTML = '';
    if (existingScreenshotsPreviewElement) existingScreenshotsPreviewElement.innerHTML = '';
    if (existingScreenshotsLabelElement) existingScreenshotsLabelElement.style.display = 'none';
    if (deleteScreenshotsControlsElement) deleteScreenshotsControlsElement.style.display = 'none';
    if (deleteSelectedScreenshotsBtnElement) deleteSelectedScreenshotsBtnElement.disabled = true;
    if (hiddenRatingInputElement) hiddenRatingInputElement.value = '0';
    if (formRatingStarsContainerElement && hiddenRatingInputElement) {
        updateFormStarsVisual(hiddenRatingInputElement.value, formRatingStarsContainerElement);
    }
    if (editGameIdInputElement) editGameIdInputElement.value = '';
    if (submitButtonElement) {
        submitButtonElement.disabled = false;
    }
    if (isLoanedSelectElement) isLoanedSelectElement.value = 'false';
    if (loanedToInputElement) {
        loanedToInputElement.value = '';
    }
    if (loanDateInputElement) {
        loanDateInputElement.value = '';
    }
    handleIsLoanedChangeInManager();
    handleFormatChangeInManager();
    handleMultiplayerChangeInManager();
    updateCintaOptionStateInManager();
}

export async function populateFormForEdit(gameId) {
    try {
        const gameData = await gameService.fetchGameById(gameId);
        clearAndResetGameForm();

        // Pequeña función para decodificar entidades HTML a texto plano.
        const decodeHtml = (html) => {
            if (!html) return "";
            const txt = document.createElement("textarea");
            txt.innerHTML = html;
            return txt.value;
        };

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
        
        // --- INICIO DE LA CORRECCIÓN ---
        // Se decodifican los campos de texto libre antes de asignarlos al formulario.
        if (additionalInfoInputElement) additionalInfoInputElement.value = decodeHtml(gameData.additionalInfo || '');
        if (copyProtectionInputElement) copyProtectionInputElement.value = decodeHtml(gameData.copyProtection || '');
        // --- FIN DE LA CORRECCIÓN ---

        if (hiddenRatingInputElement) hiddenRatingInputElement.value = gameData.rating || '0';
        if (formRatingStarsContainerElement && hiddenRatingInputElement) {
            updateFormStarsVisual(hiddenRatingInputElement.value, formRatingStarsContainerElement);
        }
        if (gameData.systemRequirements) {
            // Los campos que usan claves (selects) no se decodifican.
            if (reqCpuInputElement) reqCpuInputElement.value = gameData.systemRequirements.cpu || '';
            if (reqControllerInputElement) reqControllerInputElement.value = gameData.systemRequirements.controller || '';
            if (reqGfxInputElement) reqGfxInputElement.value = gameData.systemRequirements.gfx || '';
            if (reqHddInputElement) reqHddInputElement.value = gameData.systemRequirements.hdd || '';
            
            // --- INICIO DE LA CORRECCIÓN ---
            // Los campos de texto libre se decodifican.
            if (reqSoundInputElement) reqSoundInputElement.value = decodeHtml(gameData.systemRequirements.sound || '');
            if (reqMemoryInputElement) reqMemoryInputElement.value = decodeHtml(gameData.systemRequirements.memory || '');
             // --- FIN DE LA CORRECCIÓN ---
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
