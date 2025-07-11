// main.js (COMPLETO Y CORREGIDO)
import { initError as domInitError, getElem, handleFormStarClick, handleFormStarHover, handleFormStarMouseOut } from './domUtils.js';
import { loadThemeSettings, saveThemeSettings, resetThemeSettings, applyThemeProperty } from './config.js';
import {
    initAuthUI as originalInitAuthUI,
    checkAuthStatus,
    getCurrentUserRole,
    showLoginFormView,
    showRegisterFormView,
    showRequestResetFormView,
    showAuthUI, 
    showGameUI, 
    updatePlanCounterUI,
    isAuthenticated,
    saveLanguagePreference,
    currentUserLanguage,
    currentUserPlanName,
    initiateSubscription // Asegúrate de que esta función esté exportada en authClient.js
} from './authClient.js';
import {
    initGameManager,
    loadInitialGames,
    reloadGamesWithCriteria,
    clearAndResetGameForm,
    setRenderGameListCallback as setGameManagerRenderCb,
    setUpdatePlatformFilterListCallback as setGameManagerPlatformListCb,
    setUpdateDeleteButtonStateCallback as setGameManagerDeleteBtnCb,
    setShowGameDetailsModalCallback as setGameManagerShowDetailsCb,
    setOpenGameFormModalCallback,
    setCloseGameFormModalCallback,
    loadAndSetPlatformSummaries
} from './gameManager.js';
import {
    initFilterSort,
    populateGenreFilterDropdown,
    populatePlatformFilterList,
    setReloadGamesCallback
} from './filterSort.js';
import { initRender, renderGameList, setUpdateDeleteButtonStateCallback as setRenderDeleteBtnCb } from './render.js';
import { initGameDetailModal, showGameDetailsModal, closeGameDetailModal } from './modals/gameDetailModal.js';
import { initImageGalleryModal, closeImageModal } from './modals/imageGalleryModal.js';
import { initGameFormModalController, openGameFormModal, closeGameFormModal } from './modals/gameFormModalController.js';
import { initConfigModalController, openConfigModal, closeConfigModal } from './modals/configModalController.js';
import { fetchGameById, fetchAllUniqueGenres } from './gameService.js';
import { notificationService } from './notificationService.js';
import { loadTranslations, getText } from './i18n.js';

// --- LÓGICA DEL MODAL DE BÚSQUEDA EXTERNA ---
function openExternalSearchModal() {
    const modal = getElem('externalSearchModal');
    if (!modal) {
        console.error("No se encontró el modal de búsqueda externa (#externalSearchModal).");
        return;
    }
    try {
        const titleElem = modal.querySelector('#externalSearchTitle');
        if (titleElem) titleElem.textContent = getText('externalSearch_title');
        
        const searchInput = getElem('externalSearchInput', true, modal);
        if (searchInput) searchInput.placeholder = getText('externalSearch_placeholder');
        
        const searchButton = getElem('performExternalSearchBtn', true, modal);
        if (searchButton) searchButton.textContent = getText('externalSearch_button');
        
        const closeBtn = getElem('closeExternalSearchBtn', true, modal);
        if (closeBtn) closeBtn.title = getText('gameForm_closeBtnTitle');

        const resultsContainer = getElem('externalSearchResultsContainer', true, modal);
        resultsContainer.innerHTML = `<p class="search-placeholder-message" style="text-align: center; color: var(--clr-text-secondary);">${getText('externalSearch_initialPrompt')}</p>`;
    } catch (e) {
        console.error("Error al traducir el modal de búsqueda externa:", e);
    }
    const searchInputElem = getElem('externalSearchInput', true, modal);
    if (searchInputElem) searchInputElem.value = '';
    modal.style.display = 'block';
    if (searchInputElem) searchInputElem.focus();
}

function closeExternalSearchModal() {
    const modal = getElem('externalSearchModal');
    if (modal) modal.style.display = 'none';
}

