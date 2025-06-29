// gameService.js
import { API_BASE_URL } from './appConfig.js';
import { fetchAuthenticated } from './authClient.js';

/**
 * Obtiene juegos del backend, ahora con paginación, filtros y ordenación.
 * @param {number} page - El número de página a solicitar.
 * @param {number} limit - La cantidad de juegos por página.
 * @param {object} filters - Un objeto con los filtros a aplicar.
 * @param {string} filters.searchTerm - Término de búsqueda para el título.
 * @param {string} filters.genre - Género a filtrar.
 * @param {string} filters.platform - Plataforma a filtrar.
 * @param {string} filters.year - Año a filtrar.
 * @param {string} sortOrder - El criterio de ordenación (ej. 'title-asc').
 * @returns {Promise<Object>} Una promesa que resuelve a un objeto con los juegos y datos de paginación.
 * @throws {Error} Si la respuesta de la red no es OK.
 */
export async function fetchAllGames(page = 1, limit = 20, filters = {}, sortOrder = '') {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    if (filters.searchTerm) {
        queryParams.append('search', filters.searchTerm);
    }
    if (filters.genre) {
        queryParams.append('genre', filters.genre);
    }
    if (filters.platform) {
        queryParams.append('platform', filters.platform);
    }
    if (filters.year) {
        queryParams.append('year', filters.year);
    }
    if (sortOrder) {
        queryParams.append('sort', sortOrder);
    }

    const response = await fetchAuthenticated(`${API_BASE_URL}/games?${queryParams.toString()}`);
    if (!response.ok) {
        let errorMsg = `Error HTTP ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg += `: ${errData.message || 'Error desconocido del servidor'}`;
        } catch (e) {
            const textError = await response.text().catch(() => response.statusText);
            errorMsg += `: ${textError || response.statusText}`;
        }
        throw new Error(errorMsg);
    }
    const responseData = await response.json();
    // Asegurar que los campos de préstamo existan en los datos devueltos,
    // con valores por defecto si no están presentes.
    if (responseData.games && Array.isArray(responseData.games)) {
        responseData.games = responseData.games.map(game => ({
            ...game,
            isLoaned: game.isLoaned || false,
            loanedTo: game.loanedTo || '',
            loanDate: game.loanDate || null
        }));
    }
    return responseData;
}

/**
 * Obtiene un resumen de todas las plataformas y sus conteos de juegos.
 * @returns {Promise<Array<object>>} Una promesa que resuelve a un array de objetos con { platform: string, count: number }.
 * @throws {Error} Si la respuesta de la red no es OK.
 */
export async function fetchAllPlatformSummaries() {
    const response = await fetchAuthenticated(`${API_BASE_URL}/games/platforms-summary`);
    if (!response.ok) {
        let errorMsg = `Error HTTP ${response.status} (${response.statusText})`;
        let detailedError = `El servidor respondió con un estado ${response.status} pero no proporcionó detalles adicionales en el cuerpo de la respuesta.`;

        try {
            const errData = await response.json();
            console.error("Respuesta de error del servidor (JSON) para platforms-summary:", errData);
            if (errData && errData.message) {
                detailedError = errData.message;
            } else if (typeof errData === 'object' && errData !== null) {
                detailedError = JSON.stringify(errData);
            } else if (errData) {
                detailedError = String(errData);
            }
        } catch (jsonError) {
            try {
                const textData = await response.text();
                console.error("Respuesta de error del servidor (TEXT) para platforms-summary:", textData);
                if (textData) {
                    detailedError = textData;
                }
            } catch (textError) {
                console.error("No se pudo leer el cuerpo de la respuesta de error como JSON ni como Texto.", textError);
            }
        }
        errorMsg += `: ${detailedError}`;
        throw new Error(errorMsg);
    }
    return await response.json();
}


/**
 * Obtiene los detalles de un juego específico por su ID.
 * @param {string} gameId - El ID del juego a obtener.
 * @returns {Promise<Object>} Una promesa que resuelve al objeto del juego.
 * @throws {Error} Si la respuesta de la red no es OK.
 */
export async function fetchGameById(gameId) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/games/${gameId}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error ${response.status} - No se pudo leer el cuerpo del error.` }));
        const errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
    }
    const gameData = await response.json();
    // Asegurar campos de préstamo con valores por defecto si no vienen
    return {
        ...gameData,
        isLoaned: gameData.isLoaned || false,
        loanedTo: gameData.loanedTo || '',
        loanDate: gameData.loanDate || null
    };
}

