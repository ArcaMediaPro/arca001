// proposed_path: modals/configTabs/themeSettingsTab.js
import { getElem } from '../../domUtils.js'; // Ajusta la ruta
import { handleConfigFormInput as generalConfigFormInputHandler } from '../configModalController.js'; // Asumiendo que se exporta

let configFormElement, saveConfigBtnElement, resetConfigBtnElement;
let saveThemeSettingsCallback = () => {};
let resetThemeSettingsCallback = () => {};
let loadThemeSettingsCallback = () => {};
let applyThemePropertyCallback = () => {};


export function initThemeSettingsTab(saveCb, resetCb, loadCb, applyCb) {
    configFormElement = getElem('configForm', false); // Este form contiene las pestañas General, Colores, Tipografía
    saveConfigBtnElement = getElem('saveConfigBtn', false); // Asumo que estos botones son globales para el tema
    resetConfigBtnElement = getElem('resetConfigBtn', false);

    if (typeof saveCb === 'function') saveThemeSettingsCallback = saveCb;
    if (typeof resetCb === 'function') resetThemeSettingsCallback = resetCb;
    if (typeof loadCb === 'function') loadThemeSettingsCallback = loadCb;
    if (typeof applyCb === 'function') applyThemePropertyCallback = applyCb;

    if (saveConfigBtnElement && configFormElement) {
        saveConfigBtnElement.addEventListener('click', () => saveThemeSettingsCallback(configFormElement));
    }
    if (resetConfigBtnElement && configFormElement) {
        resetConfigBtnElement.addEventListener('click', () => resetThemeSettingsCallback(configFormElement));
    }

    // Listener para cambios en tiempo real en los inputs de tema
    if (configFormElement) {
        // Asumiendo que configFormElement engloba las pestañas 'tab-general', 'tab-colors', 'tab-typography'
        const themeConfigTabs = ['tab-general', 'tab-colors', 'tab-typography'];
        themeConfigTabs.forEach(tabId => {
            const tabPanel = getElem(tabId, false);
            if (tabPanel && !tabPanel.dataset.themeInputListenerAttached) {
                 tabPanel.addEventListener('input', (e) => {
                    // Llama a la función de configModalController o una local si prefieres
                    generalConfigFormInputHandler(e, applyThemePropertyCallback);
                });
                tabPanel.dataset.themeInputListenerAttached = 'true';
            }
        });
    }
    // Cargar las configuraciones iniciales cuando se inicializa esta pestaña (o el modal)
    // Esto se maneja mejor en openConfigModal en configModalController.js
    // if (configFormElement && typeof loadThemeSettingsCallback === 'function') {
    //     loadThemeSettingsCallback(configFormElement);
    // }
    console.log("Theme Settings Tab Initialized");
}