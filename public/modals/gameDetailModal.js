// modals/gameDetailModal.js
import { getElem, escapeHtml, generateDisplayStars10 } from '../domUtils.js';
import { IMAGES_BASE_URL } from '../appConfig.js';
import { notificationService } from '../notificationService.js';
import { openImageModal } from './imageGalleryModal.js';
// --- IMPORTACIÓN PARA I18N ---
import { getText } from '../i18n.js';

let gameDetailModalElement, gameDetailsContentElement, closeModalBtnDetailElement;
let fetchGameByIdCallback = async (gameId) => {
    console.warn(getText('gameDetail_warn_fetchCallbackNotSet'), gameId);
    return Promise.reject(new Error(getText('gameDetail_error_fetchCallbackNotSet')));
};

// Funciones getDominantColorsFromImage y darkenRgbColor (sin cambios, se mantienen funcionales)
async function getDominantColorsFromImage(imageUrl, numColors = 1) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error(getText('gameDetail_error_canvasContext')));
                const MAX_WIDTH = 100; const MAX_HEIGHT = 100;
                let width = img.width; let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height).data;
                const colorCounts = {};
                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i], g = imageData[i+1], b = imageData[i+2], a = imageData[i+3];
                    if (a < 200) continue;
                    const color = `rgb(${r},${g},${b})`;
                    colorCounts[color] = (colorCounts[color] || 0) + 1;
                }
                const sortedColors = Object.entries(colorCounts).sort(([,a],[,b]) => b-a).map(([c]) => c);
                resolve(sortedColors.slice(0, numColors));
            } catch (e) { reject(new Error(getText('gameDetail_error_processingImage') + ": " + e.message)); }
        };
        img.onerror = () => { reject(new Error(getText('gameDetail_error_loadImageFail').replace('{imageUrl}', imageUrl))); };
    });
}

function darkenRgbColor(rgbString, darkenFactor = 0.3) {
    if (!rgbString || !rgbString.startsWith('rgb(')) {
        return 'rgb(30,30,30)';
    }
    try {
        const parts = rgbString.substring(rgbString.indexOf('(') + 1, rgbString.lastIndexOf(')')).split(/,\s*/);
        let r = parseInt(parts[0], 10);
        let g = parseInt(parts[1], 10);
        let b = parseInt(parts[2], 10);
        r = Math.max(0, Math.floor(r * (1 - darkenFactor)));
        g = Math.max(0, Math.floor(g * (1 - darkenFactor)));
        b = Math.max(0, Math.floor(b * (1 - darkenFactor)));
        return `rgb(${r},${g},${b})`;
    } catch (e) {
        console.error(getText('gameDetail_error_darkenColor'), rgbString, e);
        return 'rgb(30,30,30)';
    }
}

export function initGameDetailModal(fetchCb) {
    gameDetailModalElement = getElem('gameDetailModal');
    if (!gameDetailModalElement) {
        console.error(getText('gameDetail_error_modalNotFoundCritical'));
        notificationService.error(getText('gameDetail_error_modalMissingHTML'));
        return;
    }
    gameDetailsContentElement = getElem('gameDetails');
    closeModalBtnDetailElement = gameDetailModalElement.querySelector('.close');

    if (closeModalBtnDetailElement) {
        closeModalBtnDetailElement.addEventListener('click', closeGameDetailModal);
    }
    gameDetailModalElement.addEventListener('click', (event) => {
        if (event.target === gameDetailModalElement) closeGameDetailModal();
    });
    if (typeof fetchCb === 'function') {
        fetchGameByIdCallback = fetchCb;
    } else {
        console.error(getText('gameDetail_error_fetchCbInvalid'));
    }
    console.log(getText('gameDetail_log_initialized'));
}