/**
 * Crea un nuevo juego.
 * @param {FormData} formData - Los datos del juego en un objeto FormData.
 * @returns {Promise<Object>} Una promesa que resuelve al objeto del juego creado.
 * @throws {Error} Si la respuesta de la red no es OK.
 */
export async function createGame(formData) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/games`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (jsonError) {
            errorData = { message: `Error ${response.status} - ${response.statusText}. El cuerpo de la respuesta no es JSON.` };
        }
        // Añadir manejo de errores de validación específicos
        const serverErrorMessage = errorData.errors && Array.isArray(errorData.errors)
            ? errorData.errors.map(e => e.msg || JSON.stringify(e)).join(', ')
            : (errorData.message || 'Error desconocido del servidor.');
        
        const errorToThrow = new Error(serverErrorMessage);
        if (errorData.errors) errorToThrow.errors = errorData.errors; // Adjuntar errores específicos si existen
        throw errorToThrow;
    }
    return await response.json();
}

/**
 * Actualiza un juego existente.
 * @param {string} gameId - El ID del juego a actualizar.
 * @param {FormData} formData - Los datos del juego en un objeto FormData.
 * @returns {Promise<Object>} Una promesa que resuelve al objeto del juego actualizado.
 * @throws {Error} Si la respuesta de la red no es OK.
 */
export async function updateGame(gameId, formData) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/games/${gameId}`, {
        method: 'PUT',
        body: formData
    });
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (jsonError) {
            errorData = { message: `Error ${response.status} - ${response.statusText}. El cuerpo de la respuesta no es JSON.` };
        }
        const serverErrorMessage = errorData.errors && Array.isArray(errorData.errors)
            ? errorData.errors.map(e => e.msg || JSON.stringify(e)).join(', ')
            : (errorData.message || 'Error desconocido del servidor.');
        
        const errorToThrow = new Error(serverErrorMessage);
        if (errorData.errors) errorToThrow.errors = errorData.errors; // Adjuntar errores específicos si existen
        throw errorToThrow;
    }
    return await response.json();
}

/**
 * Elimina un juego por su ID.
 * @param {string} gameId - El ID del juego a eliminar.
 * @returns {Promise<Object>} Una promesa que resuelve a la respuesta del servidor (usualmente un mensaje de éxito).
 * @throws {Error} Si la respuesta de la red no es OK.
 */
export async function deleteGameById(gameId) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/games/${gameId}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg += `: ${errorData.message || 'Error desconocido'}`;
        } catch (e) { /* No hacer nada si el cuerpo del error no es JSON */ }
        throw new Error(errorMsg);
    }
    try {
        return await response.json();
    } catch (e) {
        return { message: 'Juego eliminado correctamente (sin contenido en respuesta)' };
    }
}

/**
 * Restaura un juego (vuelve a crearlo).
 * Esta función es específica para la lógica de "deshacer eliminación".
 * Asume que gameData es un objeto JS plano, no FormData.
 * @param {Object} gameData - Los datos del juego a restaurar.
 * @returns {Promise<Object>} Una promesa que resuelve al objeto del juego restaurado/creado.
 * @throws {Error} Si la respuesta de la red no es OK.
 */
