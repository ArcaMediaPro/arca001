// proposed_path: modals/imageGalleryModal.js
import { getElem, debounce } from '../domUtils.js'; // Ajusta la ruta

let imageModalElement, imageModalContentElement, galleryIndicatorElement,
    prevGalleryButtonElement, nextGalleryButtonElement, closeImageModalBtnElement;

let currentGalleryScreenshots = [];
let currentGalleryIndex = -1;

function updateGalleryButtonPositions() {
    if (!imageModalElement || !imageModalContentElement || !prevGalleryButtonElement || !nextGalleryButtonElement || !imageModalElement.classList.contains('has-gallery') || currentGalleryScreenshots.length <=1 ) {
        if(prevGalleryButtonElement) prevGalleryButtonElement.style.visibility = 'hidden';
        if(nextGalleryButtonElement) nextGalleryButtonElement.style.visibility = 'hidden';
        return;
    }
    prevGalleryButtonElement.style.visibility = 'visible'; nextGalleryButtonElement.style.visibility = 'visible';
    if (imageModalContentElement.clientWidth === 0 || imageModalContentElement.clientHeight === 0) return;
    const modalRect = imageModalElement.getBoundingClientRect();
    const imageRect = imageModalContentElement.getBoundingClientRect();
    const topPos = imageRect.top + (imageRect.height / 2) - (prevGalleryButtonElement.offsetHeight / 2) - modalRect.top;
    prevGalleryButtonElement.style.top = `${topPos}px`; nextGalleryButtonElement.style.top = `${topPos}px`;
    const gap = 10;
    prevGalleryButtonElement.style.left = `${Math.max(0, imageRect.left - prevGalleryButtonElement.offsetWidth - gap - modalRect.left)}px`;
    const rightSpace = modalRect.width - (imageRect.right - modalRect.left);
    nextGalleryButtonElement.style.right = `${Math.max(0, rightSpace - nextGalleryButtonElement.offsetWidth - gap)}px`;
}

const debouncedUpdateGalleryButtons = debounce(updateGalleryButtonPositions, 50);

function displayCurrentGalleryImage() {
    if (!imageModalContentElement || currentGalleryScreenshots.length === 0 || currentGalleryIndex < 0) {
        if(prevGalleryButtonElement) prevGalleryButtonElement.style.visibility = 'hidden';
        if(nextGalleryButtonElement) nextGalleryButtonElement.style.visibility = 'hidden';
        if(galleryIndicatorElement) galleryIndicatorElement.style.display = 'none';
        return;
    }
    imageModalContentElement.src = currentGalleryScreenshots[currentGalleryIndex];
    imageModalContentElement.alt = `Imagen ${currentGalleryIndex + 1}/${currentGalleryScreenshots.length}`;
    const showNav = currentGalleryScreenshots.length > 1;
    if(galleryIndicatorElement) { galleryIndicatorElement.textContent = `${currentGalleryIndex + 1} / ${currentGalleryScreenshots.length}`; galleryIndicatorElement.style.display = showNav ? 'block' : 'none'; }
    if(prevGalleryButtonElement) { prevGalleryButtonElement.disabled = currentGalleryIndex === 0; prevGalleryButtonElement.style.visibility = showNav ? 'visible' : 'hidden'; }
    if(nextGalleryButtonElement) { nextGalleryButtonElement.disabled = currentGalleryIndex === currentGalleryScreenshots.length - 1; nextGalleryButtonElement.style.visibility = showNav ? 'visible' : 'hidden'; }
    debouncedUpdateGalleryButtons();
}

function navigateGalleryManual(direction) {
    if (currentGalleryScreenshots.length <= 1) return;
    if (direction === "prev" && currentGalleryIndex > 0) currentGalleryIndex--;
    else if (direction === "next" && currentGalleryIndex < currentGalleryScreenshots.length - 1) currentGalleryIndex++;
    displayCurrentGalleryImage();
}

