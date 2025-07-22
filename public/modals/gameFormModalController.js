// modals/gameFormModalController.js (CORREGIDO Y MEJORADO)
import { getElem } from '../domUtils.js';
import { getText } from '../i18n.js';

let gameFormModal, gameFormElement, gameFormLegend, titleInput, closeModalButtons, cancelBtnInModal;
let clearAndResetGameFormCallback = () => {};
let isFormDirty = false; // Flag para detectar cambios

/**
 * Marca el formulario como "modificado".
 */
function setFormDirty() {
    isFormDirty = true;
}

/**
 * Resetea el estado del formulario a "sin modificar".
 */
function resetFormDirtyState() {
    isFormDirty = false;
}

/**
 * Función centralizada para intentar cerrar el modal.
 * Pregunta al usuario si el formulario tiene cambios.
 */
function attemptToCloseModal() {
    if (isFormDirty) {
        if (confirm(getText('gameForm_confirmCloseDirty'))) {
            closeGameFormModal();
        }
    } else {
        closeGameFormModal();
    }
}

export function initGameFormModalController(clearFormCb) {
    gameFormModal = getElem('gameFormModal');
    if (!gameFormModal) {
        console.error("CRITICAL: Elemento gameFormModal no encontrado.");
        return;
    }

    gameFormElement = getElem('gameForm', true, gameFormModal);
    gameFormLegend = getElem('gameFormLegend', true, gameFormModal);
    titleInput = getElem('title');
    closeModalButtons = gameFormModal.querySelectorAll('.close-game-form');
    cancelBtnInModal = getElem('cancelFormBtnInModal');
    const clearBtnInModal = getElem('clearFormBtnInModal');

    // --- Listeners para detectar cambios ---
    if (gameFormElement) {
        gameFormElement.addEventListener('input', setFormDirty);
        gameFormElement.addEventListener('change', setFormDirty); // Para selects, checkboxes, etc.
    }

    // --- Listeners para cerrar el modal ---
    closeModalButtons.forEach(btn => btn.addEventListener('click', attemptToCloseModal));
    if (cancelBtnInModal) cancelBtnInModal.addEventListener('click', attemptToCloseModal);

    // Click fuera del modal
    gameFormModal.addEventListener('click', (event) => {
        if (event.target === gameFormModal) {
            attemptToCloseModal();
        }
    });

    // --- Otros botones ---
    if (typeof clearFormCb === 'function') {
        clearAndResetGameFormCallback = clearFormCb;
    }
    if (clearBtnInModal) {
        clearBtnInModal.addEventListener('click', () => {
            if (typeof clearAndResetGameFormCallback === 'function') {
                clearAndResetGameFormCallback();
                // Opcional: si quieres que el botón "Limpiar" también marque el form como sucio
                // setFormDirty(); 
            }
        });
    }
}

export function openGameFormModal(isEditing = false) {
    if (!gameFormModal) return;

    resetFormDirtyState(); // Siempre resetea el estado al abrir

    // --- Restauración de traducciones ---
    if (gameFormLegend) {
        gameFormLegend.textContent = isEditing ? getText('gameForm_legend_update') : getText('gameForm_legend_addNew');
    }
    
    const submitButton = gameFormModal.querySelector('#submitGameFormBtn');
    if (submitButton) {
        const img = submitButton.querySelector('img');
        if (img) {
            img.alt = isEditing ? getText('gameForm_altSubmit_edit') : getText('gameForm_altSubmit_add');
        }
        submitButton.title = isEditing ? getText('gameForm_titleSubmit_edit') : getText('gameForm_titleSubmit_add');
    }
    // --- Fin de restauración de traducciones ---

    // **LA CORRECCIÓN CLAVE PARA EL CENTRADO**
    gameFormModal.style.display = 'flex'; 

    const modalContent = gameFormModal.querySelector('.modal-content');
    if (modalContent) modalContent.scrollTop = 0;

    if (titleInput) {
        setTimeout(() => titleInput.focus(), 100);
    }
}

export function closeGameFormModal() {
    if (!gameFormModal) return;
    
    gameFormModal.style.display = 'none';
    resetFormDirtyState(); // Resetea el estado al cerrar
    
    // Llama al callback de limpieza si existe
    if (typeof clearAndResetGameFormCallback === 'function') {
        clearAndResetGameFormCallback();
    }
}