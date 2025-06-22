// public/collectionService.js
import { API_BASE_URL } from './appConfig.js'; // MODIFICADO
import { fetchAuthenticated } from './authClient.js';

/**
 * Solicita al backend la exportación de la colección del usuario actual.
 * Dispara la descarga de un archivo JSON.
 * @returns {Promise<object>} Promesa que resuelve con un mensaje de éxito o falla.
 */
export async function exportUserCollection() {
    const response = await fetchAuthenticated(`${API_BASE_URL}/collections/export`, {
        method: 'GET',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error desconocido durante la exportación." }));
        throw new Error(errorData.message || `Error HTTP ${response.status} al exportar la colección.`);
    }

    // Descargar el archivo JSON
    const blob = await response.blob();
    const filenameHeader = response.headers.get('Content-Disposition');
    let filename = 'mi_coleccion_juegos.json'; // Nombre por defecto
    if (filenameHeader) {
        const parts = filenameHeader.split('filename=');
        if (parts.length > 1) {
            filename = parts[1].replace(/"/g, ''); // Limpiar comillas
        }
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    return { success: true, message: `Colección exportada como ${filename}` };
}

/**
 * Envía un archivo JSON al backend para importar la colección del usuario actual.
 * @param {File} file - El archivo JSON seleccionado por el usuario.
 * @returns {Promise<object>} Promesa que resuelve con la respuesta del servidor.
 */
export async function importUserCollection(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const fileContent = event.target.result;
                const jsonData = JSON.parse(fileContent);

                // Verificar que el contenido del archivo JSON sea un array (como se exporta)
                if (!Array.isArray(jsonData)) {
                    reject(new Error("El archivo JSON no contiene un array de juegos válido."));
                    return;
                }

                // El backend espera un objeto { "games": [...] }
                const payload = { games: jsonData };

                const response = await fetchAuthenticated(`${API_BASE_URL}/collections/import`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // fetchAuthenticated debería añadir X-CSRF-Token automáticamente
                    },
                    body: JSON.stringify(payload),
                });

                const responseData = await response.json();
                if (!response.ok) {
                    reject(new Error(responseData.message || `Error HTTP ${response.status} al importar la colección.`));
                } else {
                    resolve(responseData); // Debería ser { message: "..." }
                }
            } catch (parseError) {
                console.error("Error parseando JSON de importación:", parseError);
                reject(new Error("El archivo seleccionado no es un JSON válido o tiene un formato incorrecto."));
            }
        };
        reader.onerror = (error) => {
            console.error("Error leyendo archivo de importación:", error);
            reject(new Error("Error al leer el archivo."));
        };
        reader.readAsText(file); // Leer el archivo como texto
    });
}