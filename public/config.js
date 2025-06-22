// config.js
import { fetchAuthenticated, isAuthenticated, getCurrentUserThemeSettings } from './authClient.js';
import { API_BASE_URL } from './appConfig.js'; // MODIFICADO: Importar desde el nuevo archivo

// URL base para acceder a los archivos estáticos (imágenes) servidos por el backend
// Esta ya está en appConfig.js, así que puedes importarla de allí también si la necesitas aquí,
// o simplemente eliminarla de aquí si solo se usa en otros módulos que ahora importarán de appConfig.js
// export const IMAGES_BASE_URL = 'http://localhost:5000/'; // ELIMINAR o importar de appConfig.js

// --- Configuración de Tema ---
export const DEFAULT_THEME_SETTINGS = { // Mantenido original
    '--clr-bg-body': '#2c2a3f', '--clr-text-main': '#e0e0e0', '--clr-text-secondary': '#bdbdbd',
    '--clr-bg-section': '#3d3b54', '--clr-border': '#545170', '--clr-accent-1': '#ffb74d',
    '--clr-accent-2': '#ffcc80', '--clr-btn-p-bg': '#ff8a65', '--clr-btn-p-text': '#212121',
    '--clr-btn-p-hover': '#ffab91', '--clr-btn-s-bg': '#6a679e', '--clr-btn-s-text': '#ffffff',
    '--clr-btn-s-hover': '#8481b8', '--clr-btn-d-bg': '#e57373', '--clr-btn-d-text': '#ffffff',
    '--clr-btn-d-hover': '#ef5350', '--clr-input-focus': '#ff8a65',
    '--clr-sidebar-active-bg': '#ff8a65', '--clr-sidebar-active-text': '#212121',
    '--clr-sidebar-hover-bg': '#545170', '--font-body': 'sans-serif',
    '--font-headings-main': 'sans-serif', '--font-headings-card': 'sans-serif',
    '--font-ui': 'sans-serif', '--font-size-body': '0.9',
    '--font-size-headings-main': '1.8', '--font-size-headings-card': '1.1',
    '--font-size-ui': '0.9'
};
export const THEME_STORAGE_KEY = 'catalogadorThemeSettings'; // Mantenido original

let localCachedServerSettings = null; // Mantenido original

export function applyThemeProperty(varName, value) { // Mantenido original (cuerpo completo)
    if (document.documentElement) document.documentElement.style.setProperty(varName, value);
}
export function updateConfigInputs(settings, configForm) { // Mantenido original (cuerpo completo)
    if (!configForm) return;
    configForm.querySelectorAll('input[type="color"][data-var]').forEach(picker => {
        const varName = picker.dataset.var;
        picker.value = settings[varName] || DEFAULT_THEME_SETTINGS[varName] || '#000000';
    });
    configForm.querySelectorAll('select[data-var]').forEach(select => {
        const varName = select.dataset.var;
        select.value = settings[varName] || DEFAULT_THEME_SETTINGS[varName] || 'sans-serif';
    });
    configForm.querySelectorAll('input[type="number"][data-var-size]').forEach(input => {
        const varName = input.dataset.varSize;
        const defaultValue = DEFAULT_THEME_SETTINGS[varName] || '1';
        input.value = settings[varName] !== undefined ? String(settings[varName]) : defaultValue;
    });
}

async function fetchThemeSettingsFromServer() { // Nueva definición proporcionada
    if (!isAuthenticated()) return null;
    try {
        // API_BASE_URL ahora se usa aquí correctamente desde la importación de appConfig.js
        const response = await fetchAuthenticated(`${API_BASE_URL}/preferences`);
        if (response.ok) {
            const serverPrefs = await response.json();
            localCachedServerSettings = serverPrefs;
            return serverPrefs;
        }
        console.warn("Theme: No se pudieron obtener settings del servidor.");
        return null;
    } catch (error) {
        console.error("Theme: Error obteniendo settings del servidor:", error);
        return null;
    }
}

// Las siguientes funciones se mantienen como estaban en la versión anterior,
// ya que el comentario indicaba:
// "// ... (el resto de loadThemeSettings, saveThemeSettingsToServer, saveThemeSettings,
//    resetThemeSettings, clearUserServerThemeSettingsCache se mantienen igual,
//    ya que usan API_BASE_URL que ahora viene de appConfig.js) ..."

