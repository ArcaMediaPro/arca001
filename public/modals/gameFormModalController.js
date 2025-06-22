// proposed_path: modals/gameFormModalController.js
import { getElem } from '../domUtils.js';
// --- NUEVA IMPORTACIÓN ---
import { getText } from '../i18n.js'; // Ajusta la ruta si i18n.js no está un nivel arriba
// --- FIN DE NUEVA IMPORTACIÓN ---

let gameFormModalElement, closeModalBtnGameFormElement, gameFormLegendElement, titleInputInGameForm;
let clearAndResetGameFormCallbackForModal = () => console.warn('clearAndResetGameFormCallbackForModal not set in gameFormModalController.js');

export function initGameFormModalController(clearFormCb) {
    gameFormModalElement = getElem('gameFormModal');
    if (!gameFormModalElement) {
        console.error("CRITICAL: Elemento gameFormModal no encontrado.");
        return;
    }
    closeModalBtnGameFormElement = gameFormModalElement.querySelector('.close-game-form');
    gameFormLegendElement = getElem('gameFormLegend'); // Ya obtenías la referencia aquí
    titleInputInGameForm = getElem('title'); 

    const clearBtnInModal = getElem('clearFormBtnInModal');
    const cancelBtnInModal = getElem('cancelFormBtnInModal');

    if (closeModalBtnGameFormElement) closeModalBtnGameFormElement.addEventListener('click', closeGameFormModal);
    gameFormModalElement.addEventListener('click', (event) => {
        if (event.target === gameFormModalElement) closeGameFormModal();
    });

    if (typeof clearFormCb === 'function') {
        clearAndResetGameFormCallbackForModal = clearFormCb;
    }
    if (clearBtnInModal) {
        clearBtnInModal.addEventListener('click', () => {
            if (typeof clearAndResetGameFormCallbackForModal === 'function') {
                clearAndResetGameFormCallbackForModal();
            }
        });
    }
    if (cancelBtnInModal) cancelBtnInModal.addEventListener('click', closeGameFormModal);

    console.log("Game Form Modal Controller Initialized");
}

export function openGameFormModal(isEditing = false) {
    if (!gameFormModalElement) { console.error("ERROR: gameFormModalElement es null."); return; }
    
    // --- MODIFICACIÓN PARA TRADUCIR TEXTOS DINÁMICOS ---
    if (gameFormLegendElement) {
        gameFormLegendElement.textContent = isEditing ? getText('gameForm_legend_update') : getText('gameForm_legend_addNew');
    }
    
    const submitButton = gameFormModalElement.querySelector('#submitGameFormBtn');
    if (submitButton) {
        const img = submitButton.querySelector('img');
        if (img) {
            // La imagen en sí no cambia, pero su 'alt' text sí
            img.alt = isEditing ? getText('gameForm_altSubmit_edit') : getText('gameForm_altSubmit_add');
        }
        // El 'title' del botón (tooltip) también cambia
        submitButton.title = isEditing ? getText('gameForm_titleSubmit_edit') : getText('gameForm_titleSubmit_add');
    }
    // --- FIN DE MODIFICACIÓN ---

    gameFormModalElement.style.display = 'flex';
    const modalContent = gameFormModalElement.querySelector('.modal-content');
    if (modalContent) modalContent.scrollTop = 0;

    if (titleInputInGameForm) {
        setTimeout(() => {
            titleInputInGameForm.focus();
        }, 100); 
    }
    console.log(`Game Form Modal Opened (Editing: ${isEditing})`);
}

export function closeGameFormModal() {
    if (gameFormModalElement) gameFormModalElement.style.display = 'none';
    else console.error("ERROR: closeGameFormModal llamada, pero gameFormModalElement es null.");
    console.log("Game Form Modal Closed");
}