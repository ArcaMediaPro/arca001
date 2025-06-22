// public/i18n.js (ACTUALIZADO)
let translations = {};
// LÍNEA AÑADIDA: Variable para almacenar el idioma actual.
let currentLang = 'es'; 

/**
 * Carga las traducciones para el idioma especificado.
 * @param {string} lang - El código del idioma (ej: "es", "en").
 */
export async function loadTranslations(lang = 'es') {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Error al cargar el archivo de idioma: ${response.statusText} (idioma: ${lang})`);
        }
        translations = await response.json();
        // LÍNEA AÑADIDA: Guardamos el idioma que se acaba de cargar.
        currentLang = lang;
        console.log(`Traducciones para "${lang}" cargadas.`);
    } catch (error) {
        console.error('Error en loadTranslations:', error);
        translations = {};
    }
}

/**
 * Obtiene el texto traducido para una clave dada.
 * @param {string} key - La clave de la traducción.
 * @param {object} [vars] - Un objeto con variables para reemplazar en el texto.
 * @returns {string} El texto traducido o la clave misma si no se encuentra la traducción.
 */
export function getText(key, vars = {}) {
    let text = translations[key] || `[${key}]`;
    for (const v_key in vars) {
        text = text.replace(`{${v_key}}`, vars[v_key]);
    }
    return text;
}

/**
 * LÍNEA AÑADIDA: Nueva función para obtener el idioma actual.
 * @returns {string} El código del idioma actual (ej: "es").
 */
export function getCurrentLanguage() {
    return currentLang;
}