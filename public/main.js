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
    // --- IMPORTACIONES AÑADIDAS ---
    currentUserPlanName, // Importamos el plan actual del usuario
    initiateSubscription // Importamos la función que creamos en el paso anterior
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


// --- INICIO DE CÓDIGO AÑADIDO ---
// Función para configurar la lógica común del footer
function setupFooter() {
    const yearSpan = getElem('currentYear', false);
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}
// --- FIN DE CÓDIGO AÑADIDO ---


// +++ FUNCIONES PARA MANEJAR COOKIES +++
function setCookie(nombre, valor, dias) {
  let expires = "";
  if (dias) {
    const date = new Date();
    date.setTime(date.getTime() + (dias * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = nombre + "=" + (valor || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(nombre) {
  const nombreEQ = nombre + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nombreEQ) === 0) return c.substring(nombreEQ.length, c.length);
  }
  return null;
}
// +++ FIN DE FUNCIONES PARA COOKIES +++


function applyPageTranslations() {
    const elements = document.querySelectorAll('[data-i18n-key]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const targetAttr = element.getAttribute('data-i18n-target-attr');
        const translationMode = element.getAttribute('data-i18n-mode');

        if (key) {
            const translatedText = getText(key);

            if (targetAttr) {
                element.setAttribute(targetAttr, translatedText);
            } else if (translationMode === 'html') {
                element.innerHTML = translatedText;
            } else {
                const isButton = element.tagName === 'BUTTON';
                const hasOnlyImageChild = isButton && element.children.length === 1 && element.children[0].tagName === 'IMG';

                if (isButton && hasOnlyImageChild && !element.hasAttribute('data-translate-force-text')) {
                    // No hacer nada
                } else {
                    element.textContent = translatedText;
                }
            }
        }
    });
}

/**
 * Actualiza la fuente (src) de las imágenes localizadas según el idioma seleccionado.
 * @param {string} lang - El código del idioma actual (ej: 'es', 'en', 'de').
 */
function updateLocalizedImages(lang) {
    const imageMap = {
        'sidebarTitleImage': 'Plataforma',
        'filterSectionTitleImage': 'buscar filtrar y ordena',
        'listSectionTitleImage': 'Coleccion'
    };

    for (const [id, baseName] of Object.entries(imageMap)) {
        const imgElement = getElem(id, false);
        if (imgElement) {
            const newSrc = `imagenes/${baseName}_${lang}.png`;
            imgElement.src = newSrc;
        }
    }
}

let promoAuthModalOverlay = null;
let cachedAllGenres = [];

function initPromoPageAuthModals() {
    promoAuthModalOverlay = getElem('auth-modal-overlay', false);
    if (!promoAuthModalOverlay) {
        return;
    }
    const btnShowLoginNav = getElem('promo-btn-show-login', false);
    const btnShowRegisterNav = getElem('promo-btn-show-register', false);
    const btnShowLoginHero = getElem('promo-link-show-login-hero', false);
    const btnCtaRegister = getElem('promo-btn-cta-register', false);
    const authModalCloseBtn = getElem('auth-modal-close', false);
    const pricingButtons = document.querySelectorAll('.promo-price-plan .promo-cta-button');
    const showRequestResetModalLink = getElem('show-request-reset-form-modal', false);
    const showLoginFromResetModalLink = getElem('show-login-from-reset-modal', false);

    const openAuthModalAndSetView = (viewToShow = 'login') => {
        if (!promoAuthModalOverlay) return;
        promoAuthModalOverlay.style.display = 'flex';
        if (viewToShow === 'login') showLoginFormView();
        else if (viewToShow === 'register') showRegisterFormView();
        else if (viewToShow === 'requestReset') showRequestResetFormView();
        else showLoginFormView();
        const authMessageDivInModal = promoAuthModalOverlay.querySelector('#auth-message');
        if (authMessageDivInModal) authMessageDivInModal.textContent = '';
    };

    const closeAuthModal = () => {
        if (promoAuthModalOverlay) promoAuthModalOverlay.style.display = 'none';
    };

    if (btnShowLoginNav) btnShowLoginNav.addEventListener('click', () => openAuthModalAndSetView('login'));
    if (btnShowRegisterNav) btnShowRegisterNav.addEventListener('click', () => openAuthModalAndSetView('register'));
    if (btnShowLoginHero) btnShowLoginHero.addEventListener('click', (e) => { e.preventDefault(); openAuthModalAndSetView('login'); });
    if (btnCtaRegister) btnCtaRegister.addEventListener('click', () => openAuthModalAndSetView('register'));
    if (authModalCloseBtn) authModalCloseBtn.addEventListener('click', closeAuthModal);
    if (promoAuthModalOverlay) promoAuthModalOverlay.addEventListener('click', (event) => { if (event.target === promoAuthModalOverlay) closeAuthModal(); });
    if (showRequestResetModalLink) showRequestResetModalLink.addEventListener('click', (e) => { e.preventDefault(); showRequestResetFormView(); });
    if (showLoginFromResetModalLink) showLoginFromResetModalLink.addEventListener('click', (e) => { e.preventDefault(); showLoginFormView(); });
    if (pricingButtons.length > 0) {
        pricingButtons.forEach(button => button.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            if (action && action.startsWith('register')) openAuthModalAndSetView('register');
        }));
    }
}