export async function loadThemeSettings(configForm) { // Mantenido de la versión anterior
    let effectiveSettings = { ...DEFAULT_THEME_SETTINGS };
    let serverSettingsAttempted = false;

    if (isAuthenticated()) {
        let userServerPrefs = getCurrentUserThemeSettings();
        if (userServerPrefs && Object.keys(userServerPrefs).length > 0) {
            console.log("Theme: Usando settings del servidor (desde authClient).");
            Object.assign(effectiveSettings, userServerPrefs);
            localCachedServerSettings = userServerPrefs;
        } else if (localCachedServerSettings) {
            console.log("Theme: Usando settings del servidor (cacheados localmente).");
            Object.assign(effectiveSettings, localCachedServerSettings);
        } else {
            console.log("Theme: Intentando obtener settings del servidor (fetch)...");
            const fetchedPrefs = await fetchThemeSettingsFromServer();
            serverSettingsAttempted = true;
            if (fetchedPrefs) {
                Object.assign(effectiveSettings, fetchedPrefs);
                console.log("Theme: Settings del servidor cargados y aplicados (fetch).");
            } else {
                console.log("Theme: No hay settings en el servidor o error, usando defaults y guardándolos si es la primera vez.");
                localCachedServerSettings = { ...DEFAULT_THEME_SETTINGS };
                await saveThemeSettingsToServer(localCachedServerSettings);
                Object.assign(effectiveSettings, localCachedServerSettings);
            }
        }
    }

    if (!isAuthenticated() || (serverSettingsAttempted && !localCachedServerSettings)) {
        const savedSettingsJSON = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedSettingsJSON) {
            try {
                const parsed = JSON.parse(savedSettingsJSON);
                if (!isAuthenticated() || !localCachedServerSettings) {
                     for (const key in DEFAULT_THEME_SETTINGS) {
                        if (parsed.hasOwnProperty(key)) {
                            effectiveSettings[key] = parsed[key];
                        }
                     }
                }
                console.log("Theme: Settings cargados de localStorage (fallback).");
            } catch (e) {
                console.error("Theme: Error parseando settings de localStorage:", e);
                localStorage.removeItem(THEME_STORAGE_KEY);
            }
        }
    }

    for (const varName in effectiveSettings) {
        if (DEFAULT_THEME_SETTINGS.hasOwnProperty(varName)) {
            let valueToApply = effectiveSettings[varName];
            if (varName.startsWith('--font-size-')) {
                valueToApply += 'rem';
            }
            applyThemeProperty(varName, valueToApply);
        }
    }
    if (configForm) { updateConfigInputs(effectiveSettings, configForm); }
}

async function saveThemeSettingsToServer(settingsToSave) { // Mantenido de la versión anterior
    if (!isAuthenticated()) return;
    try {
        const response = await fetchAuthenticated(`${API_BASE_URL}/preferences`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ themeSettings: settingsToSave }),
        });
        if (response.ok) {
            const updatedPrefs = await response.json();
            localCachedServerSettings = updatedPrefs.themeSettings;
            console.warn("Considerar estrategia para actualizar currentUserThemeSettings en authClient después de guardar en servidor.");
            console.log("Theme: Configuración guardada en el servidor.");
        } else {
            const errData = await response.json().catch(() => ({ message: "Error desconocido del servidor al guardar preferencias." }));
            console.error("Theme: Error guardando settings en el servidor:", errData.message);
            alert(`Error al guardar configuración en el servidor: ${errData.message}`);
        }
    } catch (error) {
        console.error("Theme: Error de red guardando settings en servidor:", error);
        alert(`Error de red al guardar configuración en el servidor: ${error.message}`);
    }
}

export async function saveThemeSettings(configForm) { // Mantenido de la versión anterior
    if (!configForm) return;
    const settingsToSave = {};
    configForm.querySelectorAll('input[type="color"][data-var]').forEach(picker => {
        const varName = picker.dataset.var;
        if (varName && DEFAULT_THEME_SETTINGS.hasOwnProperty(varName)) settingsToSave[varName] = picker.value;
    });
    configForm.querySelectorAll('select[data-var]').forEach(select => {
        const varName = select.dataset.var;
        if (varName && DEFAULT_THEME_SETTINGS.hasOwnProperty(varName)) settingsToSave[varName] = select.value;
    });
    configForm.querySelectorAll('input[type="number"][data-var-size]').forEach(input => {
        const varName = input.dataset.varSize;
        if (varName && DEFAULT_THEME_SETTINGS.hasOwnProperty(varName)) settingsToSave[varName] = input.value.trim();
    });

    if (isAuthenticated()) {
        await saveThemeSettingsToServer(settingsToSave);
    } else {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settingsToSave));
        console.log("Theme: Configuración guardada en localStorage (usuario no autenticado).");
    }
    alert("Configuración del tema guardada.");
}

export async function resetThemeSettings(configForm) { // Mantenido de la versión anterior
    if (!configForm) return;
    if (confirm("¿Restablecer toda la configuración (colores y fuentes) a los valores predeterminados?")) {
        const defaultsToApply = { ...DEFAULT_THEME_SETTINGS };
        if (isAuthenticated()) {
            await saveThemeSettingsToServer(defaultsToApply);
            localCachedServerSettings = defaultsToApply;
            console.warn("Considerar estrategia para actualizar currentUserThemeSettings en authClient después de resetear en servidor.");
        } else {
            localStorage.removeItem(THEME_STORAGE_KEY);
        }

        for (const varName in DEFAULT_THEME_SETTINGS) {
            let valueToApply = DEFAULT_THEME_SETTINGS[varName];
            if (varName.startsWith('--font-size-')) { valueToApply += 'rem'; }
            applyThemeProperty(varName, valueToApply);
        }
        updateConfigInputs(DEFAULT_THEME_SETTINGS, configForm);
        console.log("Theme: Configuración restablecida.");
        alert("Configuración del tema restablecida a los valores predeterminados.");
    }
}

export function clearUserServerThemeSettingsCache() { // Mantenido de la versión anterior
    localCachedServerSettings = null;
    console.log("Theme: Caché local de preferencias del servidor limpiada.");
}

// La función removeThemeProperty que estaba en la versión anterior no estaba en tu snippet,
// la he re-añadido por si es necesaria, aunque no se use activamente.
export function removeThemeProperty(varName) {
    if (document.documentElement) document.documentElement.style.removeProperty(varName);
}