const performSearch = async () => {
    const searchInput = getElem('externalSearchInput', true, getElem('externalSearchModal'));
    const resultsContainer = getElem('externalSearchResultsContainer', true, getElem('externalSearchModal'));
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--clr-btn-d-bg);">Por favor, escribe algo para buscar.</p>`;
        return;
    }
    resultsContainer.innerHTML = `<p style="text-align: center;">${getText('externalSearch_searchingFor').replace('{term}', `<strong>${searchTerm}</strong>`)}</p>`;
    const apiKey = 'f83533cf576947e6af8c959d9c6dd2ed';
    const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(searchTerm)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            resultsContainer.innerHTML = `<p style="text-align: center;">${getText('externalSearch_noResultsFor').replace('{term}', `<strong>${searchTerm}</strong>`)}</p>`;
            return;
        }
        const resultsHTML = `<ul class="search-result-list">${data.results.map(game => {
            const year = game.released ? new Date(game.released).getFullYear() : 'N/A';
            const coverUrl = game.background_image || 'imagenes/placeholder.png';
            const platforms = game.platforms ? game.platforms.map(p => p.platform.name).join(', ') : '';
            const genres = game.genres ? game.genres.map(g => g.name).join(', ') : '';
            return `<li class="search-result-item" data-game-id="${game.id}"><img src="${coverUrl}" alt="Portada de ${game.name}"><div class="result-info"><div class="result-title">${game.name}</div><div class="result-details-simple"><div><strong>${getText('externalSearch_yearLabel')}:</strong> ${year}</div><div><strong>${getText('externalSearch_platformsLabel')}:</strong> ${platforms}</div><div><strong>${getText('externalSearch_genresLabel')}:</strong> ${genres}</div></div></div></li>`;
        }).join('')}</ul>`;
        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', async (event) => {
                const gameId = event.currentTarget.dataset.gameId;
                notificationService.info(`Obteniendo detalles para el juego ID: ${gameId}...`);
                closeExternalSearchModal();
                try {
                    const detailsUrl = `https://api.rawg.io/api/games/${gameId}?key=${apiKey}`;
                    const detailsResponse = await fetch(detailsUrl);
                    if (!detailsResponse.ok) throw new Error('No se pudieron obtener los detalles del juego.');
                    const gameDetails = await detailsResponse.json();
                    clearAndResetGameForm();
                    getElem('title').value = gameDetails.name || '';
                    getElem('year').value = gameDetails.released ? new Date(gameDetails.released).getFullYear() : '';
                    getElem('developer').value = gameDetails.developers?.[0]?.name || '';
                    getElem('publisher').value = gameDetails.publishers?.[0]?.name || '';
                    getElem('additionalInfo').value = gameDetails.description_raw || '';
                    const genreSelect = getElem('genre');
                    if (gameDetails.genres?.[0]) {
                        const apiGenreName = gameDetails.genres[0].name.toLowerCase();
                        for (let option of genreSelect.options) {
                            if (option.value.toLowerCase().includes(apiGenreName)) {
                                option.selected = true;
                                break;
                            }
                        }
                    }
                    const platformSelect = getElem('platform');
                    if (gameDetails.platforms?.length > 0) {
                        let platformFound = false;
                        for (const apiPlatform of gameDetails.platforms) {
                            const apiPlatformName = apiPlatform.platform.name.toLowerCase();
                            for (let option of platformSelect.options) {
                                if (option.text.toLowerCase().includes(apiPlatformName)) {
                                    option.selected = true;
                                    platformFound = true;
                                    break;
                                }
                            }
                            if (platformFound) break;
                        }
                    }
                    const pcPlatform = gameDetails.platforms.find(p => p.platform.id === 4);
                    if (pcPlatform?.requirements?.minimum) {
                        const reqs = pcPlatform.requirements.minimum;
                        const cpuMatch = reqs.match(/Processor:<\/strong>\s*(.*)/);
                        if (cpuMatch?.[1]) getElem('additionalInfo').value += `\n\n--- REQUISITOS ---\nCPU: ${cpuMatch[1]}`;
                        const memMatch = reqs.match(/Memory:<\/strong>\s*(.*)/);
                        if (memMatch?.[1]) getElem('reqMemory').value = memMatch[1].replace(/<br>/g, '');
                        const gfxMatch = reqs.match(/Graphics:<\/strong>\s*(.*)/);
                        if (gfxMatch?.[1]) getElem('additionalInfo').value += `\nGráfica: ${gfxMatch[1]}`;
                        const soundMatch = reqs.match(/Sound Card:<\/strong>\s*(.*)/);
                        if (soundMatch?.[1]) getElem('reqSound').value = soundMatch[1].replace(/<br>/g, '');
                        const storageMatch = reqs.match(/Storage:<\/strong>\s*(.*)/);
                        if (storageMatch?.[1]) getElem('reqHdd').value = 'gameForm_hdd_required';
                    }
                    openGameFormModal(false);
                } catch (error) {
                    console.error('Error al obtener y rellenar detalles:', error);
                    notificationService.error('No se pudo cargar la información detallada del juego.');
                }
            });
        });
    } catch (error) {
        console.error('Error al buscar juegos en RAWG:', error);
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--clr-btn-d-bg);">${getText('externalSearch_error')}</p>`;
    }
};

