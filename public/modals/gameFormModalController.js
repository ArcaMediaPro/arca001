import { getElem } from '../domUtils.js';
import { getText } from '../i18n.js';

let gameFormModal, gameFormElement, gameFormLegend, closeButtons;
let clearFormCallback = () => {};
let isFormDirty = false; // 1. Flag para detectar cambios

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

export function initGameFormModalController(clearCb) {
    gameFormModal = getElem('gameFormModal');
    if (!gameFormModal) return;

    gameFormElement = getElem('gameForm', true, gameFormModal);
    gameFormLegend = getElem('gameFormLegend', true, gameFormModal);
    closeButtons = gameFormModal.querySelectorAll('.close-game-form');

    if (typeof clearCb === 'function') {
        clearFormCallback = clearCb;
    }

    // 2. Añadimos listeners para detectar cualquier cambio en el formulario
    if (gameFormElement) {
        gameFormElement.addEventListener('input', setFormDirty);
        gameFormElement.addEventListener('change', setFormDirty); // Para selects y checkboxes
    }

    closeButtons.forEach(btn => btn.addEventListener('click', () => {
        // Verificamos si hay cambios antes de cerrar con el botón
        if (isFormDirty) {
            if (confirm(getText('gameForm_confirmCloseDirty'))) {
                closeGameFormModal();
            }
        } else {
            closeGameFormModal();
        }
    }));

    gameFormModal.addEventListener('click', (event) => {
        if (event.target === gameFormModal) {
            // 3. Verificamos si hay cambios antes de cerrar haciendo clic fuera
            if (isFormDirty) {
                if (confirm(getText('gameForm_confirmCloseDirty'))) {
                    closeGameFormModal();
                }
            } else {
                closeGameFormModal();
            }
        }
    });
}

export function openGameFormModal(isEditing = false) {
    if (!gameFormModal || !gameFormLegend) return;
    
    resetFormDirtyState(); // 4. Reseteamos el estado al abrir el modal

    const legendKey = isEditing ? 'gameForm_legend_edit' : 'gameForm_legend_add';
    gameFormLegend.textContent = getText(legendKey);
    
    // Si la función para actualizar campos de formato existe, la llamamos
    if (typeof gameFormModal.updateFormatFields === 'function') {
        gameFormModal.updateFormatFields();
    }

    gameFormModal.style.display = 'block';
}

export function closeGameFormModal() {
    if (!gameFormModal) return;
    
    gameFormModal.style.display = 'none';
    clearFormCallback();
    resetFormDirtyState(); // 5. Reseteamos el estado al cerrar
}