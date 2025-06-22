// modals/configTabs/adminFileStats.js (ACTUALIZADO CON TOTALES GENERALES)
import { getElem, escapeHtml } from '../../domUtils.js';
import * as adminService from '../../adminService.js';
import { notificationService } from '../../notificationService.js';

let adminViewFileStatsBtnElement, adminFileStatsContainerElement;

async function handleLoadAndRenderUserFileStats() {
    if (!adminFileStatsContainerElement || !adminViewFileStatsBtnElement) return;

    const originalButtonHTML = adminViewFileStatsBtnElement.innerHTML;
    adminViewFileStatsBtnElement.disabled = true;
    adminViewFileStatsBtnElement.innerHTML = `<img src="Imagenes/Galeria Multimedia.png" alt="Icono Estadísticas" style="width:16px; height:16px; vertical-align: middle; margin-right: 5px;"> Cargando...`;
    adminFileStatsContainerElement.innerHTML = '<p style="padding:10px; text-align:center;">Obteniendo estadísticas desde Cloudinary...</p>';

    try {
        const stats = await adminService.fetchCloudinaryStats();
        renderUserFileStatsTable(stats);
    } catch (error) {
        console.error("Error al cargar/renderizar estadísticas de archivos:", error);
        notificationService.error(`Error al cargar estadísticas: ${error.message}`);
        if (adminFileStatsContainerElement) {
            adminFileStatsContainerElement.innerHTML = `<p style="padding:10px; text-align:center; color: var(--clr-btn-d-bg);">Error al cargar estadísticas: ${escapeHtml(error.message)}</p>`;
        }
    } finally {
        if (adminViewFileStatsBtnElement) {
            adminViewFileStatsBtnElement.disabled = false;
            adminViewFileStatsBtnElement.innerHTML = originalButtonHTML;
        }
    }
}

function renderUserFileStatsTable(statsData) {
    if (!adminFileStatsContainerElement) return;

    if (!statsData || statsData.length === 0) {
        adminFileStatsContainerElement.innerHTML = '<p style="padding:10px; text-align:center;">No se encontraron estadísticas de archivos para los usuarios.</p>';
        return;
    }

    // <<< INICIO: Lógica para calcular los totales generales >>>
    const totals = statsData.reduce((acc, stat) => {
        acc.covers += stat.covers || 0;
        acc.backCovers += stat.backCovers || 0;
        acc.screenshots += stat.screenshots || 0;
        return acc;
    }, { covers: 0, backCovers: 0, screenshots: 0 });

    const grandTotalFiles = totals.covers + totals.backCovers + totals.screenshots;
    // <<< FIN: Lógica para calcular los totales generales >>>

    let tableHtml = `
        <table style="width:100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--clr-border);">Usuario</th>
                    <th style="text-align:right; padding:8px; border-bottom:1px solid var(--clr-border);">Portadas</th>
                    <th style="text-align:right; padding:8px; border-bottom:1px solid var(--clr-border);">Contraportadas</th>
                    <th style="text-align:right; padding:8px; border-bottom:1px solid var(--clr-border);">Capturas</th>
                    <th style="text-align:right; padding:8px; border-bottom:1px solid var(--clr-border);">Total</th>
                </tr>
            </thead>
            <tbody>`;

    statsData.forEach(stat => {
        const totalFiles = (stat.covers || 0) + (stat.backCovers || 0) + (stat.screenshots || 0);
        tableHtml += `
            <tr>
                <td style="padding:8px; border-bottom:1px solid var(--clr-border);">${escapeHtml(stat.username)}</td>
                <td style="text-align:right; padding:8px; border-bottom:1px solid var(--clr-border);">${stat.covers || 0}</td>
                <td style="text-align:right; padding:8px; border-bottom:1px solid var(--clr-border);">${stat.backCovers || 0}</td>
                <td style="text-align:right; padding:8px; border-bottom:1px solid var(--clr-border);">${stat.screenshots || 0}</td>
                <td style="text-align:right; padding:8px; border-bottom:1px solid var(--clr-border); font-weight:bold;">${totalFiles}</td>
            </tr>`;
    });
    
    tableHtml += `</tbody>`;

    // <<< INICIO: HTML para el pie de tabla con los totales generales >>>
    tableHtml += `
        <tfoot style="background-color: rgba(0,0,0,0.1); font-weight: bold;">
            <tr>
                <td style="text-align:left; padding:8px; border-top: 2px solid var(--clr-border);">Totales Generales</td>
                <td style="text-align:right; padding:8px; border-top: 2px solid var(--clr-border);">${totals.covers}</td>
                <td style="text-align:right; padding:8px; border-top: 2px solid var(--clr-border);">${totals.backCovers}</td>
                <td style="text-align:right; padding:8px; border-top: 2px solid var(--clr-border);">${totals.screenshots}</td>
                <td style="text-align:right; padding:8px; border-top: 2px solid var(--clr-border);">${grandTotalFiles}</td>
            </tr>
        </tfoot>`;
    // <<< FIN: HTML para el pie de tabla >>>
    
    tableHtml +=`</table>`;
    adminFileStatsContainerElement.innerHTML = tableHtml;
}

export function initAdminFileStats() {
    adminViewFileStatsBtnElement = getElem('adminViewFileStatsBtn', false);
    adminFileStatsContainerElement = getElem('adminFileStatsContainer', false);

    if (adminViewFileStatsBtnElement) {
        adminViewFileStatsBtnElement.addEventListener('click', handleLoadAndRenderUserFileStats);
    }
}

export function refreshAdminFileStatsOnTabOpen() {
    if (adminFileStatsContainerElement) {
        adminFileStatsContainerElement.innerHTML = '<p style="padding:10px; text-align:center;">Haga clic en el botón para cargar las estadísticas desde Cloudinary.</p>';
    }
}