function configureUIAfterAuth() {
    const userRole = getCurrentUserRole();
    const adminPanelButton = getElem('admin-panel-link-button', false);
    if (adminPanelButton) {
        adminPanelButton.style.display = (userRole === 'admin' ? 'inline-block' : 'none');
        if (!adminPanelButton.dataset.listenerAttached) {
            adminPanelButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof openConfigModal === 'function') {
                    openConfigModal(true, false, false);
                }
            });
            adminPanelButton.dataset.listenerAttached = 'true';
        }
    }
}

function getUpdateDeleteButtonStateLogic() {
    const gameListElem = getElem('gameList', false);
    const deleteBtn = getElem('deleteSelectedBtn', false);
    if (gameListElem && deleteBtn) {
        const checkedBoxes = gameListElem.querySelectorAll('.game-delete-checkbox:checked');
        deleteBtn.disabled = checkedBoxes.length === 0;
    } else if (deleteBtn) {
        deleteBtn.disabled = true;
    }
}

async function initializeFilterData() {
    console.log(">>> [main.js] Inicializando datos de filtros (géneros y plataformas)...");
    try {
        const allGenres = await fetchAllUniqueGenres();
        cachedAllGenres = allGenres;
        populateGenreFilterDropdown(cachedAllGenres);

        if (typeof loadAndSetPlatformSummaries === 'function') {
            await loadAndSetPlatformSummaries();
        } else {
            console.error(">>> [main.js] loadAndSetPlatformSummaries no está disponible.");
            notificationService.error("Error interno: No se pudo cargar el resumen de plataformas para filtros.");
        }
    } catch (error) {
        console.error(">>> [main.js] Error inicializando datos de filtros (géneros/plataformas):", error);
        notificationService.error("No se pudieron cargar todas las opciones de filtros correctamente.");
    }
}

// --- INICIO: NUEVA LÓGICA PARA LA PESTAÑA DE SUSCRIPCIÓN ---

/**
 * Prepara la pestaña de suscripción en el modal de configuración.
 * Muestra el plan actual y las opciones correspondientes.
 */
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

/**
 * Maneja la lógica para cancelar una suscripción.
 */
async function handleCancelSubscription() {
    const confirmCancel = confirm(getText('subscription_cancel_confirm'));
    if (!confirmCancel) return;

    notificationService.info('Procesando cancelación...');
    try {
        // Por ahora, mostramos un mensaje temporal:
        notificationService.success('Función de cancelación en desarrollo.');
    } catch (error) {
        console.error("Error al cancelar la suscripción:", error);
        notificationService.error(error.message || 'No se pudo cancelar la suscripción.');
    }
}
// --- FIN: NUEVA LÓGICA ---
















// --- LÓGICA DEL MODAL DE BÚSQUEDA EXTERNA ---
// Todas las funciones relacionadas con el modal se definen aquí, en el ámbito global del módulo.

