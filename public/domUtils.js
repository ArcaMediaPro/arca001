// domUtils.js (MODIFICADO Y CORREGIDO)
import { getText } from './i18n.js';

// --- Constantes DOM ---
export let initError = false;

/**
 * Obtiene un elemento por su ID. Opcionalmente, puede buscar dentro de un elemento de contexto.
 * @param {string} id - El ID del elemento a buscar.
 * @param {boolean} required - Si es true, mostrará un error si no se encuentra.
 * @param {Document|HTMLElement} context - El contexto en el que buscar (por defecto, todo el documento).
 * @returns {HTMLElement|null}
 */
export function getElem(id, required = true, context = document) {
    // getElementById solo existe en 'document'. Para otros elementos, usamos querySelector.
    const elem = (context === document)
        ? document.getElementById(id)
        : context.querySelector(`#${id}`);

    if (!elem && required) {
        console.error(`Error crítico: Elemento con ID "${id}" no encontrado.`);
        initError = true;
    }
    return elem;
}


export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        unsafe = String(unsafe || '');
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Lógica de Previsualización de Imágenes ---
export function previewImage(fileInput, previewElement) {
    if (!fileInput?.files?.[0]) {
        if (previewElement) previewElement.innerHTML = '';
        return;
    }
    const file = fileInput.files[0];
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewElement.innerHTML = `<img src="${e.target.result}" alt="${getText('domUtils_previewImageAlt')}">`;
        };
        reader.readAsDataURL(file);
    }
}

export function handleScreenshotPreview(screenshotsInput, screenshotsPreviewContainer) {
    if (!screenshotsInput || !screenshotsPreviewContainer) return;
    screenshotsPreviewContainer.innerHTML = '';
    const files = Array.from(screenshotsInput.files);
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = getText('domUtils_previewScreenshotAlt').replace('{fileName}', escapeHtml(file.name));
                screenshotsPreviewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });
}


// =================================================================
// === INICIO: LÓGICA DE ESTRELLAS CORREGIDA Y REFACTORIZADA     ===
// =================================================================

/**
 * Crea las 10 estrellas iniciales en el contenedor del formulario.
 */
export function createFormStars(formRatingStarsContainer) {
    if (!formRatingStarsContainer) return;
    formRatingStarsContainer.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const star = document.createElement('label');
        star.className = 'star-10';
        star.dataset.value = i;
        star.title = getText('domUtils_starRatingTitle').replace('{rating}', '0');
        formRatingStarsContainer.appendChild(star);
    }
}

/**
 * Actualiza el estado visual de las estrellas a un valor permanente.
 * Esta es la función principal que dibuja el rating guardado.
 */
export function updateFormStarsVisual(value, container) {
    if (!container) return;
    const rating = parseInt(value, 10) || 0;
    const stars = container.querySelectorAll('.star-10');
    
    stars.forEach(star => {
        const starValue = parseInt(star.dataset.value, 10);
        star.classList.remove('hover'); // Limpia cualquier previsualización
        star.classList.toggle('active', starValue <= rating);
    });
}

/**
 * Muestra una previsualización de rating cuando el mouse pasa por encima.
 */
export function handleFormStarHover(event, container) {
    if (!container || !event.target.classList.contains('star-10')) return;
    const hoverValue = parseInt(event.target.dataset.value, 10);
    const stars = container.querySelectorAll('.star-10');
    
    stars.forEach(star => {
        const starValue = parseInt(star.dataset.value, 10);
        star.classList.toggle('hover', starValue <= hoverValue);
    });
}

/**
 * Limpia la previsualización cuando el mouse sale del contenedor.
 */
export function handleFormStarMouseOut(container) {
    if (!container) return;
    container.querySelectorAll('.star-10').forEach(star => star.classList.remove('hover'));
}

/**
 * Guarda el rating seleccionado al hacer clic y actualiza la vista.
 */
export function handleFormStarClick(event, hiddenInput, container) {
    if (!event.target.classList.contains('star-10')) return;
    const clickedValue = event.target.dataset.value;
    
    if (hiddenInput) {
        hiddenInput.value = clickedValue;
    }
    // Llama a la función principal para fijar el nuevo estado visual
    updateFormStarsVisual(clickedValue, container);
}

/**
 * Genera el HTML para mostrar estrellas (no interactivas) en la lista de juegos.
 */
export function generateDisplayStars10(rating) {
    let starsHTML = '';
    const currentRating = parseInt(rating) || 0;
    const titleText = getText('domUtils_starRatingTitle').replace('{rating}', currentRating.toString());
    const ariaLabelText = getText('domUtils_starRatingAriaLabel').replace('{rating}', currentRating.toString());

    for (let i = 1; i <= 10; i++) {
        const isActive = i <= currentRating ? 'active' : '';
        starsHTML += `<label class="star-10 ${isActive}" title="${titleText}"></label>`;
    }
    return `<div class="rating-display-stars-10" aria-label="${ariaLabelText}">${starsHTML}</div>`;
}
// =================================================================
// === FIN: LÓGICA DE ESTRELLAS CORREGIDA                        ===
// =================================================================