export async function restoreGame(gameData) {
    // Preparar gameData para enviar como JSON
    let processedGameData = { ...gameData }; // Clonar para no modificar el original

    if (processedGameData.systemRequirements && typeof processedGameData.systemRequirements !== 'object') {
        try {
            processedGameData.systemRequirements = JSON.parse(String(processedGameData.systemRequirements));
        } catch (e) {
             console.warn("No se pudo parsear systemRequirements para restaurar, usando objeto vacío:", processedGameData.title, e);
            processedGameData.systemRequirements = {};
        }
    } else if (!processedGameData.systemRequirements) {
        processedGameData.systemRequirements = {};
    }

    if (processedGameData.hasOwnProperty('multiplayer')) {
        processedGameData.multiplayer = Boolean(processedGameData.multiplayer === true || String(processedGameData.multiplayer).toLowerCase() === 'sí' || String(processedGameData.multiplayer).toLowerCase() === 'true');
    }

    // --- INCLUIR LÓGICA PARA CAMPOS DE PRÉSTAMO AL RESTAURAR ---
    if (processedGameData.hasOwnProperty('isLoaned')) {
        processedGameData.isLoaned = Boolean(processedGameData.isLoaned === true || String(processedGameData.isLoaned).toLowerCase() === 'true');
        if (!processedGameData.isLoaned) {
            // Si no está prestado, limpiar los campos relacionados
            processedGameData.loanedTo = '';
            processedGameData.loanDate = null;
        } else {
            // Asegurar que loanDate sea un formato de fecha válido o null
            // Si viene de la base de datos, ya debería estar en formato correcto (ISO String) o null
            processedGameData.loanDate = processedGameData.loanDate ? new Date(processedGameData.loanDate).toISOString() : null;
        }
    } else {
        // Si no viene la propiedad, asumir valores por defecto para una restauración limpia
        processedGameData.isLoaned = false;
        processedGameData.loanedTo = '';
        processedGameData.loanDate = null;
    }
    // --- FIN DE LÓGICA PARA CAMPOS DE PRÉSTAMO ---

    const response = await fetchAuthenticated(`${API_BASE_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedGameData)
    });

    if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg += `: ${errorData.message || 'Error desconocido del servidor al restaurar'}`;
        } catch (e) { /* No hacer nada */ }
        throw new Error(errorMsg);
    }
    return await response.json();
}

/**
 * Deletes specified screenshots from a game.
 * @param {string} gameId - The ID of the game.
 * @param {string[]} screenshotPaths - An array of screenshot paths to delete.
 * @returns {Promise<Object>} A promise that resolves to the updated game object or a success message.
 * @throws {Error} If the network response is not OK or if input parameters are invalid.
 */
export async function deleteGameScreenshots(gameId, screenshotPaths) {
    if (!gameId || !Array.isArray(screenshotPaths) || screenshotPaths.length === 0) {
        return Promise.reject(new Error("Se requiere ID del juego y un array de rutas de capturas para eliminar."));
    }

    const response = await fetchAuthenticated(`${API_BASE_URL}/games/${gameId}/screenshots`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ screenshotsToDelete: screenshotPaths }),
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (jsonError) {
            errorData = { message: `Error ${response.status} - ${response.statusText || 'Error del servidor'}. La respuesta no es JSON.` };
        }
        const serverErrorMessage = errorData.message || 'Error desconocido del servidor al eliminar capturas.';
        throw new Error(serverErrorMessage);
    }
    return await response.json();
}


// --- INICIO: NUEVA FUNCIÓN PARA OBTENER TODOS LOS GÉNEROS ÚNICOS ---
/**
 * Obtiene una lista de todos los géneros únicos de la base de datos.
 * @returns {Promise<Array<string>>} Una promesa que resuelve a un array de strings con los géneros.
 * @throws {Error} Si la respuesta de la red no es OK.
 */
export async function fetchAllUniqueGenres() {
    console.log(">>> [gameService.js] Solicitando GET /api/games/genres");
    const response = await fetchAuthenticated(`${API_BASE_URL}/games/genres`); 
    // fetchAuthenticated ya maneja el token CSRF si es necesario para GET,
    // y también el authMiddleware del backend se encarga de la autenticación.
    
    if (!response.ok) {
        let errorMsg = `Error HTTP ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg += `: ${errData.message || 'Error desconocido del servidor al obtener géneros'}`;
        } catch (e) {
            // Si el cuerpo del error no es JSON, intenta obtener el texto.
            try {
                const textError = await response.text();
                errorMsg += `: ${textError || response.statusText || 'Respuesta de error no textual'}`;
            } catch (textE) {
                errorMsg += `: ${response.statusText || 'Error desconocido del servidor y respuesta de error ilegible'}`;
            }
        }
        console.error(">>> [gameService.js] Error en fetchAllUniqueGenres:", errorMsg);
        throw new Error(errorMsg);
    }
    const genres = await response.json();
    console.log(`>>> [gameService.js] Géneros únicos recibidos del backend: ${genres.length}`);
    return genres;
}

// DENTRO DE public/gameService.js (añadir al final)

export async function searchExternalGames(query) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/games/search-external?query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Error al buscar juegos externamente.');
    return response.json();
}

export async function getExternalGameDetails(gameId) {
    const response = await fetchAuthenticated(`${API_BASE_URL}/games/details-external/${gameId}`);
    if (!response.ok) throw new Error('Error al obtener los detalles del juego.');
    return response.json();
}
// --- FIN: NUEVA FUNCIÓN PARA OBTENER TODOS LOS GÉNEROS ÚNICOS ---