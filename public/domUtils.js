// domUtils.js (MODIFICADO)
import { getText } from './i18n.js';
// Asumimos que notificationService no se usa directamente aquí, 
// pero si lo hiciera, necesitaría su propia importación.

// --- Constantes DOM ---
export let initError = false;
export function getElem(id, required = true) {
    const elem = document.getElementById(id);
    if (!elem && required) {
        console.error(getText('domUtils_criticalErrorElementNotFound').replace('{id}', id));
        initError = true;
    } else if (!elem && !required) {
        // console.warn(getText('domUtils_optionalElementNotFound').replace('{id}', id));
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

export function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

export function toggleForm(show = true, formSection, clearFormCallback) {
    if (!formSection) return;
    formSection.style.display = show ? 'block' : 'none';
    if (show) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        if (typeof clearFormCallback === 'function') clearFormCallback();
    }
}

export function previewImage(fileInput, previewElement) {
    if (!fileInput || !previewElement) {
        if(previewElement) previewElement.innerHTML = '';
        return;
    }
    if (!fileInput.files || fileInput.files.length === 0) {
        previewElement.innerHTML = '';
        return;
    }

    const file = fileInput.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Usar una clave para el 'alt' de la previsualización si se desea
            previewElement.innerHTML = `<img src="${e.target.result}" alt="${getText('domUtils_previewImageAlt')}">`;
        };
        reader.onerror = (err) => {
            console.error(getText('domUtils_errorReadingFile'), err);
            previewElement.innerHTML = getText('domUtils_errorPreviewingImage');
        };
        reader.readAsDataURL(file);
    } else {
        previewElement.innerHTML = '';
        fileInput.value = '';
        alert(getText('domUtils_alert_invalidImageFile'));
    }
}

export function handleScreenshotPreview(screenshotsInput, screenshotsPreviewContainer) {
    if (!screenshotsInput || !screenshotsPreviewContainer) return;

    screenshotsPreviewContainer.innerHTML = '';
    let files = Array.from(screenshotsInput.files);
    const MAX_NEW_SCREENSHOTS = 6;

    if (files.length > MAX_NEW_SCREENSHOTS) {
        const alertMsg = getText('domUtils_alert_maxScreenshots').replace('{MAX_NEW_SCREENSHOTS}', MAX_NEW_SCREENSHOTS.toString());
        // notificationService no está importado aquí, así que usamos alert
        alert(alertMsg);
        files = files.slice(0, MAX_NEW_SCREENSHOTS);
    }

    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = getText('domUtils_previewScreenshotAlt').replace('{fileName}', escapeHtml(file.name));
                img.title = file.name;
                screenshotsPreviewContainer.appendChild(img);
            };
            reader.onerror = (err) => console.error(getText('domUtils_errorReadingFile') + " " + file.name, err);
            reader.readAsDataURL(file);
        } else {
            console.warn(getText('domUtils_warn_skippedNotImage'), file.name);
        }
    });
}

export function createFormStars(formRatingStarsContainer) {
    if (!formRatingStarsContainer) return;
    formRatingStarsContainer.innerHTML = '';
    const initialRating = 0;
    const titleText = getText('domUtils_starRatingTitle').replace('{rating}', initialRating.toString());
    for (let i = 1; i <= 10; i++) {
        const star = document.createElement('label');
        star.className = 'star-10';
        star.dataset.value = i;
        star.title = titleText; // Establecer title inicial general
        formRatingStarsContainer.appendChild(star);
    }
    // Actualizar visualmente al estado inicial (que podría ser 0 o un valor de input)
    const hiddenRatingInput = getElem('rating', false); // Asume que está en el mismo contexto DOM o es accesible
    updateFormStarsVisual(hiddenRatingInput ? hiddenRatingInput.value : '0', formRatingStarsContainer);
}

export function updateFormStarsVisual(value, formRatingStarsContainer) {
    if (!formRatingStarsContainer) return;
    const ratingValue = parseInt(value) || 0;
    const stars = formRatingStarsContainer.querySelectorAll('.star-10');
    const titleText = getText('domUtils_starRatingTitle').replace('{rating}', ratingValue.toString());

    stars.forEach(star => {
        const starValue = parseInt(star.dataset.value);
        // Limpia cualquier clase de previsualización anterior
        star.classList.remove('hover-preview');
        // Establece el estado "activo" final
        star.classList.toggle('active', starValue <= ratingValue);
        star.title = titleText; // Actualiza el title de todas las estrellas
    });
}

// --- INICIO DE CÓDIGO MODIFICADO ---

// REEMPLAZA la función handleFormStarHover existente por esta:
export function handleFormStarHover(event, formRatingStarsContainer) {
    if (!formRatingStarsContainer || !event.target.classList.contains('star-10')) return;

    const hoverValue = parseInt(event.target.dataset.value, 10);
    const stars = formRatingStarsContainer.querySelectorAll('.star-10');

    stars.forEach(star => {
        const starValue = parseInt(star.dataset.value, 10);
        // Añade o quita la clase de previsualización según la posición del mouse
        star.classList.toggle('hover-preview', starValue <= hoverValue);
    });
}

// REEMPLAZA la función handleFormStarMouseOut existente por esta:
export function handleFormStarMouseOut(hiddenRatingInput, formRatingStarsContainer) {
    if (!hiddenRatingInput || !formRatingStarsContainer) return;
    
    // Simplemente restaura la vista al valor que está guardado en el input oculto
    updateFormStarsVisual(hiddenRatingInput.value, formRatingStarsContainer);
}

// --- FIN DE CÓDIGO MODIFICADO ---

export function handleFormStarClick(event, hiddenRatingInput, formRatingStarsContainer) {
    if (event.target.classList.contains('star-10')) {
        const clickedValue = event.target.dataset.value;
        if (hiddenRatingInput) {
            hiddenRatingInput.value = clickedValue;
        }
        if (formRatingStarsContainer) {
            // Ya no es necesaria la clase 'selected-rating', updateFormStarsVisual se encarga de todo.
            updateFormStarsVisual(clickedValue, formRatingStarsContainer);
        }
    }
}

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