/**
 * Abre el modal de búsqueda externa y actualiza sus textos al idioma actual.
 */
function openExternalSearchModal() {
    const modal = getElem('externalSearchModal');
    if (!modal) {
        console.error("No se encontró el modal de búsqueda externa (#externalSearchModal).");
        return;
    }

    // --- CORRECCIÓN DEFINITIVA v3: Traducción Manual y Directa ---
    // En lugar de depender de applyPageTranslations(), traducimos cada elemento
    // manualmente para asegurar que se actualicen.

    try {
        // 1. Traducir el Título (h2)
        const titleElem = modal.querySelector('h2[data-i18n-key="externalSearch_title"]');
        if (titleElem) {
            titleElem.textContent = getText('externalSearch_title');
        }

        // 2. Traducir el Placeholder del Input
        const searchInput = getElem('externalSearchInput', true, modal);
        if (searchInput) {
            searchInput.placeholder = getText('externalSearch_placeholder');
        }

        // 3. Traducir el Botón de Búsqueda
        const searchButton = getElem('performExternalSearchBtn', true, modal);
        if (searchButton) {
            searchButton.textContent = getText('externalSearch_button');
        }

        // 4. Traducir el 'title' del botón de cerrar
        const closeBtn = getElem('closeExternalSearchBtn', true, modal);
        if (closeBtn) {
            closeBtn.title = getText('gameForm_closeBtnTitle');
        }

        // 5. Traducir el mensaje inicial (que ya funcionaba)
        const resultsContainer = getElem('externalSearchResultsContainer', true, modal);
        resultsContainer.innerHTML = `<p class="search-placeholder-message" style="text-align: center; color: var(--clr-text-secondary);">${getText('externalSearch_initialPrompt')}</p>`;

    } catch (e) {
        console.error("Error al traducir el modal de búsqueda externa:", e);
        // Si hay un error, se mostrarán los textos por defecto del HTML.
    }
    
    // Limpiamos el input, mostramos el modal y ponemos el foco
    const searchInputElem = getElem('externalSearchInput', true, modal);
    if (searchInputElem) {
        searchInputElem.value = '';
    }
    
    modal.style.display = 'block';
    
    if (searchInputElem) {
        searchInputElem.focus();
    }
}





/**
 * Cierra el modal de búsqueda externa.
 */
