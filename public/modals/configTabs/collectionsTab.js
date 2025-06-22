// proposed_path: modals/configTabs/collectionsTab.js
import { getElem } from '../../domUtils.js'; // Ajusta la ruta
import { exportUserCollection, importUserCollection } from '../../collectionService.js'; // Ajusta la ruta
import { notificationService } from '../../notificationService.js'; // Ajusta la ruta

let exportCollectionBtnElement, importFileElement, importCollectionBtnElement,
    exportStatusMessageElement, importStatusMessageElement;
let loadInitialGamesCallback = () => {}; // Para refrescar la lista después de importar

async function handleExportCollection() {
    if (!exportCollectionBtnElement || !exportStatusMessageElement) return;
    exportCollectionBtnElement.disabled = true;
    const workingToast = notificationService.info('Exportando tu colección...', null);

    try {
        const result = await exportUserCollection();
        if (workingToast && typeof workingToast.remove === 'function') workingToast.remove();
        notificationService.success(result.message || '¡Colección exportada con éxito!');
        if (exportStatusMessageElement) {
            exportStatusMessageElement.textContent = '';
            exportStatusMessageElement.className = 'auth-message';
            exportStatusMessageElement.style.display = 'none';
        }
    } catch (error) {
        console.error("Error al exportar colección (UI):", error);
        if (workingToast && typeof workingToast.remove === 'function') workingToast.remove();
        notificationService.error(`Error al exportar: ${error.message}`, error);
        if (exportStatusMessageElement) {
            exportStatusMessageElement.textContent = `Error al exportar: ${error.message}`;
            exportStatusMessageElement.className = 'auth-message error';
            exportStatusMessageElement.style.display = 'block';
        }
    } finally {
        exportCollectionBtnElement.disabled = false;
    }
}

async function handleImportCollection() {
    if (!importFileElement || !importFileElement.files || importFileElement.files.length === 0) {
        notificationService.warn('Por favor, selecciona un archivo JSON para importar.');
        return;
    }
    if (!importCollectionBtnElement) return;

    const file = importFileElement.files[0];
    if (!file.name.endsWith('.json')) {
        notificationService.error('Por favor, selecciona un archivo con extensión .json.');
        if (importFileElement) importFileElement.value = '';
        if (importCollectionBtnElement) importCollectionBtnElement.disabled = true;
        return;
    }

    const confirmationMessage = "Se compararán los juegos de este archivo con tu colección actual.\n\n" +
                              "Los juegos coincidentes (mismo título y plataforma) se actualizarán con la información del archivo.\n" +
                              "Los juegos nuevos del archivo se añadirán a tu colección.\n\n" +
                              "Los juegos que ya tienes y no están en el archivo permanecerán sin cambios.\n\n" +
                              "¿Deseas continuar con la importación?";
    if (!confirm(confirmationMessage)) {
        if (importFileElement) importFileElement.value = '';
        if (importCollectionBtnElement) importCollectionBtnElement.disabled = true;
        return;
    }

    importCollectionBtnElement.disabled = true;
    const workingToast = notificationService.info('Importando tu colección...', null);

    try {
        const result = await importUserCollection(file);
        if (workingToast && typeof workingToast.remove === 'function') workingToast.remove();
        
        let successMsg = result.message;
        if (result.hasOwnProperty('added') && result.hasOwnProperty('updated')) {
            successMsg = `Importación completada: ${result.added} juegos añadidos, ${result.updated} juegos actualizados.`;
        }
        notificationService.success(successMsg);
        
        if (importStatusMessageElement) {
            importStatusMessageElement.textContent = '';
            importStatusMessageElement.className = 'auth-message';
            importStatusMessageElement.style.display = 'none';
        }

        if (typeof loadInitialGamesCallback === 'function') {
            await loadInitialGamesCallback(); // Usar el callback pasado
        } else {
            console.warn("La función loadInitialGamesCallback no está disponible para refrescar la lista después de la importación.");
            notificationService.info("Colección importada. Por favor, recarga la página para ver los cambios.");
        }
    } catch (error) {
        console.error("Error al importar colección (UI):", error);
        if (workingToast && typeof workingToast.remove === 'function') workingToast.remove();
        notificationService.error(`Error al importar: ${error.message}`, error);
        if (importStatusMessageElement) {
            importStatusMessageElement.textContent = `Error al importar: ${error.message}`;
            importStatusMessageElement.className = 'auth-message error';
            importStatusMessageElement.style.display = 'block';
        }
    } finally {
        if (importFileElement) importFileElement.value = '';
        if (importCollectionBtnElement) importCollectionBtnElement.disabled = true;
    }
}

export function initCollectionsTab(loadGamesCb) {
    // collectionsTabButtonElement y collectionsTabPanelElement son manejados por configModalController.js
    exportCollectionBtnElement = getElem('exportCollectionBtn', false);
    importFileElement = getElem('importFile', false);
    importCollectionBtnElement = getElem('importCollectionBtn', false);
    exportStatusMessageElement = getElem('exportStatusMessage', false);
    importStatusMessageElement = getElem('importStatusMessage', false);

    if (typeof loadGamesCb === 'function') {
        loadInitialGamesCallback = loadGamesCb;
    }

    if (exportCollectionBtnElement) exportCollectionBtnElement.addEventListener('click', handleExportCollection);
    if (importFileElement) {
        importFileElement.addEventListener('change', () => {
            if (importCollectionBtnElement) importCollectionBtnElement.disabled = !importFileElement.files || importFileElement.files.length === 0;
        });
    }
    if (importCollectionBtnElement) importCollectionBtnElement.addEventListener('click', handleImportCollection);
    console.log("Collections Tab Initialized");
}