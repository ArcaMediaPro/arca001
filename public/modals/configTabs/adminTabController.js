// modals/configTabs/adminTabController.js (VERSIÓN CORREGIDA Y REESTRUCTURADA)

// Importa los inicializadores de los submódulos de la pestaña de administración
import { initAdminUserManagement, refreshAdminUserListOnTabOpen } from './adminUserManagement.js';
import { initAdminFileStats, refreshAdminFileStatsOnTabOpen } from './adminFileStats.js';

/**
 * Inicializa el controlador principal de la pestaña de Administración.
 * Su única responsabilidad es llamar a los inicializadores de sus componentes.
 */
export function initAdminTabController() {
    // Inicializa el componente de gestión de usuarios, que contiene toda la lógica detallada.
    initAdminUserManagement();
    
    // Inicializa el componente de estadísticas de archivos.
    initAdminFileStats();

    console.log("Admin Tab Controller (Director) Initialized");
}

/**
 * Se ejecuta cuando la pestaña de administración se vuelve visible.
 * Llama a las funciones de refresco de sus componentes para resetear su estado.
 */
export function onAdminTabOpen() {
    // Refresca la vista del componente de gestión de usuarios.
    refreshAdminUserListOnTabOpen();

    // Refresca la vista del componente de estadísticas de archivos.
    refreshAdminFileStatsOnTabOpen();
}