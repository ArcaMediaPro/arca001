// domUtils.js (MODIFICADO Y CORREGIDO)
import { getText } from './i18n.js';

// --- Constantes DOM ---
export let initError = false;
export function getElem(id, required = true, context = document) {
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
        formRatingStarsContainer.appendChild(star);
    }
    // Inicializa los tooltips
    updateFormStarsVisual('0', formRatingStarsContainer);
}

/**
 * Actualiza el estado visual de las estrellas a un valor permanente y actualiza el tooltip.
 */
export function updateFormStarsVisual(value, container) {
    if (!container) return;
    const rating = parseInt(value, 10) || 0;
    const stars = container.querySelectorAll('.star-10');
    
    const titleText = getText('domUtils_starRatingTitle').replace('{rating}', rating.toString());

    stars.forEach(star => {
        const starValue = parseInt(star.dataset.value, 10);
        star.classList.remove('hover');
        star.classList.toggle('active', starValue <= rating);
        star.title = titleText;
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
 * Limpia la previsualización y restaura el estado guardado cuando el mouse sale.
 */
export function handleFormStarMouseOut(hiddenInput, container) {
    if (!hiddenInput || !container) return;
    
    container.querySelectorAll('.star-10').forEach(star => star.classList.remove('hover'));
    
    // Al salir, restauramos la vista al valor que está guardado en el input oculto.
    updateFormStarsVisual(hiddenInput.value, container);
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
    // Llama a la función principal para fijar el nuevo estado visual y el tooltip.
    updateFormStarsVisual(clickedValue, container);
}

/**
 * Genera el HTML para mostrar estrellas (no interactivas).
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