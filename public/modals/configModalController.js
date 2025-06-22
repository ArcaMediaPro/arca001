// proposed_path: modals/configModalController.js
import { getElem } from '../domUtils.js'; // Ajusta la ruta
import { getCurrentUserRole } from '../authClient.js'; // Para visibilidad de pestañas
import { initThemeSettingsTab } from './configTabs/themeSettingsTab.js';
import { initProfileTab, populateProfileTabDataOnOpen } from './configTabs/profileTab.js';
import { initCollectionsTab } from './configTabs/collectionsTab.js';
import { initAdminTabController } from './configTabs/adminTabController.js'; // Asume que adminTabController.js existe

let configModalElement, configModalContentElement, configModalHeaderElement, closeModalBtnConfigElement;
let isDragging = false, xOffset = 0, yOffset = 0, currentX = 0, currentY = 0;

// Callbacks para las pestañas
let themeSettingsCallbacks = {};
let loadInitialGamesForCollectionsCb = () => {};

// --- Drag Logic (Copiado de modals.js) ---
function dragStart(e) {
    if (e.button !== 0 || !configModalContentElement || !configModalHeaderElement || !configModalHeaderElement.contains(e.target)) return;
    isDragging = true;
    const rect = configModalContentElement.getBoundingClientRect();
    xOffset = e.clientX - rect.left;
    yOffset = e.clientY - rect.top;
    configModalContentElement.style.position = 'absolute';
    configModalContentElement.style.left = `${rect.left}px`;
    configModalContentElement.style.top = `${rect.top}px`;
    configModalContentElement.style.cursor = 'grabbing';
    configModalContentElement.classList.add('dragging');
    if (configModalElement) configModalElement.classList.add('is-dragging');
    document.addEventListener('mousemove', dragging);
    document.addEventListener('mouseup', dragEnd);
}

function dragging(e) {
    if (!isDragging || !configModalContentElement) return;
    e.preventDefault();
    currentX = e.clientX - xOffset;
    currentY = e.clientY - yOffset;
    const maxX = window.innerWidth - configModalContentElement.offsetWidth;
    const maxY = window.innerHeight - configModalContentElement.offsetHeight;
    currentX = Math.max(0, Math.min(currentX, maxX < 0 ? 0 : maxX));
    currentY = Math.max(0, Math.min(currentY, maxY < 0 ? 0 : maxY));
    configModalContentElement.style.left = `${currentX}px`;
    configModalContentElement.style.top = `${currentY}px`;
}

function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    if (configModalContentElement) {
        configModalContentElement.style.cursor = 'grab';
        configModalContentElement.classList.remove('dragging');
    }
    if (configModalElement) {
        configModalElement.classList.remove('is-dragging');
    }
    document.removeEventListener('mousemove', dragging);
    document.removeEventListener('mouseup', dragEnd);
}

// --- Tab Logic ---
function initConfigTabsInternal(preferredTabId = null) {
    const tabButtonsContainer = configModalElement ? configModalElement.querySelector('.config-tabs-nav') : null;
    const tabsContainerParent = tabButtonsContainer ? tabButtonsContainer.closest('.config-tabs-container') : null;

    if (!tabButtonsContainer || !tabsContainerParent) {
        console.error("Error inicializando pestañas de configuración: contenedores no encontrados.");
        return;
    }
    const tabButtons = Array.from(tabButtonsContainer.querySelectorAll('.config-tab-button'));
    const tabPanels = Array.from(tabsContainerParent.querySelectorAll('.config-tab-panel'));

    let buttonToActivate = null;

    if (preferredTabId) {
        buttonToActivate = tabButtons.find(btn => btn.dataset.tab === preferredTabId && btn.style.display !== 'none');
    }
    if (!buttonToActivate) {
        const currentActiveButton = tabButtonsContainer.querySelector('.config-tab-button.active');
        if (currentActiveButton && currentActiveButton.style.display !== 'none') {
            buttonToActivate = currentActiveButton;
        }
    }
    if (!buttonToActivate) {
        buttonToActivate = tabButtons.find(btn => btn.style.display !== 'none');
    }

    if (buttonToActivate) {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));

        buttonToActivate.classList.add('active');
        const panelIdToActivate = buttonToActivate.dataset.tab;
        const panelToActivate = document.getElementById(panelIdToActivate); // Asumiendo que los paneles tienen ID
        if (panelToActivate) panelToActivate.classList.add('active');
    }
} // Adaptado