function closeExternalSearchModal() {
    const modal = getElem('externalSearchModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Realiza la búsqueda de juegos en la API de RAWG.
 */
const performSearch = async () => {
    const externalSearchModal = getElem('externalSearchModal', false);
    const searchInput = getElem('externalSearchInput', true, externalSearchModal);
    const resultsContainer = getElem('externalSearchResultsContainer', true, externalSearchModal);

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

            return `
                <li class="search-result-item" data-game-id="${game.id}">
                    <img src="${coverUrl}" alt="Portada de ${game.name}">
                    <div class="result-info">
                        <div class="result-title">${game.name}</div>
                        <div class="result-details-simple">
                            <div><strong>${getText('externalSearch_yearLabel')}:</strong> ${year}</div>
                            <div><strong>${getText('externalSearch_platformsLabel')}:</strong> ${platforms}</div>
                            <div><strong>${getText('externalSearch_genresLabel')}:</strong> ${genres}</div>
                        </div>
                    </div>
                </li>`;
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
                    getElem('developer').value = gameDetails.developers && gameDetails.developers.length > 0 ? gameDetails.developers[0].name : '';
                    getElem('publisher').value = gameDetails.publishers && gameDetails.publishers.length > 0 ? gameDetails.publishers[0].name : '';
                    getElem('additionalInfo').value = gameDetails.description_raw || '';
                    
                    const genreSelect = getElem('genre');
                    if (gameDetails.genres && gameDetails.genres.length > 0) {
                        const apiGenreName = gameDetails.genres[0].name.toLowerCase();
                        for (let option of genreSelect.options) {
                            if (option.value.toLowerCase().includes(apiGenreName)) {
                                option.selected = true;
                                break; 
                            }
                        }
                    }

                    const platformSelect = getElem('platform');
                    if (gameDetails.platforms && gameDetails.platforms.length > 0) {
                        let platformFound = false;
                        for (const apiPlatform of gameDetails.platforms) {
                            const apiPlatformName = apiPlatform.platform.name.toLowerCase();
                            for (let option of platformSelect.options) {
                                const optionValue = option.value.toLowerCase();
                                const apiWords = apiPlatformName.split(' ');
                                const allWordsMatch = apiWords.every(word => optionValue.includes(word));
                                
                                if (allWordsMatch) {
                                    option.selected = true;
                                    platformFound = true;
                                    break;
                                }
                            }
                            if (platformFound) break;
                        }
                    }

                    const pcPlatform = gameDetails.platforms.find(p => p.platform.id === 4);
                    if (pcPlatform && pcPlatform.requirements && pcPlatform.requirements.minimum) {
                        const requirementsText = pcPlatform.requirements.minimum;
                        
                        const cpuMatch = requirementsText.match(/<strong>Processor:<\/strong>\s*(.*)/);
                        const memoryMatch = requirementsText.match(/<strong>Memory:<\/strong>\s*(.*)/);
                        const graphicsMatch = requirementsText.match(/<strong>Graphics:<\/strong>\s*(.*)/);
                        const soundMatch = requirementsText.match(/<strong>Sound Card:<\/strong>\s*(.*)/);
                        const storageMatch = requirementsText.match(/<strong>Storage:<\/strong>\s*(.*)/);

                        if (cpuMatch && cpuMatch[1]) {
                             const additionalInfoElem = getElem('additionalInfo');
                             additionalInfoElem.value += `\n\n--- REQUISITOS ---\nCPU: ${cpuMatch[1]}`;
                        }
                        if (memoryMatch && memoryMatch[1]) {
                            getElem('reqMemory').value = memoryMatch[1].replace(/<br>/g, '');
                        }
                        if (graphicsMatch && graphicsMatch[1]) {
                             const additionalInfoElem = getElem('additionalInfo');
                             if (!additionalInfoElem.value.includes('--- REQUISITOS ---')) {
                                additionalInfoElem.value += '\n\n--- REQUISITOS ---';
                             }
                             additionalInfoElem.value += `\nGráfica: ${graphicsMatch[1]}`;
                        }
                        if (soundMatch && soundMatch[1]) {
                            getElem('reqSound').value = soundMatch[1].replace(/<br>/g, '');
                        }
                        if (storageMatch && storageMatch[1]) {
                            const hddSelect = getElem('reqHdd');
                            if (hddSelect) hddSelect.value = 'gameForm_hdd_required';
                        }
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


// --- FUNCIONES GENERALES Y DE INICIALIZACIÓN ---

function setupFooter() {
    const yearSpan = getElem('currentYear', false);
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

function setCookie(nombre, valor, dias) {
  let expires = "";
  if (dias) {
    const date = new Date();
    date.setTime(date.getTime() + (dias * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = nombre + "=" + (valor || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(nombre) {
  const nombreEQ = nombre + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nombreEQ) === 0) return c.substring(nombreEQ.length, c.length);
  }
  return null;
}

function applyPageTranslations() {
    const elements = document.querySelectorAll('[data-i18n-key]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const targetAttr = element.getAttribute('data-i18n-target-attr');
        const translationMode = element.getAttribute('data-i18n-mode');

        if (key) {
            const translatedText = getText(key);

            if (targetAttr) {
                element.setAttribute(targetAttr, translatedText);
            } else if (translationMode === 'html') {
                element.innerHTML = translatedText;
            } else {
                const isButton = element.tagName === 'BUTTON';
                const hasOnlyImageChild = isButton && element.children.length === 1 && element.children[0].tagName === 'IMG';

                if (isButton && hasOnlyImageChild && !element.hasAttribute('data-translate-force-text')) {
                    // No hacer nada
                } else {
                    element.textContent = translatedText;
                }
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
        if (imgElement) {
            const newSrc = `imagenes/${baseName}_${lang}.png`;
            imgElement.src = newSrc;
        }
    }
}

let promoAuthModalOverlay = null;
let cachedAllGenres = [];

function initPromoPageAuthModals() {
    promoAuthModalOverlay = getElem('auth-modal-overlay', false);
    if (!promoAuthModalOverlay) {
        return;
    }
    const btnShowLoginNav = getElem('promo-btn-show-login', false);
    const btnShowRegisterNav = getElem('promo-btn-show-register', false);
    const btnShowLoginHero = getElem('promo-link-show-login-hero', false);
    const btnCtaRegister = getElem('promo-btn-cta-register', false);
    const authModalCloseBtn = getElem('auth-modal-close', false);
    const pricingButtons = document.querySelectorAll('.promo-price-plan .promo-cta-button');
    const showRequestResetModalLink = getElem('show-request-reset-form-modal', false);
    const showLoginFromResetModalLink = getElem('show-login-from-reset-modal', false);

    const openAuthModalAndSetView = (viewToShow = 'login') => {
        if (!promoAuthModalOverlay) return;
        promoAuthModalOverlay.style.display = 'flex';
        if (viewToShow === 'login') showLoginFormView();
        else if (viewToShow === 'register') showRegisterFormView();
        else if (viewToShow === 'requestReset') showRequestResetFormView();
        else showLoginFormView();
        const authMessageDivInModal = promoAuthModalOverlay.querySelector('#auth-message');
        if (authMessageDivInModal) authMessageDivInModal.textContent = '';
    };

    const closeAuthModal = () => {
        if (promoAuthModalOverlay) promoAuthModalOverlay.style.display = 'none';
    };

    if (btnShowLoginNav) btnShowLoginNav.addEventListener('click', () => openAuthModalAndSetView('login'));
    if (btnShowRegisterNav) btnShowRegisterNav.addEventListener('click', () => openAuthModalAndSetView('register'));
    if (btnShowLoginHero) btnShowLoginHero.addEventListener('click', (e) => { e.preventDefault(); openAuthModalAndSetView('login'); });
    if (btnCtaRegister) btnCtaRegister.addEventListener('click', () => openAuthModalAndSetView('register'));
    if (authModalCloseBtn) authModalCloseBtn.addEventListener('click', closeAuthModal);
    if (promoAuthModalOverlay) promoAuthModalOverlay.addEventListener('click', (event) => { if (event.target === promoAuthModalOverlay) closeAuthModal(); });
    if (showRequestResetModalLink) showRequestResetModalLink.addEventListener('click', (e) => { e.preventDefault(); showRequestResetFormView(); });
    if (showLoginFromResetModalLink) showLoginFromResetModalLink.addEventListener('click', (e) => { e.preventDefault(); showLoginFormView(); });
    if (pricingButtons.length > 0) {
        pricingButtons.forEach(button => button.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            if (action && action.startsWith('register')) openAuthModalAndSetView('register');
        }));
    }
}

function configureUIAfterAuth() {
    const userRole = getCurrentUserRole();
    const adminPanelButton = getElem('admin-panel-link-button', false);
    if (adminPanelButton) {
        adminPanelButton.style.display = (userRole === 'admin' ? 'inline-block' : 'none');
        if (!adminPanelButton.dataset.listenerAttached) {
            adminPanelButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof openConfigModal === 'function') {
                    openConfigModal(true, false, false);
                }
            });
            adminPanelButton.dataset.listenerAttached = 'true';
        }
    }
}

function getUpdateDeleteButtonStateLogic() {
    const gameListElem = getElem('gameList', false);
    const deleteBtn = getElem('deleteSelectedBtn', false);
    if (gameListElem && deleteBtn) {
        const checkedBoxes = gameListElem.querySelectorAll('.game-delete-checkbox:checked');
        deleteBtn.disabled = checkedBoxes.length === 0;
    } else if (deleteBtn) {
        deleteBtn.disabled = true;
    }
}

async function initializeFilterData() {
    console.log(">>> [main.js] Inicializando datos de filtros (géneros y plataformas)...");
    try {
        const allGenres = await fetchAllUniqueGenres();
        cachedAllGenres = allGenres;
        populateGenreFilterDropdown(cachedAllGenres);

        if (typeof loadAndSetPlatformSummaries === 'function') {
            await loadAndSetPlatformSummaries();
        } else {
            console.error(">>> [main.js] loadAndSetPlatformSummaries no está disponible.");
            notificationService.error("Error interno: No se pudo cargar el resumen de plataformas para filtros.");
        }
    } catch (error) {
        console.error(">>> [main.js] Error inicializando datos de filtros (géneros/plataformas):", error);
        notificationService.error("No se pudieron cargar todas las opciones de filtros correctamente.");
    }
}

// --- EVENTO PRINCIPAL DE CARGA DEL DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    if (domInitError) {
        notificationService.error("Error crítico al cargar la aplicación. Algunas funciones pueden no estar disponibles.", { name: "DOMInitError", message: "Elementos HTML REQUERIDOS no encontrados (ver consola)." });
        return;
    }

    setupFooter();
    
    const promoPageContent = document.getElementById('promo-page-content');
    const gameAreaElement = document.getElementById('game-area');
    const isPromoPage = !!promoPageContent;
    const isIndexPage = !!gameAreaElement;

    if (isIndexPage && !gameAreaElement) {
        notificationService.error("Error crítico: No se encontró el contenedor principal 'game-area'. La aplicación no puede continuar.", {name: "MissingCoreElement"});
        return;
    }

    originalInitAuthUI();

    if (isIndexPage) {
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
                if (typeof clearAndResetGameForm === 'function') {
                     clearAndResetGameForm();
                }
                openGameFormModal(false);
            });
        }

        // Asignación de eventos para el modal de búsqueda externa
        const externalLoadBtn = getElem('externalLoadBtn', false);
        const externalSearchModal = getElem('externalSearchModal', false);
        if (externalLoadBtn && externalSearchModal) {
            const closeBtn = getElem('closeExternalSearchBtn', true, externalSearchModal);
            const searchBtn = getElem('performExternalSearchBtn', true, externalSearchModal);
            const searchInput = getElem('externalSearchInput', true, externalSearchModal);
            externalLoadBtn.addEventListener('click', openExternalSearchModal);
            closeBtn.addEventListener('click', closeExternalSearchModal);
            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') performSearch();
            });
        }

        const configBtnElement = getElem('configBtn', false);
        if (configBtnElement) {
            configBtnElement.addEventListener('click', () => {
                openConfigModal(false, false, true);
            });
        }
        

