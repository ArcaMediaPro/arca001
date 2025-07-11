// domUtils.js
import { getText } from './i18n.js';

// --- Constantes DOM ---
export let initError = false;

/**
 * Obtiene un elemento por su ID. Opcionalmente busca dentro de un contexto.
 * @param {string} id - El ID del elemento a buscar.
 * @param {boolean} required - Si es true, mostrará error si no se encuentra.
 * @param {Document|HTMLElement} context - Contexto de búsqueda (por defecto, document).
 * @returns {HTMLElement|null}
 */
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

/**
 * Escapa caracteres especiales para insertar texto en HTML.
 * @param {any} unsafe
 * @returns {string}
 */
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

/**
 * Debounce: retrasa la ejecución de una función hasta que haya pasado el tiempo sin nuevas llamadas.
 * @param {Function} func
 * @param {number} wait - milisegundos
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// --- Lógica de Previsualización de Imágenes ---
export function previewImage(fileInput, previewElement) {
  if (!fileInput?.files?.[0]) {
    if (previewElement) previewElement.innerHTML = '';
    return;
  }
  const file = fileInput.files[0];
  if (!file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = e => {
    if (previewElement) {
      previewElement.innerHTML = `
        <img src="${e.target.result}" alt="${getText('domUtils_previewImageAlt')}">
      `;
    }
  };
  reader.readAsDataURL(file);
}

export function handleScreenshotPreview(screenshotsInput, screenshotsPreviewContainer) {
  if (!screenshotsInput || !screenshotsPreviewContainer) return;
  screenshotsPreviewContainer.innerHTML = '';
  const files = Array.from(screenshotsInput.files);
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = getText('domUtils_previewScreenshotAlt')
        .replace('{fileName}', escapeHtml(file.name));
      screenshotsPreviewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// === LÓGICA DE ESTRELLAS (1–10) === //

/**
 * Crea 10 estrellas interactivas dentro del contenedor.
 */
export function createFormStars(formRatingStarsContainer) {
  if (!formRatingStarsContainer) return;
  formRatingStarsContainer.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const star = document.createElement('label');
    star.className = 'star-10';
    star.dataset.value = i;
    star.title = getText('domUtils_starRatingTitle')
      .replace('{rating}', '0');
    formRatingStarsContainer.appendChild(star);
  }
}

/**
 * Actualiza visualmente las estrellas según el rating.
 * @param {number|string} value
 * @param {HTMLElement} container
 */
export function updateFormStarsVisual(value, container) {
  if (!container) return;
  const rating = parseInt(value, 10) || 0;
  const stars = container.querySelectorAll('.star-10');
  stars.forEach(star => {
    const starValue = parseInt(star.dataset.value, 10);
    star.classList.remove('hover');
    star.classList.toggle('active', starValue <= rating);
  });
}

/**
 * Previsualización al pasar el mouse.
 */
export function handleFormStarHover(event, container) {
  if (!container) return;
  const target = event.target;
  if (!target.classList.contains('star-10')) return;
  const hoverValue = parseInt(target.dataset.value, 10);
  const stars = container.querySelectorAll('.star-10');
  stars.forEach(star => {
    const starValue = parseInt(star.dataset.value, 10);
    star.classList.toggle('hover', starValue <= hoverValue);
  });
}

/**
 * Limpia hover al salir del contenedor.
 */
export function handleFormStarMouseOut(container) {
  if (!container) return;
  container.querySelectorAll('.star-10').forEach(star => {
    star.classList.remove('hover');
  });
}

/**
 * Guarda rating al hacer clic y actualiza visual.
 */
export function handleFormStarClick(event, hiddenInput, container) {
  const target = event.target;
  if (!target.classList.contains('star-10')) return;
  const clickedValue = target.dataset.value;
  if (hiddenInput) hiddenInput.value = clickedValue;
  updateFormStarsVisual(clickedValue, container);
}

/**
 * Genera HTML no interactivo para mostrar rating (escala 1–10).
 * @param {number|string} rating
 * @returns {string} HTML
 */
export function generateDisplayStars10(rating) {
  const currentRating = parseInt(rating, 10) || 0;
  const titleText = getText('domUtils_starRatingTitle')
    .replace('{rating}', currentRating.toString());
  const ariaLabelText = getText('domUtils_starRatingAriaLabel')
    .replace('{rating}', currentRating.toString());

  let starsHTML = '';
  for (let i = 1; i <= 10; i++) {
    const isActive = i <= currentRating ? 'active' : '';
    starsHTML += `<label class="star-10 ${isActive}" title="${titleText}"></label>`;
  }
  return `<div class="rating-display-stars-10" aria-label="${ariaLabelText}">${starsHTML}</div>`;
}
