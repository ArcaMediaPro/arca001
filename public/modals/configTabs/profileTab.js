// modals/configTabs/profileTab.js (VERSIÓN COMPLETA Y FUNCIONAL)

import { getElem, escapeHtml } from '../../domUtils.js';
// Importamos la función para cambiar la contraseña y los datos del usuario actual
import { submitChangePassword, currentLoggedInUsername, getCurrentUserEmail } from '../../authClient.js';
import { notificationService } from '../../notificationService.js';

// Referencias a los elementos del DOM de esta pestaña
let configProfileUsernameSpan, configProfileEmailSpan,
    configChangePasswordForm, configCurrentPasswordInput, configNewPasswordInput,
    configConfirmNewPasswordInput;

/**
 * Maneja el envío del formulario de cambio de contraseña.
 * @param {Event} event - El evento de envío del formulario.
 */
async function handlePasswordChangeSubmit(event) {
    event.preventDefault(); // Evitar que la página se recargue

    if (!configCurrentPasswordInput || !configNewPasswordInput || !configConfirmNewPasswordInput) {
        notificationService.error("Error de formulario interno. No se pudieron encontrar los campos de contraseña.");
        return;
    }
    
    // Obtener los valores de los campos
    const currentPassword = configCurrentPasswordInput.value;
    const newPassword = configNewPasswordInput.value;
    const confirmNewPassword = configConfirmNewPasswordInput.value;
    
    const submitButton = configChangePasswordForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    // Llamar a la función del servicio de autenticación que hace el trabajo pesado
    // Esta función ya maneja la validación y la comunicación con el backend.
    const result = await submitChangePassword(currentPassword, newPassword, confirmNewPassword, 'configChangePasswordMessage');
    
    if (submitButton) submitButton.disabled = false;
    
    // Si el cambio fue exitoso, limpiar el formulario
    if (result && result.success) {
        configChangePasswordForm.reset();
        // Opcionalmente, mostrar una notificación global de éxito
        notificationService.success("¡Tu contraseña ha sido actualizada con éxito!");
    }
}

/**
 * Inicializa los elementos y eventos de la pestaña "Mi Perfil".
 */
export function initProfileTab() {
    configProfileUsernameSpan = getElem('configProfileUsername', false);
    configProfileEmailSpan = getElem('configProfileEmail', false);
    configChangePasswordForm = getElem('configChangePasswordForm', false);

    if (configChangePasswordForm) {
        // Obtener referencias a los inputs dentro del formulario
        configCurrentPasswordInput = configChangePasswordForm.querySelector('#configCurrentPassword');
        configNewPasswordInput = configChangePasswordForm.querySelector('#configNewPassword');
        configConfirmNewPasswordInput = configChangePasswordForm.querySelector('#configConfirmNewPassword');
        
        // Asignar el manejador de eventos al envío del formulario
        configChangePasswordForm.addEventListener('submit', handlePasswordChangeSubmit);
    }
    console.log("Profile Tab Initialized");
}

/**
 * Rellena los datos del perfil y resetea el formulario cada vez que se abre el modal.
 */
export function populateProfileTabDataOnOpen() {
    const username = currentLoggedInUsername;
    const email = getCurrentUserEmail();

    // Rellenar nombre de usuario y email
    if (configProfileUsernameSpan) {
        configProfileUsernameSpan.textContent = username ? escapeHtml(username) : 'No disponible';
    }
    if (configProfileEmailSpan) {
        configProfileEmailSpan.textContent = email ? escapeHtml(email) : 'No disponible';
    }

    // Limpiar el formulario de contraseña y cualquier mensaje de error anterior
    if (configChangePasswordForm) {
        configChangePasswordForm.reset();
    }
    const messageDiv = getElem('configChangePasswordMessage', false);
    if(messageDiv) {
        messageDiv.textContent = '';
        messageDiv.style.display = 'none';
    }
}