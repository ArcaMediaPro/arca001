// public/filterSort.js (ACTUALIZADO)
import { getElem, escapeHtml, debounce } from './domUtils.js';
import { getText } from './i18n.js'; 

// --- Estado del Módulo de Filtros ---
let activePlatformFilter = null;
let allPlatformSummaries = [];

// --- Referencias a Elementos del DOM ---
let platformListFilterElement;
let showAllPlatformsBtnElement;
let searchInputElement;
let genreFilterElement; 
let yearFilterInputElement;
let sortOrderSelectElement;
let resetFiltersBtnElement;

// --- Callbacks ---
let reloadGamesCallback = (filters, sortOrder) => console.warn(getText('filterSort_warn_reloadGamesCallbackNotSet'));

export function setReloadGamesCallback(callback) {
    reloadGamesCallback = callback;
}

// --- Inicialización del Módulo de Filtros ---
export function initFilterSort() {
    platformListFilterElement = getElem('platformListFilter');
    showAllPlatformsBtnElement = getElem('showAllPlatformsBtn');
    searchInputElement = getElem('searchInput', false);
    genreFilterElement = getElem('genreFilter', false);
    yearFilterInputElement = getElem('yearFilterInput', false);
    sortOrderSelectElement = getElem('sortOrder', false);
    resetFiltersBtnElement = getElem('resetFiltersBtn', false);

    const debouncedReload = debounce(() => filterAndTriggerReload(), 350);

    if (searchInputElement) searchInputElement.addEventListener('input', debouncedReload);
    if (genreFilterElement) genreFilterElement.addEventListener('change', filterAndTriggerReload);
    if (yearFilterInputElement) yearFilterInputElement.addEventListener('input', debouncedReload);
    if (sortOrderSelectElement) sortOrderSelectElement.addEventListener('change', filterAndTriggerReload);
    
    // --- INICIO DE BLOQUE MODIFICADO ---
    if (resetFiltersBtnElement) {
        resetFiltersBtnElement.addEventListener('click', () => {
            // 1. Reiniciar todos los inputs visuales
            if (searchInputElement) searchInputElement.value = '';
            if (genreFilterElement) genreFilterElement.value = '';
            if (yearFilterInputElement) yearFilterInputElement.value = '';
            if (sortOrderSelectElement) sortOrderSelectElement.value = 'title-asc';
            
            // 2. Reiniciar el filtro de plataforma en la lógica y la UI
            activePlatformFilter = null;
            populatePlatformFilterList(); // Actualiza la UI de la barra lateral
            
            // 3. Llamar a la recarga de forma directa e inmediata, sin debounce
            filterAndTriggerReload(); 
        });
    }
    // --- FIN DE BLOQUE MODIFICADO ---

    if (platformListFilterElement) {
        platformListFilterElement.addEventListener('click', (event) => {
            if (event.target.tagName === 'LI' && event.target.dataset.platform) {
                const clickedPlatform = event.target.dataset.platform;
                activePlatformFilter = (activePlatformFilter === clickedPlatform) ? null : clickedPlatform;
                populatePlatformFilterList(); 
                filterAndTriggerReload();
            }
        });
    }
    if (showAllPlatformsBtnElement) {
        showAllPlatformsBtnElement.addEventListener('click', () => {
            if (activePlatformFilter !== null) {
                activePlatformFilter = null;
                populatePlatformFilterList(); 
                filterAndTriggerReload();
            }
        });
    }
}

export function populateGenreFilterDropdown(allGenresFromServer) {
    if (!genreFilterElement) return;

    const genresToDisplay = new Set(allGenresFromServer.filter(g => g && typeof g === 'string'));
    const currentGenreValue = genreFilterElement.value;
    
    genreFilterElement.innerHTML = `<option value="">${getText('filter_genreOpt_allGenres')}</option>`; 

    Array.from(genresToDisplay).sort((a, b) => getText(a).localeCompare(getText(b))).forEach(gKey => {
        const op = document.createElement('option');
        op.value = gKey;
        op.textContent = escapeHtml(getText(gKey));
        genreFilterElement.appendChild(op);
    });

    genreFilterElement.value = currentGenreValue;
}

export function populatePlatformFilterList(platformSummaryData = null) {
    if (platformSummaryData) {
        allPlatformSummaries = platformSummaryData; 
    }
    if (!platformListFilterElement || !showAllPlatformsBtnElement) return;

    const sortedPlatforms = [...allPlatformSummaries].sort((a, b) => {
        const platformA = getText(String(a.platform || ''));
        const platformB = getText(String(b.platform || ''));
        return platformA.localeCompare(platformB);
    });

    const totalGamesFromSummary = allPlatformSummaries.reduce((sum, p) => sum + (p.count || 0), 0);
    
    showAllPlatformsBtnElement.textContent = `${getText('sidebar_showAllPlatformsBtn')} (${totalGamesFromSummary})`; 
    showAllPlatformsBtnElement.classList.toggle('active', activePlatformFilter === null);
    platformListFilterElement.innerHTML = '';

    sortedPlatforms.forEach(platformObj => { 
        const li = document.createElement('li');
        li.textContent = `${escapeHtml(getText(platformObj.platform))} (${platformObj.count})`;
        li.dataset.platform = platformObj.platform;
        if (platformObj.platform === activePlatformFilter) {
            li.classList.add('active');
        }
        platformListFilterElement.appendChild(li);
    });
}

function filterAndTriggerReload() {
    const filters = {
        searchTerm: searchInputElement ? searchInputElement.value.toLowerCase().trim() : '',
        genre: genreFilterElement ? genreFilterElement.value : '',
        platform: activePlatformFilter,
        year: yearFilterInputElement ? yearFilterInputElement.value.trim() : ''
    };
    const sortOrder = sortOrderSelectElement ? sortOrderSelectElement.value : 'title-asc';

    reloadGamesCallback(filters, sortOrder);
}