function handleGalleryNavigation(event) {
    if (imageModalElement && imageModalElement.style.display === 'flex' && imageModalElement.classList.contains('has-gallery')) {
        if (event.key === "ArrowLeft") navigateGalleryManual("prev");
        else if (event.key === "ArrowRight") navigateGalleryManual("next");
    }
}

function handleCloseImageModalOnClickOutside(event) {
    if (event.target === imageModalElement) closeImageModal();
}

export function initImageGalleryModal() {
    imageModalElement = getElem('imageModal');
    if (!imageModalElement) {
        console.error("CRITICAL: Elemento imageModal no encontrado.");
        return;
    }
    imageModalContentElement = getElem('imageModalContent');
    galleryIndicatorElement = getElem('galleryIndicator');
    prevGalleryButtonElement = imageModalElement.querySelector('.gallery-nav-button.prev');
    nextGalleryButtonElement = imageModalElement.querySelector('.gallery-nav-button.next');
    closeImageModalBtnElement = imageModalElement.querySelector('.close');

    if (closeImageModalBtnElement) closeImageModalBtnElement.addEventListener('click', closeImageModal);
    if (prevGalleryButtonElement) prevGalleryButtonElement.addEventListener('click', () => navigateGalleryManual('prev'));
    if (nextGalleryButtonElement) nextGalleryButtonElement.addEventListener('click', () => navigateGalleryManual('next'));
    imageModalElement.addEventListener('click', handleCloseImageModalOnClickOutside);
    document.addEventListener('keydown', handleGalleryNavigation);
    window.addEventListener('resize', debouncedUpdateGalleryButtons);
    console.log("Image Gallery Modal Initialized");
}

export function openImageModal(imageOrPathArray, typeOrIndex = 0, isGallery = false) {
    if (!imageModalElement || !imageModalContentElement || !galleryIndicatorElement || !prevGalleryButtonElement || !nextGalleryButtonElement) return;
    currentGalleryScreenshots = []; currentGalleryIndex = -1;
    if (isGallery && Array.isArray(imageOrPathArray) && imageOrPathArray.length > 0) {
        currentGalleryScreenshots = imageOrPathArray.filter(url => url);
        currentGalleryIndex = parseInt(typeOrIndex) || 0;
        if (currentGalleryIndex < 0 || currentGalleryIndex >= currentGalleryScreenshots.length) currentGalleryIndex = 0;
        if (currentGalleryScreenshots.length === 0) { closeImageModal(); return; }
        imageModalElement.classList.add('has-gallery');
        displayCurrentGalleryImage();
    } else if (!isGallery && typeof imageOrPathArray === 'string') {
        imageModalContentElement.src = imageOrPathArray;
        imageModalContentElement.alt = `Imagen ampliada: ${typeOrIndex}`;
        imageModalElement.classList.remove('has-gallery');
        prevGalleryButtonElement.style.visibility = 'hidden';
        nextGalleryButtonElement.style.visibility = 'hidden';
        galleryIndicatorElement.style.display = 'none';
    } else { return; }
    imageModalElement.style.display = 'flex';
    debouncedUpdateGalleryButtons();
}

export function showImageGallery(imagesArray, startIndex) { // Alias
    openImageModal(imagesArray, startIndex, true);
}

export function closeImageModal() {
    if (imageModalElement) {
        imageModalElement.style.display = 'none';
        if(imageModalContentElement) {imageModalContentElement.src = ""; imageModalContentElement.alt = "";}
        currentGalleryScreenshots = []; currentGalleryIndex = -1;
        imageModalElement.classList.remove('has-gallery');
        if(galleryIndicatorElement) galleryIndicatorElement.style.display = 'none';
        if(prevGalleryButtonElement) prevGalleryButtonElement.style.visibility = 'hidden';
        if(nextGalleryButtonElement) nextGalleryButtonElement.style.visibility = 'hidden';
    }
    console.log("Image Gallery Modal Closed");
}