// --- NUEVO: Listeners para los botones de la pestaña de suscripción ---
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
            if (cancelBtn) {
                cancelBtn.addEventListener('click', handleCancelSubscription);
            }
        }
        // --- FIN: NUEVOS LISTENERS ---










        const resetFiltersBtnElement = getElem('resetFiltersBtn', false);
        if (!resetFiltersBtnElement) {
            console.warn("ADVERTENCIA en index.html: #resetFiltersBtn no encontrado.");
        }

        const formRatingStarsContainer = getElem('formRatingStars', false);
        const hiddenRatingInput = getElem('rating', false);
        if (formRatingStarsContainer && hiddenRatingInput) {
            if (!formRatingStarsContainer.dataset.listenerAttached) {
                formRatingStarsContainer.addEventListener('click', (e) => handleFormStarClick(e, hiddenRatingInput, formRatingStarsContainer));
                formRatingStarsContainer.addEventListener('mouseover', (e) => handleFormStarHover(e, formRatingStarsContainer));
                formRatingStarsContainer.addEventListener('mouseout', () => handleFormStarMouseOut(hiddenRatingInput, formRatingStarsContainer));
                formRatingStarsContainer.dataset.listenerAttached = 'true';
            }
        }

        const requestResetFormIndex = getElem('request-reset-form', false);
        if (requestResetFormIndex) {
            requestResetFormIndex.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = getElem('reset-email', false);
                const email = emailInput ? emailInput.value.trim() : '';
                const submitButton = e.target.querySelector('button[type="submit"]');

                if (!email) {
                    displayAuthMessage('Por favor, ingresa un correo electrónico.', true);
                    return;
                }

                if (submitButton) submitButton.disabled = true;
                const result = await requestPasswordReset(email);
                displayAuthMessage(result.message, false, false); 
                if (submitButton) submitButton.disabled = false;
            });
        }

        const showRegisterBtnIndex = getElem('show-register-from-login', false);
        if (showRegisterBtnIndex) showRegisterBtnIndex.addEventListener('click', (e) => { e.preventDefault(); showRegisterFormView(); });
        
        const showLoginFromRegisterBtnIndex = getElem('show-login-from-register', false);
        if (showLoginFromRegisterBtnIndex) showLoginFromRegisterBtnIndex.addEventListener('click', (e) => { e.preventDefault(); showLoginFormView(); });

        const showRequestResetBtnIndex = getElem('show-request-reset-form', false);
        if (showRequestResetBtnIndex) showRequestResetBtnIndex.addEventListener('click', (e) => { e.preventDefault(); showRequestResetFormView(); });

        const showLoginFromResetBtnIndex = getElem('show-login-from-reset', false);
        if (showLoginFromResetBtnIndex) showLoginFromResetBtnIndex.addEventListener('click', (e) => { e.preventDefault(); showLoginFormView(); });

        const languageSwitcherElement = getElem('languageSwitcher', false);
        if (languageSwitcherElement) {
            if (!languageSwitcherElement.dataset.listenerAttached) {
                languageSwitcherElement.addEventListener('change', async (event) => {
                    const selectedLang = event.target.value;
                    const supportedLanguages = ['es', 'en', 'it', 'pt', 'ja', 'ru', 'fr', 'hi', 'cn', 'de'];
                    if (!supportedLanguages.includes(selectedLang)){
                        languageSwitcherElement.value = getCookie('preferredLanguage') || 'es';
                        return;
                    }
                    try {
                        await loadTranslations(selectedLang);
                        applyPageTranslations();
                        updatePlanCounterUI();
                        updateLocalizedImages(selectedLang);
                        
                        setCookie('preferredLanguage', selectedLang, 30);
                        
                        if (isAuthenticated()) {
                           await saveLanguagePreference(selectedLang);
                        }

                        if (typeof populateGenreFilterDropdown === 'function' && cachedAllGenres) {
                            populateGenreFilterDropdown(cachedAllGenres);
                        }
                        
                        if (typeof populatePlatformFilterList === 'function') {
                            populatePlatformFilterList();
                        }
                        
                        if (typeof loadInitialGames === 'function') {
                           await loadInitialGames();
                        }
                    
                    } catch (error) {
                        notificationService.error(`Error al cambiar a ${selectedLang}`, error);
                    }
                });
                languageSwitcherElement.dataset.listenerAttached = 'true';
            }
        }

        const importFileInput = getElem('importFile', false);
        const customImportFileButton = getElem('customImportFileButton', false);
        const importFileStatus = getElem('importFileStatus', false);

        if (importFileInput && customImportFileButton && importFileStatus) {
            customImportFileButton.addEventListener('click', () => importFileInput.click());
            importFileInput.addEventListener('change', (event) => {
                if (event.target.files && event.target.files.length > 0) {
                    importFileStatus.textContent = event.target.files[0].name;
                    importFileStatus.removeAttribute('data-i18n-key');
                } else {
                    importFileStatus.setAttribute('data-i18n-key', 'configCollections_statusNoFileChosen');
                    try {
                        importFileStatus.textContent = getText('configCollections_statusNoFileChosen');
                    } catch(e) {
                        importFileStatus.textContent = "Ningún archivo seleccionado";
                    }
                }
            });
            if (importFileStatus.hasAttribute('data-i18n-key')) {
                 try {
                    importFileStatus.textContent = getText(importFileStatus.getAttribute('data-i18n-key'));
                } catch(e) {
                    console.warn("No se pudo traducir #importFileStatus");
                }
            }
        }
        
        const formatSelect = getElem('format', false);
        const capacityContainer = getElem('capacityContainer', false);
        const quantityContainer = getElem('quantityContainer', false);
        const gameFormModal = getElem('gameFormModal', false);
        if (formatSelect && capacityContainer && quantityContainer && gameFormModal) {
            const updateFormatFields = () => {
                const selectedFormat = formatSelect.value;
    
                const showQuantityFor = ['gameForm_format_diskette', 'gameForm_format_cd', 'gameForm_format_dvd'];
                const showCapacityFor = ['gameForm_format_diskette'];
    
                quantityContainer.style.display = showQuantityFor.includes(selectedFormat) ? 'block' : 'none';
                capacityContainer.style.display = showCapacityFor.includes(selectedFormat) ? 'block' : 'none';
            };
    
            formatSelect.addEventListener('change', updateFormatFields);
            
            gameFormModal.updateFormatFields = updateFormatFields;
        }

    } else if (isPromoPage) {
        initPromoPageAuthModals();
        const mobileMenuToggle = getElem('promo-mobile-menu-toggle', false);
        const promoMenu = document.querySelector('.promo-header .promo-menu');
        if (mobileMenuToggle && promoMenu) {
            if (!mobileMenuToggle.dataset.listenerAttached) {
                mobileMenuToggle.addEventListener('click', () => {
                    promoMenu.classList.toggle('active');
                });
                mobileMenuToggle.dataset.listenerAttached = 'true';
            }
        }
    } else {
        notificationService.error("Error crítico al inicializar la página.", {name: "PageDetectionError"});
    }

    // --- NUEVO FLUJO DE INICIO CENTRALIZADO ---
    try {
        const authStatus = await checkAuthStatus(); 

        const supportedLanguages = ['es', 'en', 'it', 'pt', 'ja', 'ru', 'fr', 'hi', 'cn', 'de'];
        let idiomaAUsar = 'es';

        if (authStatus.isAuthenticated && currentUserLanguage) {
            idiomaAUsar = currentUserLanguage;
        } else {
            const cookieLang = getCookie('preferredLanguage');
            if (cookieLang && supportedLanguages.includes(cookieLang)) {
                idiomaAUsar = cookieLang;
            } else {
                const browserLang = (navigator.language || navigator.userLanguage).split(/[-_]/)[0];
                idiomaAUsar = supportedLanguages.includes(browserLang) ? browserLang : 'es';
            }
        }
        
        await loadTranslations(idiomaAUsar);
        applyPageTranslations();
        updatePlanCounterUI();
        updateLocalizedImages(idiomaAUsar);
        const languageSwitcherElement = getElem('languageSwitcher', false);
        if (languageSwitcherElement) languageSwitcherElement.value = idiomaAUsar;


        if (authStatus.isAuthenticated) {
            await showGameUI(authStatus.user.username);
            const configFormEl = getElem('configForm', false);
            await loadThemeSettings(configFormEl);
            await initializeFilterData();
            await loadInitialGames();
            configureUIAfterAuth();
        } else {
            showAuthUI();
            if(authStatus.error) {
                 notificationService.error(getText('auth_error_checkAuthStatusNotify'), authStatus.error);
            }
        }
    } catch (error) {
        console.error("Error fatal durante la inicialización de la aplicación:", error);
        notificationService.error("No se pudo iniciar la aplicación. Por favor, recarga la página.");
    }
    // --- FIN DEL NUEVO FLUJO ---


    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const activeModal = document.querySelector('.modal[style*="display: flex"], .modal[style*="display: block"]');
            if (isPromoPage) {
                if (promoAuthModalOverlay && (promoAuthModalOverlay.style.display === 'flex' || promoAuthModalOverlay.style.display === 'block')) {
                    const closeBtn = promoAuthModalOverlay.querySelector('#auth-modal-close');
                    if (closeBtn) closeBtn.click();
                    else promoAuthModalOverlay.style.display = 'none';
                }
            } else if (isIndexPage && activeModal) {
                if (activeModal.id === 'gameFormModal') closeGameFormModal();
                else if (activeModal.id === 'gameDetailModal') closeGameDetailModal();
                else if (activeModal.id === 'imageModal') closeImageModal();
                else if (activeModal.id === 'configModal') closeConfigModal();
                else if (activeModal.id === 'externalSearchModal') closeExternalSearchModal(); 
            }
        }
    });
});