// --- LÓGICA PARA LA PESTAÑA DE SUSCRIPCIÓN ---
function prepareSubscriptionTab() {
    const plan = currentUserPlanName || 'free';
    const planTextElem = getElem('current-user-plan');
    const manageSection = getElem('manage-subscription-section');
    const upgradeSection = getElem('upgrade-subscription-section');
    if (planTextElem) {
        planTextElem.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    }
    if (plan === 'medium' || plan === 'premium') {
        if (manageSection) manageSection.style.display = 'block';
        if (upgradeSection) upgradeSection.style.display = 'none';
    } else {
        if (manageSection) manageSection.style.display = 'none';
        if (upgradeSection) upgradeSection.style.display = 'block';
    }
}

async function handleCancelSubscription() {
    if (!confirm(getText('subscription_cancel_confirm'))) return;
    notificationService.info('Procesando cancelación...');
    try {
        notificationService.success('Función de cancelación en desarrollo.');
    } catch (error) {
        console.error("Error al cancelar la suscripción:", error);
        notificationService.error(error.message || 'No se pudo cancelar la suscripción.');
    }
}

// --- FUNCIONES GENERALES Y DE INICIALIZACIÓN ---
function setupFooter() {
    const yearSpan = getElem('currentYear', false);
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

function setCookie(nombre, valor, dias) {
  let expires = "";
  if (dias) {
    const date = new Date();
    date.setTime(date.getTime() + (dias * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = `${nombre}=${valor || ""}${expires}; path=/; SameSite=Lax`;
}

function getCookie(nombre) {
  const nombreEQ = `${nombre}=`;
  const ca = document.cookie.split(';');
  for (let c of ca) {
    c = c.trim();
    if (c.startsWith(nombreEQ)) return c.substring(nombreEQ.length, c.length);
  }
  return null;
}

function applyPageTranslations() {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const targetAttr = element.getAttribute('data-i18n-target-attr');
        if (key) {
            try {
                const translatedText = getText(key);
                if (targetAttr) {
                    element.setAttribute(targetAttr, translatedText);
                } else {
                    element.textContent = translatedText;
                }
            } catch (e) {
                // Silenciamos el error si una clave no se encuentra
            }
        }
    });
}

function updateLocalizedImages(lang) {
    const imageMap = {
        'sidebarTitleImage': 'Plataforma',
        'filterSectionTitleImage': 'buscar filtrar y ordena',
        'listSectionTitleImage': 'Coleccion'
    };
    for (const [id, baseName] of Object.entries(imageMap)) {
        const imgElement = getElem(id, false);
        if (imgElement) imgElement.src = `imagenes/${baseName}_${lang}.png`;
    }
}

let cachedAllGenres = [];

async function initializeFilterData() {
    try {
        cachedAllGenres = await fetchAllUniqueGenres();
        populateGenreFilterDropdown(cachedAllGenres);
        await loadAndSetPlatformSummaries();
    } catch (error) {
        console.error("Error inicializando datos de filtros:", error);
        notificationService.error("No se pudieron cargar las opciones de filtros.");
    }
}

// --- EVENTO PRINCIPAL DE CARGA DEL DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    if (domInitError) {
        notificationService.error("Error crítico al cargar la aplicación.", { name: "DOMInitError" });
        return;
    }

    setupFooter();
    
    originalInitAuthUI();
    initGameManager();
    initFilterSort();
    initRender();
    initGameDetailModal(fetchGameById);
    initImageGalleryModal();
    initGameFormModalController(clearAndResetGameForm);
    initConfigModalController({
        theme: { save: saveThemeSettings, reset: resetThemeSettings, load: loadThemeSettings, apply: applyThemeProperty },
        loadInitialGames: loadInitialGames
    });

    setGameManagerShowDetailsCb(showGameDetailsModal);
    setOpenGameFormModalCallback(openGameFormModal);
    setCloseGameFormModalCallback(closeGameFormModal);
    setGameManagerRenderCb(renderGameList);
    setGameManagerPlatformListCb(populatePlatformFilterList);
    setGameManagerDeleteBtnCb(getUpdateDeleteButtonStateLogic);
    setRenderDeleteBtnCb(getUpdateDeleteButtonStateLogic);
    setReloadGamesCallback(reloadGamesWithCriteria);
    
    const addGameBtnElement = getElem('addGameBtn', false);
    if (addGameBtnElement) {
        addGameBtnElement.addEventListener('click', () => {
            clearAndResetGameForm();
            openGameFormModal(false);
        });
    }

    const externalLoadBtn = getElem('externalLoadBtn', false);
    if (externalLoadBtn) {
        externalLoadBtn.addEventListener('click', openExternalSearchModal);
        getElem('closeExternalSearchBtn', true, getElem('externalSearchModal')).addEventListener('click', closeExternalSearchModal);
        getElem('performExternalSearchBtn', true, getElem('externalSearchModal')).addEventListener('click', performSearch);
        getElem('externalSearchInput', true, getElem('externalSearchModal')).addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });
    }

    const configBtnElement = getElem('configBtn', false);
    if (configBtnElement) {
        configBtnElement.addEventListener('click', () => {
            prepareSubscriptionTab();
            openConfigModal(false, false, true);
        });
    }

    const configModal = getElem('configModal', false);
    if (configModal) {
        configModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-subscribe-app')) {
                const planId = e.target.dataset.planId;
                if (planId && typeof initiateSubscription === 'function') {
                    closeConfigModal();
                    initiateSubscription(planId);
                }
            }
        });
        const cancelBtn = getElem('cancel-subscription-btn', true, configModal);
        if (cancelBtn) cancelBtn.addEventListener('click', handleCancelSubscription);
    }

    const languageSwitcherElement = getElem('languageSwitcher', false);
    if (languageSwitcherElement) {
        languageSwitcherElement.addEventListener('change', async (event) => {
            const selectedLang = event.target.value;
            try {
                await loadTranslations(selectedLang);
                applyPageTranslations();
                updatePlanCounterUI();
                updateLocalizedImages(selectedLang);
                setCookie('preferredLanguage', selectedLang, 30);
                if (isAuthenticated()) await saveLanguagePreference(selectedLang);
                populateGenreFilterDropdown(cachedAllGenres);
                populatePlatformFilterList();
                await loadInitialGames();
            } catch (error) {
                notificationService.error(`Error al cambiar a ${selectedLang}`, error);
            }
        });
    }

    try {
        const authStatus = await checkAuthStatus();
        const supportedLanguages = ['es', 'en', 'it', 'pt', 'ja', 'ru', 'fr', 'hi', 'cn', 'de'];
        let langToUse = 'es';
        if (authStatus.isAuthenticated && currentUserLanguage) {
            langToUse = currentUserLanguage;
        } else {
            const cookieLang = getCookie('preferredLanguage');
            if (cookieLang && supportedLanguages.includes(cookieLang)) {
                langToUse = cookieLang;
            } else {
                const browserLang = (navigator.language || navigator.userLanguage).split(/[-_]/)[0];
                langToUse = supportedLanguages.includes(browserLang) ? browserLang : 'es';
            }
        }
        await loadTranslations(langToUse);
        applyPageTranslations();
        if (languageSwitcherElement) languageSwitcherElement.value = langToUse;

        if (authStatus.isAuthenticated) {
            await showGameUI(authStatus.user.username);
            await loadThemeSettings(getElem('configForm', false));
            await initializeFilterData();
            await loadInitialGames();
            configureUIAfterAuth();
        } else {
            showAuthUI();
            if (authStatus.error) {
                notificationService.error(getText('auth_error_checkAuthStatusNotify'), authStatus.error);
            }
        }
    } catch (error) {
        console.error("Error fatal durante la inicialización:", error);
        notificationService.error("No se pudo iniciar la aplicación.");
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const activeModal = document.querySelector('.modal[style*="display: block"]');
            if (activeModal) {
                switch (activeModal.id) {
                    case 'gameFormModal': closeGameFormModal(); break;
                    case 'gameDetailModal': closeGameDetailModal(); break;
                    case 'imageModal': closeImageModal(); break;
                    case 'configModal': closeConfigModal(); break;
                    case 'externalSearchModal': closeExternalSearchModal(); break;
                }
            }
        }
    });
});