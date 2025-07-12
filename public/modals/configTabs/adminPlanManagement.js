// modals/configTabs/adminPlanManagement.js
import { getElem } from '../../domUtils.js';
import * as adminService from '../../adminService.js';
import { notificationService } from '../../notificationService.js';

let freePlanLimitInput, mediumPlanLimitInput, savePlanLimitsBtn;

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
    const freeLimit = parseInt(freePlanLimitInput.value, 10);
    const mediumLimit = parseInt(mediumPlanLimitInput.value, 10);

    if (isNaN(freeLimit) || isNaN(mediumLimit) || freeLimit < 1 || mediumLimit < 1) {
        notificationService.error('Los límites deben ser números positivos.');
        return;
    }

    if (!confirm('¿Está seguro de que desea actualizar los límites de los planes? Esta acción afectará a todos los usuarios.')) {
        return;
    }

    savePlanLimitsBtn.disabled = true;
    savePlanLimitsBtn.textContent = 'Guardando...';

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

    if (savePlanLimitsBtn) {
        savePlanLimitsBtn.addEventListener('click', handleSavePlanLimits);
    }
}

export function onAdminPlanTabOpen() {
    // Cada vez que se abre la pestaña, cargamos los datos más recientes.
    loadCurrentPlanLimits();
}
