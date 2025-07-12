// modals/configTabs/adminPlanManagement.js
import { getElem } from '../../domUtils.js';
import * as adminService from '../../adminService.js';
import { notificationService } from '../../notificationService.js';
// --- INICIO DE LA CORRECCIÓN ---
// Importamos las funciones de autenticación necesarias.
import { getCurrentUserRole, checkAuthStatus } from '../../authClient.js';
// --- FIN DE LA CORRECCIÓN ---

let freePlanLimitInput, mediumPlanLimitInput, savePlanLimitsBtn, adminPlanMessageElement;

async function loadCurrentPlanLimits() {
    try {
        const limits = await adminService.getPlanLimits();
        if (freePlanLimitInput) {
            freePlanLimitInput.value = limits.free;
        }
        if (mediumPlanLimitInput) {
            mediumPlanLimitInput.value = limits.medium;
        }
    } catch (error) {
        notificationService.error('No se pudieron cargar los límites de los planes.');
        console.error("Error fetching plan limits:", error);
    }
}

async function handleSavePlanLimits() {
    if (getCurrentUserRole() !== 'admin') {
        notificationService.error('Acción no permitida. Se requieren derechos de administrador.');
        return;
    }

    const freeLimitValue = freePlanLimitInput.value.trim();
    const mediumLimitValue = mediumPlanLimitInput.value.trim();
    
    const limitsToUpdate = {};

    if (freeLimitValue !== '') {
        const freeLimit = parseInt(freeLimitValue, 10);
        if (isNaN(freeLimit) || freeLimit < 0) { // Permitimos 0
            notificationService.error('El límite para el Plan Gratuito debe ser un número igual o mayor a 0.');
            return;
        }
        limitsToUpdate.free = freeLimit;
    }

    if (mediumLimitValue !== '') {
        const mediumLimit = parseInt(mediumLimitValue, 10);
        if (isNaN(mediumLimit) || mediumLimit < 1) {
            notificationService.error('El límite para el Plan Medium debe ser un número positivo.');
            return;
        }
        limitsToUpdate.medium = mediumLimit;
    }

    if (Object.keys(limitsToUpdate).length === 0) {
        notificationService.warn('No se ha modificado ningún límite.');
        return;
    }

    if (!confirm('¿Está seguro de que desea actualizar los límites de los planes? Esta acción afectará a todos los usuarios.')) {
        return;
    }

    savePlanLimitsBtn.disabled = true;
    savePlanLimitsBtn.textContent = 'Guardando...';
    if (adminPlanMessageElement) adminPlanMessageElement.style.display = 'none';

    try {
        await adminService.updatePlanLimits(limitsToUpdate);
        notificationService.success('Límites de los planes actualizados correctamente.');

        // --- INICIO DE LA CORRECCIÓN ---
        // Después de una acción de admin exitosa, refrescamos el estado de autenticación
        // para asegurar que el frontend tenga la información más reciente.
        await checkAuthStatus();
        // --- FIN DE LA CORRECCIÓN ---

    } catch (error) {
        notificationService.error(`Error al guardar los límites: ${error.message}`);
    } finally {
        savePlanLimitsBtn.disabled = false;
        savePlanLimitsBtn.textContent = 'Guardar Cambios';
    }
}

export function initAdminPlanManagement() {
    freePlanLimitInput = getElem('adminFreePlanLimit', false);
    mediumPlanLimitInput = getElem('adminMediumPlanLimit', false);
    savePlanLimitsBtn = getElem('adminSavePlanLimitsBtn', false);
    adminPlanMessageElement = getElem('adminPlanMessage', false);

    if (savePlanLimitsBtn) {
        savePlanLimitsBtn.addEventListener('click', handleSavePlanLimits);
    }
}

export function onAdminPlanTabOpen() {
    loadCurrentPlanLimits();
}
