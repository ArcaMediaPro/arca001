// modals/configTabs/adminTabController.js (VERSIÓN ACTUALIZADA)

// Importa los inicializadores de los submódulos
import { initAdminUserManagement, refreshAdminUserListOnTabOpen } from './adminUserManagement.js';
import { initAdminFileStats, refreshAdminFileStatsOnTabOpen } from './adminFileStats.js';
import { initAdminPlanManagement, onAdminPlanTabOpen } from './adminPlanManagement.js'; // <-- 1. IMPORTAMOS EL NUEVO MÓDULO

/**
 * Inicializa el controlador principal de la pestaña de Administración.
 */
export function initAdminTabController() {
    initAdminUserManagement();
    initAdminFileStats();
    initAdminPlanManagement(); // <-- 2. INICIALIZAMOS EL NUEVO MÓDULO

    console.log("Admin Tab Controller (Director) Initialized");
}

/**
 * Se ejecuta cuando la pestaña de administración se vuelve visible.
 */
export function onAdminTabOpen() {
    refreshAdminUserListOnTabOpen();
    refreshAdminFileStatsOnTabOpen();
    onAdminPlanTabOpen(); // <-- 3. LLAMAMOS A SU FUNCIÓN DE APERTURA
}