export function initConfigModalController(callbacks) {
    configModalElement = getElem('configModal');
    if (!configModalElement) {
        console.error("CRITICAL: Elemento configModal no encontrado.");
        return;
    }
    configModalContentElement = configModalElement.querySelector('.modal-content');
    configModalHeaderElement = getElem('configModalHeader');
    closeModalBtnConfigElement = configModalElement.querySelector('.close');

    if (closeModalBtnConfigElement) closeModalBtnConfigElement.addEventListener('click', closeConfigModal);
    configModalElement.addEventListener('click', (event) => {
        if (event.target === configModalElement && !isDragging) closeConfigModal();
    });
    if (configModalHeaderElement && configModalContentElement) {
        configModalHeaderElement.addEventListener('mousedown', dragStart);
    }

    // Initialize tab-specific modules
    if (callbacks && callbacks.theme) {
        themeSettingsCallbacks = callbacks.theme;
        initThemeSettingsTab(themeSettingsCallbacks.save, themeSettingsCallbacks.reset, themeSettingsCallbacks.load, themeSettingsCallbacks.apply);
    }
    initProfileTab(); // Asume que no necesita callbacks en init, los toma de authClient
    
    if (callbacks && typeof callbacks.loadInitialGames === 'function') {
        loadInitialGamesForCollectionsCb = callbacks.loadInitialGames;
    }
    initCollectionsTab(loadInitialGamesForCollectionsCb);
    
    initAdminTabController(); // Asume que maneja sus propias sub-inicializaciones

    const tabButtonsContainer = configModalElement.querySelector('.config-tabs-nav');
    if (tabButtonsContainer && !tabButtonsContainer.dataset.listenerAttached) {
        tabButtonsContainer.addEventListener('click', (event) => {
            const clickedButton = event.target.closest('.config-tab-button');
            if (!clickedButton || clickedButton.style.display === 'none') return;

            const tabPanels = configModalElement.querySelectorAll('.config-tab-panel');
            const tabButtons = tabButtonsContainer.querySelectorAll('.config-tab-button');

            tabButtons.forEach(button => button.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            clickedButton.classList.add('active');
            const targetTabId = clickedButton.dataset.tab;
            const targetPanel = document.getElementById(targetTabId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            if (targetTabId === 'tab-profile' && typeof populateProfileTabDataOnOpen === 'function') {
                populateProfileTabDataOnOpen(); // Llamar al abrir la pestaña
            }
            // Podrías añadir llamadas similares para otras pestañas si necesitan refrescar datos al activarse
        });
        tabButtonsContainer.dataset.listenerAttached = 'true';
    }
    console.log("Config Modal Controller Initialized");
}

export function openConfigModal(targetAdminTab = false, targetCollectionsTab = false, targetProfileTab = false) {
    if (!configModalElement || !configModalContentElement) return;

    // Load theme settings into the form if the theme tab exists and is configured
    if (themeSettingsCallbacks.load && getElem('configForm', false)) {
        themeSettingsCallbacks.load(getElem('configForm', false));
    }

    configModalElement.classList.remove('is-dragging');
    configModalContentElement.classList.remove('dragging');
    configModalContentElement.style.position = '';
    configModalContentElement.style.top = '';
    configModalContentElement.style.left = '';
    configModalContentElement.style.transform = ''; // Reset transform if any
    configModalContentElement.style.cursor = 'grab';
    configModalElement.style.display = 'flex';

    const userRole = getCurrentUserRole();
    const isAdmin = userRole === 'admin';

    const adminTabButtonElem = getElem('admin-tab-button', false);
    if (adminTabButtonElem) adminTabButtonElem.style.display = isAdmin ? 'inline-flex' : 'none';
    
    const collectionsTabButtonElem = getElem('collections-tab-button', false);
    if (collectionsTabButtonElem) collectionsTabButtonElem.style.display = 'inline-flex'; // Siempre visible según tu HTML
    
    const profileTabButtonElem = getElem('profile-tab-button', false);
    if (profileTabButtonElem) profileTabButtonElem.style.display = 'inline-flex'; // Siempre visible según tu HTML

    if (typeof populateProfileTabDataOnOpen === 'function') {
        populateProfileTabDataOnOpen(); // Llenar datos del perfil al abrir el modal
    }
    
    // Lógica para refrescar datos de la pestaña de admin si es necesario
    // Esto podría delegarse a adminTabController.js si es complejo

    let preferredTabId = null;
    if (targetProfileTab) preferredTabId = 'tab-profile';
    else if (targetCollectionsTab) preferredTabId = 'tab-collections';
    else if (isAdmin && targetAdminTab) preferredTabId = 'tab-admin';
    else preferredTabId = 'tab-general'; // Pestaña por defecto

    initConfigTabsInternal(preferredTabId);
    
    // Resetear mensajes de estado de import/export
    const exportStatusMsgEl = getElem('exportStatusMessage', false);
    if (exportStatusMsgEl) { exportStatusMsgEl.textContent = ''; exportStatusMsgEl.className = 'auth-message'; exportStatusMsgEl.style.display = 'none'; }
    const importStatusMsgEl = getElem('importStatusMessage', false);
    if (importStatusMsgEl) { importStatusMsgEl.textContent = ''; importStatusMsgEl.className = 'auth-message'; importStatusMsgEl.style.display = 'none'; }
    const importFileEl = getElem('importFile', false);
    if (importFileEl) importFileEl.value = '';
    const importBtnEl = getElem('importCollectionBtn', false);
    if (importBtnEl) importBtnEl.disabled = true;

    console.log("Config Modal Opened");
} // Parcialmente

export function closeConfigModal() {
    if (configModalElement) {
        configModalElement.style.display = 'none';
        if (isDragging) {
            isDragging = false;
            document.removeEventListener('mousemove', dragging);
            document.removeEventListener('mouseup', dragEnd);
            if (configModalContentElement) {
                configModalContentElement.classList.remove('dragging');
                configModalContentElement.style.cursor = 'grab';
            }
            configModalElement.classList.remove('is-dragging');
        }
    }
    console.log("Config Modal Closed");
}

// Función para manejar input en el formulario de config, si es general
export function handleConfigFormInput(event, applyThemeCb) {
    const target = event.target;
    let varName = null, newValue = null, applyUnit = '';

    if (target.matches('input[type="color"][data-var]')) { varName = target.dataset.var; newValue = target.value; }
    else if (target.matches('select[data-var]')) { varName = target.dataset.var; newValue = target.value; }
    else if (target.matches('input[type="number"][data-var-size]')) {
        varName = target.dataset.varSize; newValue = target.value.trim(); applyUnit = 'rem';
    }

    if (varName && newValue !== null && typeof applyThemeCb === 'function') {
        if (target.type === 'number' && target.matches('[data-var-size]')) {
            const min = parseFloat(target.min) || 0.1;
            const max = parseFloat(target.max) || 10;
            const step = parseFloat(target.step) || 0.01;
            let numValue = parseFloat(newValue);
            const DEFAULT_FONT_SIZE_VALUE = 1;

            if (isNaN(numValue)) numValue = DEFAULT_FONT_SIZE_VALUE;
            numValue = Math.max(min, Math.min(max, numValue));
            if (step > 0) {
                const precision = 1 / step;
                numValue = Math.round(numValue * precision) / precision;
            }
            newValue = String(parseFloat(numValue.toFixed(String(step).includes('.') ? String(step).split('.')[1].length : 0)));
            if (target.value !== newValue) target.value = newValue;
        }
        applyThemeCb(varName, newValue + applyUnit);
    }
}