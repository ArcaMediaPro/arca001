// public/adminService.js (ACTUALIZADO Y FINAL)
import { API_BASE_URL } from './appConfig.js';
import { fetchAuthenticated } from './authClient.js';

/**
 * Obtiene todos los usuarios desde el endpoint de administrador.
 */
export async function fetchAllAdminUsers() {
    const response = await fetchAuthenticated(`${API_BASE_URL}/admin/users`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error ${response.status} al obtener usuarios.` }));
        throw new Error(errorData.message || `Error HTTP ${response.status}: No se pudieron obtener los usuarios.`);
    }
    return await response.json();
}

/**
 * Busca usuarios según un criterio a través del endpoint de administrador.
 */
export async function searchAdminUsers(searchParams) {
    const query = new URLSearchParams(searchParams).toString();
    const response = await fetchAuthenticated(`${API_BASE_URL}/admin/users?${query}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error ${response.status} al buscar usuarios.` }));
        throw new Error(errorData.message || `Error HTTP ${response.status}: No se pudo realizar la búsqueda.`);
    }
    return await response.json();
}

/**
 * Actualiza los datos de un usuario a través del endpoint de administrador.
 */
export async function updateAdminUser(userId, userData) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error ${response.status} al actualizar usuario.` }));
        throw new Error(errorData.message || `Error HTTP ${response.status}: No se pudo actualizar el usuario.`);
    }
    return await response.json();
}

/**
 * Elimina un usuario a través del endpoint de administrador.
 */
export async function deleteAdminUser(userId) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error ${response.status} al eliminar usuario.` }));
        throw new Error(errorData.message || `Error HTTP ${response.status}: No se pudo eliminar el usuario.`);
    }
    return await response.json();
}

/**
 * Actualiza el plan de suscripción de un usuario a través del endpoint de administrador.
 */
export async function updateUserPlan(userId, newPlan) {
    if (!userId || !newPlan) {
        throw new Error('Se requieren el ID del usuario y el nuevo plan.');
    }
    const response = await fetchAuthenticated(`${API_BASE_URL}/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: newPlan }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el plan del usuario.');
    }
    return await response.json();
}

/**
 * Obtiene las estadísticas de archivos de Cloudinary para todos los usuarios a través del backend.
 */
export async function fetchCloudinaryStats() {
    const response = await fetchAuthenticated(`${API_BASE_URL}/admin/cloudinary-stats`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error ${response.status} al obtener estadísticas de archivos.` }));
        throw new Error(errorData.message || `Error HTTP ${response.status}: No se pudieron obtener las estadísticas de archivos.`);
    }
    return await response.json();
}

// =================================================================
// === INICIO: NUEVAS FUNCIONES PARA LA GESTIÓN DE LÍMITES DE PLANES ===
// =================================================================

/**
 * Obtiene los límites actuales de los planes desde el backend.
 */
export async function getPlanLimits() {
    const response = await fetchAuthenticated(`${API_BASE_URL}/plans`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error ${response.status} al obtener los límites.` }));
        throw new Error(errorData.message || `Error HTTP ${response.status}: No se pudieron obtener los límites de los planes.`);
    }
    return await response.json();
}

/**
 * Actualiza los límites de los planes en el backend.
 * @param {object} limits - Un objeto con los nuevos límites. Ej: { free: 50, medium: 500 }
 */
export async function updatePlanLimits(limits) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/plans`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(limits),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error ${response.status} al actualizar los límites.` }));
        throw new Error(errorData.message || `Error HTTP ${response.status}: No se pudo actualizar los límites de los planes.`);
    }
    return await response.json();
}
// =================================================================
// === FIN: NUEVAS FUNCIONES                                     ===
// =================================================================
