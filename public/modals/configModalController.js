// modals/configModalController.js
import { getElem } from '../domUtils.js';
import { getCurrentUserRole, updatePlanCounterUI } from '../authClient.js'; // <-- IMPORTAMOS updatePlanCounterUI
import { initThemeSettingsTab } from './configTabs/themeSettingsTab.js';
import { initProfileTab, populateProfileTabDataOnOpen } from './configTabs/profileTab.js';
import { initCollectionsTab } from './configTabs/collectionsTab.js';
import { initAdminTabController } from './configTabs/adminTabController.js';

let configModalElement, configModalContentElement, configModalHeaderElement, closeModalBtnConfigElement;
let isDragging = false, xOffset = 0, yOffset = 0, currentX = 0, currentY = 0;

let themeSettingsCallbacks = {};
let loadInitialGamesForCollectionsCb = () => {};

// --- Lógica de Arrastre (Drag) ---
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
    isDragging = false;
    if (configModalContentElement) {
        configModalContentElement.style.cursor = 'grab';
    }
    document.removeEventListener('mousemove', dragging);
    document.removeEventListener('mouseup', dragEnd);
}

// --- Lógica de Pestañas (Tabs) ---
function initConfigTabsInternal(preferredTabId = null) {
    const tabButtonsContainer = configModalElement?.querySelector('.config-tabs-nav');
    if (!tabButtonsContainer) return;

    const tabButtons = Array.from(tabButtonsContainer.querySelectorAll('.config-tab-button'));
    const tabPanels = Array.from(configModalElement.querySelectorAll('.config-tab-panel'));
    const mainSaveButtonsContainer = configModalElement.querySelector('.modal-buttons');

    const activateTab = (buttonToActivate) => {
        if (!buttonToActivate) return;
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));

        buttonToActivate.classList.add('active');
        const targetTabId = buttonToActivate.dataset.tab;
        const panelToActivate = document.getElementById(targetTabId);
        if (panelToActivate) panelToActivate.classList.add('active');

        // Controlamos la visibilidad del contenedor de botones de guardar/resetear tema.
        const themeTabs = ['tab-general', 'tab-colors', 'tab-typography'];
        if (mainSaveButtonsContainer) {
            mainSaveButtonsContainer.style.display = themeTabs.includes(targetTabId) ? 'flex' : 'none';
        }
    };

    if (tabButtonsContainer && !tabButtonsContainer.dataset.listenerAttached) {
        tabButtonsContainer.addEventListener('click', (event) => {
            const clickedButton = event.target.closest('.config-tab-button');
            if (clickedButton && clickedButton.style.display !== 'none') {
                activateTab(clickedButton);
                if (clickedButton.dataset.tab === 'tab-profile') {
                    populateProfileTabDataOnOpen();
                }
            }
        });
        tabButtonsContainer.dataset.listenerAttached = 'true';
    }

    let buttonToActivate = preferredTabId ? tabButtons.find(btn => btn.dataset.tab === preferredTabId && btn.style.display !== 'none') : null;
    if (!buttonToActivate) {
        buttonToActivate = tabButtons.find(btn => btn.style.display !== 'none');
    }
    activateTab(buttonToActivate);
}

export function initConfigModalController(callbacks) {
    configModalElement = getElem('configModal');
    if (!configModalElement) return;

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

    if (callbacks?.theme) {
        themeSettingsCallbacks = callbacks.theme;
        initThemeSettingsTab(themeSettingsCallbacks.save, themeSettingsCallbacks.reset, themeSettingsCallbacks.load, themeSettingsCallbacks.apply);
    }
    initProfileTab();
    
    if (typeof callbacks?.loadInitialGames === 'function') {
        loadInitialGamesForCollectionsCb = callbacks.loadInitialGames;
    }
    initCollectionsTab(loadInitialGamesForCollectionsCb);
    
    initAdminTabController();
    
    console.log("Config Modal Controller Initialized");
}

export function openConfigModal(targetAdminTab = false, targetCollectionsTab = false, targetProfileTab = false) {
    if (!configModalElement || !configModalContentElement) return;

    if (themeSettingsCallbacks.load && getElem('configForm', false)) {
        themeSettingsCallbacks.load(getElem('configForm', false));
    }

    configModalContentElement.style.position = '';
    configModalContentElement.style.top = '';
    configModalContentElement.style.left = '';
    configModalElement.style.display = 'flex';

    const isAdmin = getCurrentUserRole() === 'admin';
    const adminTabButtonElem = getElem('admin-tab-button', false);
    if (adminTabButtonElem) adminTabButtonElem.style.display = isAdmin ? 'inline-flex' : 'none';
    
    if (typeof populateProfileTabDataOnOpen === 'function') {
        populateProfileTabDataOnOpen();
    }
    
    let preferredTabId = 'tab-general';
    if (targetProfileTab) preferredTabId = 'tab-profile';
    else if (targetCollectionsTab) preferredTabId = 'tab-collections';
    else if (isAdmin && targetAdminTab) preferredTabId = 'tab-admin';

    initConfigTabsInternal(preferredTabId);
    
    const exportStatusMsgEl = getElem('exportStatusMessage', false);
    if (exportStatusMsgEl) { exportStatusMsgEl.textContent = ''; exportStatusMsgEl.className = 'auth-message'; exportStatusMsgEl.style.display = 'none'; }
    const importStatusMsgEl = getElem('importStatusMessage', false);
    if (importStatusMsgEl) { importStatusMsgEl.textContent = ''; importStatusMsgEl.className = 'auth-message'; importStatusMsgEl.style.display = 'none'; }
    const importFileEl = getElem('importFile', false);
    if (importFileEl) importFileEl.value = '';
    const importBtnEl = getElem('importCollectionBtn', false);
    if (importBtnEl) importBtnEl.disabled = true;

    console.log("Config Modal Opened");
}

export function closeConfigModal() {
    if (configModalElement) {
        configModalElement.style.display = 'none';
        if (isDragging) {
            isDragging = false;
            document.removeEventListener('mousemove', dragging);
            document.removeEventListener('mouseup', dragEnd);
        }
    }
    
    // --- INICIO DE LA CORRECCIÓN ---
    // Forzamos la actualización del contador del plan cada vez que se cierra el modal.
    // Esto asegura que si un admin cambió un plan, la UI se refresque.
    if (typeof updatePlanCounterUI === 'function') {
        updatePlanCounterUI();
    }
    // --- FIN DE LA CORRECCIÓN ---

    console.log("Config Modal Closed");
}

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