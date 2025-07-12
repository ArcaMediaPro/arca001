// modals/configTabs/adminPlanManagement.js
import { getElem } from '../../domUtils.js';
import * as adminService from '../../adminService.js';
import { notificationService } from '../../notificationService.js';

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
    // --- INICIO DE LA CORRECCIÓN: Validación Mejorada ---
    if (!freePlanLimitInput || !mediumPlanLimitInput) {
        notificationService.error('Error interno: No se encontraron los campos de los límites.');
        return;
    }

    const freeLimitValue = freePlanLimitInput.value;
    const mediumLimitValue = mediumPlanLimitInput.value;

    const freeLimit = parseInt(freeLimitValue, 10);
    const mediumLimit = parseInt(mediumLimitValue, 10);

    // Verificación más específica
    if (isNaN(freeLimit) || freeLimit < 1) {
        notificationService.error('El límite para el Plan Gratuito debe ser un número positivo.');
        return;
    }
    if (isNaN(mediumLimit) || mediumLimit < 1) {
        notificationService.error('El límite para el Plan Medium debe ser un número positivo.');
        return;
    }
    // --- FIN DE LA CORRECCIÓN ---

    if (!confirm('¿Está seguro de que desea actualizar los límites de los planes? Esta acción afectará a todos los usuarios.')) {
        return;
    }

    savePlanLimitsBtn.disabled = true;
    savePlanLimitsBtn.textContent = 'Guardando...';
    if (adminPlanMessageElement) adminPlanMessageElement.style.display = 'none';

    try {
        await adminService.updatePlanLimits({ free: freeLimit, medium: mediumLimit });
        notificationService.success('Límites de los planes actualizados correctamente.');
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
    // Cada vez que se abre la pestaña, cargamos los datos más recientes.
    loadCurrentPlanLimits();
}