export async function showGameDetailsModal(gameId) {
    if (!gameDetailModalElement || !gameDetailsContentElement) {
        notificationService.error(getText('gameDetail_error_modalNotInitialized'));
        return;
    }
    document.body.classList.add('modal-open-print');
    gameDetailsContentElement.innerHTML = `<p class="loading-message">${getText('gameDetail_loadingDetails')}</p>`;
    
    const modalContentEl = gameDetailModalElement.querySelector('.modal-content');
    const defaultDarkBackground = 'var(--clr-modal-bg, #2c2a3f)';
    
    gameDetailModalElement.style.display = 'flex';

    try {
        const game = await fetchGameByIdCallback(gameId);
        if (!game) throw new Error(getText('gameDetail_error_gameNotFound'));

        const buildImageUrl = p => p || null; // 'p' ya es la URL completa de Cloudinary.
        const coverDetailUrl = buildImageUrl(game.cover);
        const backCoverDetailUrl = buildImageUrl(game.backCover);
        
        let detailsHtml = `<div class="game-detail-layout-wrapper">`;
        detailsHtml += `<div class="game-detail-top-content">`;
        detailsHtml += `<div class="game-detail-visuals-primary">`;
        if (coverDetailUrl) {
            detailsHtml += `<div class="game-detail-cover-main-display">
                                <img src="${escapeHtml(coverDetailUrl)}" alt="${getText('gameDetail_alt_coverOf').replace('{title}', escapeHtml(game.title))}" class="game-detail-cover-img game-image-thumbnail" data-image-url="${escapeHtml(coverDetailUrl)}" data-image-type="cover">
                            </div>`;
        } else {
            detailsHtml += `<div class="game-detail-cover-main-display">
                                <div class="game-detail-placeholder-image primary-image cover"><span>${getText('gameDetail_coverNotAvailable')}</span></div>
                            </div>`;
        }
        if (backCoverDetailUrl) {
            detailsHtml += `<div class="game-detail-backcover-main-display">
                                <img src="${escapeHtml(backCoverDetailUrl)}" alt="${getText('gameDetail_alt_backCoverOf').replace('{title}', escapeHtml(game.title))}" class="game-detail-backcover-img game-image-thumbnail" data-image-url="${escapeHtml(backCoverDetailUrl)}" data-image-type="backCover">
                            </div>`;
        } else {
            detailsHtml += `<div class="game-detail-backcover-main-display">
                                <div class="game-detail-placeholder-image primary-image backcover"><span>${getText('gameDetail_backCoverNotAvailable')}</span></div>
                            </div>`;
        }
        detailsHtml += `</div>`; 

        detailsHtml += `<div class="game-detail-textual-content">`;
        detailsHtml += `<div class="game-detail-header-main">
                                <h2>${escapeHtml(game.title) || getText('gameDetail_untitled')}</h2>
                                <p class="game-detail-subheader-main">
                                    
                                    <span class="game-detail-platform">${escapeHtml(getText(game.platform)) || getText('gameDetail_valueNA')}</span>
                                    ${game.year ? ` - <span class="game-detail-year">${escapeHtml(String(game.year))}</span>` : ''}
                                </p>
                            </div>`;
        if (game.additionalInfo) {
            detailsHtml += `<div class="additional-info-in-column">
                                    <h3>${getText('gameDetail_heading_additionalInfo')}</h3>
                                    <div class="additional-info-text-content">${game.additionalInfo.replace(/\n/g, '<br>')}</div>
                                </div>`;
        }
        detailsHtml += `<div class="game-scoring-date-section">`;
        if (game.rating && parseInt(game.rating) > 0) {
            detailsHtml += `<div class="game-detail-score-display">
                                    <strong>${getText('gameDetail_label_score')}:</strong> ${generateDisplayStars10(game.rating)} 
                                </div>`;
        }
        const dateAdded = game.createdAt ? new Date(game.createdAt).toLocaleDateString() : getText('gameDetail_valueNA');
        const dateUpdated = game.updatedAt && game.updatedAt !== game.createdAt ? new Date(game.updatedAt).toLocaleDateString() : null;
        detailsHtml += `<p class="game-detail-added-date">${getText('gameDetail_label_dateAdded')}: ${escapeHtml(dateAdded)}`;
        if (dateUpdated) {
            detailsHtml += ` (${getText('gameDetail_label_dateUpdated')}: ${escapeHtml(dateUpdated)})`;
        }
        detailsHtml += `</p></div>`; 
        detailsHtml += `</div>`; 
        detailsHtml += `</div>`; 

        if (game.screenshots && game.screenshots.length > 0) {
            detailsHtml += `<div class="screenshots-fullwidth-section game-detail-section">
                                    <h3>${getText('gameDetail_heading_screenshots')}</h3>
                                    <div class="game-screenshots-gallery-container">`;
            game.screenshots.forEach((scrPath, index) => {
                const screenshotUrl = buildImageUrl(scrPath);
                if (screenshotUrl) {
                    detailsHtml += `<img src="${escapeHtml(screenshotUrl)}" alt="${getText('gameDetail_alt_screenshotOf').replace('{title}', escapeHtml(game.title)).replace('{index}', index + 1)}" class="game-detail-screenshot-item game-image-thumbnail" data-image-url="${escapeHtml(screenshotUrl)}" data-image-type="screenshot">`;
                }
            });
            detailsHtml += `</div></div>`;
        }

        detailsHtml += `<div class="game-detail-side-by-side-container">`;
        // --- Requisitos del Sistema (CORREGIDO) ---
if (game.systemRequirements) {
    const req = typeof game.systemRequirements === 'string' ? JSON.parse(game.systemRequirements) : game.systemRequirements;
    const hasReqs = req && Object.values(req).some(val => val && String(val).trim() !== '');
    if (hasReqs) {
        detailsHtml += `<div class="system-requirements-column game-detail-section">
                            <h3>${getText('gameDetail_legend_systemRequirements')}</h3>
                            <ul class="system-requirements-list">`;
        const iconStyle = 'width: 20px; height: 20px; vertical-align: middle; margin-right: 5px;';
        
        // Estos campos usan getText() porque sus valores son claves de traducción. Esto es CORRECTO.
        if (req.cpu) detailsHtml += `<li><img src="Imagenes/Cpu_icon.png" alt="${getText('gameDetail_alt_cpuIcon')}" class="requirement-icon" style="${iconStyle}"><strong>${getText('gameDetail_label_cpu')}:</strong> ${getText(req.cpu)}</li>`;
        if (req.gfx) detailsHtml += `<li><img src="Imagenes/Video_icon.png" alt="${getText('gameDetail_alt_gpuIcon')}" class="requirement-icon" style="${iconStyle}"><strong>${getText('gameDetail_label_graphics')}:</strong> ${getText(req.gfx)}</li>`;
        if (req.hdd) detailsHtml += `<li><img src="Imagenes/HDD_icon.png" alt="${getText('gameDetail_alt_hddIcon')}" class="requirement-icon" style="${iconStyle}"><strong>${getText('gameDetail_label_hdd')}:</strong> ${getText(req.hdd)}</li>`;
        if (req.controller) detailsHtml += `<li><img src="Imagenes/Joy_icon.png" alt="${getText('gameDetail_alt_controllerIcon')}" class="requirement-icon" style="${iconStyle}"><strong>${getText('gameDetail_label_controller')}:</strong> ${getText(req.controller)}</li>`;
        
        // --- INICIO DE LA CORRECCIÓN ---
        // En estos campos de texto libre, eliminamos escapeHtml() para que '&' se vea bien.
        if (req.memory) detailsHtml += `<li><img src="Imagenes/Mem_icon.png" alt="${getText('gameDetail_alt_ramIcon')}" class="requirement-icon" style="${iconStyle}"><strong>${getText('gameDetail_label_memory')}:</strong> ${req.memory}</li>`;
        if (req.sound) detailsHtml += `<li><img src="Imagenes/Nota_icon.png" alt="${getText('gameDetail_alt_soundIcon')}" class="requirement-icon" style="${iconStyle}"><strong>${getText('gameDetail_label_sound')}:</strong> ${req.sound}</li>`;
        // --- FIN DE LA CORRECCIÓN ---
        
        detailsHtml += `</ul></div>`;
    } else {
        detailsHtml += `<div class="system-requirements-column game-detail-section" style="display:none;"></div>`;
    }
} else {
    detailsHtml += `<div class="system-requirements-column game-detail-section" style="display:none;"></div>`;
}

        // --- Información Principal ---
        detailsHtml += `<div class="main-info-column game-detail-section">
                                <h3>${getText('gameDetail_heading_mainInfo')}</h3>
                                <div class="info-grid-container">`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_genre')}:</strong> ${getText(game.genre) || getText('gameDetail_valueNA')}</p>`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_developer')}:</strong> ${escapeHtml(game.developer) || getText('gameDetail_valueNA')}</p>`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_publisher')}:</strong> ${escapeHtml(game.publisher) || getText('gameDetail_valueNA')}</p>`;
        
        let formatDetailText = getText(game.format) || getText('gameDetail_valueNA');
        if (game.format === 'gameForm_format_diskette' && game.capacity) { // Comparar con la clave
            formatDetailText += ` (${getText(game.capacity) || escapeHtml(game.capacity)})`;
        }
        detailsHtml += `<p><strong>${getText('gameDetail_label_format')}:</strong> ${formatDetailText}</p>`;
        
        const validFormatsForQuantity = ['gameForm_format_diskette', 'gameForm_format_cd', 'gameForm_format_dvd']; // Usar claves
        if (game.quantity !== undefined && game.quantity !== null && validFormatsForQuantity.includes(game.format)) {
            let iconPath = '', altKey = '', srTextKey = '';
            const numericQuantity = parseInt(game.quantity, 10);
            if (!isNaN(numericQuantity) && numericQuantity > 0) {
                switch (game.format) { // Comparar con la clave
                    case 'gameForm_format_diskette':
                        // --- INICIO DE CÓDIGO MODIFICADO ---
                        // Por defecto, usamos el ícono del disquete de 3.5"
                        iconPath = 'Imagenes/disquete_icon.png';
                        // Si la capacidad es de 5.25", cambiamos al ícono correspondiente
                        if (game.capacity === 'gameForm_capacity_dd360kb' || game.capacity === 'gameForm_capacity_hd12mb') {
                            iconPath = 'Imagenes/disquete122_icon.png';
                        }
                        // --- FIN DE CÓDIGO MODIFICADO ---
                        altKey = 'gameDetail_alt_floppyIcon'; 
                        srTextKey = numericQuantity > 1 ? 'gameDetail_sr_floppies' : 'gameDetail_sr_floppy'; 
                        break;
                    case 'gameForm_format_cd':       iconPath = 'Imagenes/cd_icon.png';       altKey = 'gameDetail_alt_cdIcon';    srTextKey = numericQuantity > 1 ? 'gameDetail_sr_cds'    : 'gameDetail_sr_cd';    break;
                    case 'gameForm_format_dvd':      iconPath = 'Imagenes/dvd_icon.png';      altKey = 'gameDetail_alt_dvdIcon';   srTextKey = numericQuantity > 1 ? 'gameDetail_sr_dvds'   : 'gameDetail_sr_dvd';   break;
                }
                if (iconPath) {
                    detailsHtml += `<div class="detail-quantity-container"><strong>${getText('gameDetail_label_quantity')}:</strong><div class="quantity-icons-wrapper">`;
                    for (let i = 0; i < numericQuantity; i++) {
                        detailsHtml += `<img src="${iconPath}" alt="${getText(altKey)}" class="quantity-icon">`;
                    }
                    detailsHtml += `</div><span class="sr-only"> ${numericQuantity} ${getText(srTextKey)}</span></div>`;
                } else { 
                    detailsHtml += `<p><strong>${getText('gameDetail_label_quantity')}:</strong> ${numericQuantity}</p>`;
                }
            }
        }

        detailsHtml += `<p><strong>${getText('gameDetail_label_language')}:</strong> ${getText(game.language) || getText('gameDetail_valueNA')}</p>`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_region')}:</strong> ${getText(game.region) || getText('gameDetail_valueNA')}</p>`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_ageRating')}:</strong> ${getText(game.ageRating) || getText('gameDetail_valueNA')}</p>`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_barcode')}:</strong> ${escapeHtml(game.barcode) || getText('gameDetail_valueNA')}</p>`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_condition')}:</strong> ${getText(game.condition) || getText('gameDetail_valueNA')}</p>`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_progress')}:</strong> ${getText(game.progress) || getText('gameDetail_valueNA')}</p>`;
        
        let multiplayerText = game.multiplayer ? getText('gameDetail_value_yes') : getText('gameDetail_value_no'); // game.multiplayer es booleano
        if (game.multiplayer && game.numPlayers) {
            multiplayerText += ` (${escapeHtml(String(game.numPlayers))} ${getText('gameDetail_label_players')})`;
        }
        detailsHtml += `<p><strong>${getText('gameDetail_label_multiplayer')}:</strong> ${multiplayerText}</p>`;
        detailsHtml += `<p><strong>${getText('gameDetail_label_copyProtection')}:</strong> ${escapeHtml(game.copyProtection) || getText('gameDetail_valueNA')}</p>`; // Protección de copia suele ser texto libre
        
        detailsHtml += `<p style="margin-top: 10px !important; border-top: 1px dashed var(--clr-border-dashed, #555) !important; padding-top: 10px !important;">
                                <strong>${getText('gameDetail_label_loanStatus')}:</strong> 
                                <span style="color: ${game.isLoaned ? 'var(--clr-accent-loaned, #ff8c00)' : 'var(--clr-accent-available, #32cd32)'}; font-weight: bold;">
                                    ${game.isLoaned ? getText('gameDetail_value_loaned') : getText('gameDetail_value_available')}
                                </span>
                            </p>`;
        if (game.isLoaned) {
            detailsHtml += `<p><strong>${getText('gameDetail_label_loanedTo')}:</strong> ${escapeHtml(game.loanedTo) || getText('gameDetail_value_notSpecified')}</p>`;
            detailsHtml += `<p><strong>${getText('gameDetail_label_loanDate')}:</strong> ${game.loanDate ? new Date(game.loanDate).toLocaleDateString() : getText('gameDetail_value_notSpecified')}</p>`;
        }

        detailsHtml += `</div></div>`; 
        detailsHtml += `</div>`; 
        detailsHtml += `</div>`; 
        
        gameDetailsContentElement.innerHTML = detailsHtml;

        const gameDetailWrapperEl = gameDetailsContentElement.querySelector('.game-detail-layout-wrapper');
        if (gameDetailWrapperEl) {
            gameDetailWrapperEl.style.setProperty('--dynamic-modal-background', defaultDarkBackground);
        }

        if (coverDetailUrl && gameDetailWrapperEl) {
            getDominantColorsFromImage(coverDetailUrl, 2)
                .then(colors => {
                    if (colors && colors.length > 0 && gameDetailWrapperEl) {
                        const darkenAmount = 0.35;
                        const darkC0 = darkenRgbColor(colors[0], darkenAmount);
                        const bgStyle = colors.length > 1 ? `linear-gradient(135deg, ${darkC0} 0%, ${darkenRgbColor(colors[1], darkenAmount)} 100%)` : darkC0;
                        gameDetailWrapperEl.style.setProperty('--dynamic-modal-background', bgStyle);
                    }
                }).catch(err => {
                    console.warn(getText('gameDetail_warn_dominantColorError'), err);
                    if (gameDetailWrapperEl) {
                        gameDetailWrapperEl.style.setProperty('--dynamic-modal-background', defaultDarkBackground);
                    }
                });
        }
        
        gameDetailsContentElement.querySelectorAll('.game-image-thumbnail').forEach(img => {
            img.addEventListener('click', (e) => {
                const clickedImageUrl = e.currentTarget.dataset.imageUrl;
                let galleryImages = [];
                const coverImgElem = gameDetailsContentElement.querySelector('.game-detail-cover-img.game-image-thumbnail');
                if (coverImgElem && coverImgElem.dataset.imageUrl) galleryImages.push(coverImgElem.dataset.imageUrl);
                const backCoverImgElem = gameDetailsContentElement.querySelector('.game-detail-backcover-img.game-image-thumbnail');
                if (backCoverImgElem && backCoverImgElem.dataset.imageUrl && backCoverImgElem.dataset.imageUrl !== (coverImgElem ? coverImgElem.dataset.imageUrl : null)) {
                    galleryImages.push(backCoverImgElem.dataset.imageUrl);
                }
                const screenshotThumbnails = gameDetailsContentElement.querySelectorAll('.game-detail-screenshot-item.game-image-thumbnail');
                screenshotThumbnails.forEach(thumb => {
                    if (thumb.dataset.imageUrl && !galleryImages.includes(thumb.dataset.imageUrl) ) {
                        galleryImages.push(thumb.dataset.imageUrl);
                    }
                });
                galleryImages = galleryImages.filter(url => url);
                let startIndex = galleryImages.indexOf(clickedImageUrl);
                if (startIndex === -1 && galleryImages.length > 0) startIndex = 0;
                if (galleryImages.length > 0) {
                    openImageModal(galleryImages, startIndex, true);
                }
            });
        });
    } catch (error) {
        console.error(getText('gameDetail_error_showDetails'), error);
        if (gameDetailsContentElement) gameDetailsContentElement.innerHTML = `<p class="loading-message error-message">${getText('gameDetail_error_couldNotLoadDetails')}</p>`;
        notificationService.error(getText('gameDetail_error_couldNotLoadDetails_notification'), error);
        const gameDetailWrapperElOnError = gameDetailsContentElement ? gameDetailsContentElement.querySelector('.game-detail-layout-wrapper') : null;
        if (gameDetailWrapperElOnError) {
            gameDetailWrapperElOnError.style.setProperty('--dynamic-modal-background', defaultDarkBackground);
        } else if (modalContentEl && modalContentEl.style) {
            modalContentEl.style.background = defaultDarkBackground;
        }
    }
}

export function closeGameDetailModal() {
    document.body.classList.remove('modal-open-print');
    if (gameDetailModalElement) {
        gameDetailModalElement.style.display = 'none';
    }
    if (gameDetailsContentElement) gameDetailsContentElement.innerHTML = '';
    console.log(getText('gameDetail_log_closed'));
}
