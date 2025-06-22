// public/render.js (CORREGIDO Y COMPLETO)
import { getElem, escapeHtml, generateDisplayStars10 } from './domUtils.js';
import { getText, getCurrentLanguage } from './i18n.js';

let gameListElement;
let updateDeleteButtonStateCallback = () => console.warn(getText('render_warn_updateDeleteButtonStateCallbackNotSet'));

export function setUpdateDeleteButtonStateCallback(callback) {
    updateDeleteButtonStateCallback = callback;
}

export function initRender() {
    gameListElement = getElem('gameList');
    if (!gameListElement) {
        console.error(getText('render_error_gameListNotFound'));
    }
}

/**
 * Crea el elemento DOM para una sola tarjeta de juego.
 * @param {object} game - El objeto del juego.
 * @returns {HTMLLIElement} El elemento <li> de la tarjeta de juego.
 */
function createGameCard(game) {
    const li = document.createElement('li');
    li.className = 'game-card-simple';
    li.dataset.id = game._id;

    // Lógica del fondo de contraportada con URL de Cloudinary
    if (game.backCover) {
        li.style.setProperty('--card-bg-image', `url("${escapeHtml(game.backCover)}")`);
    } else {
        li.style.removeProperty('--card-bg-image');
    }

    // Checkbox y Botón de Editar
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'game-delete-checkbox';
    checkbox.dataset.id = game._id;
    checkbox.title = getText('gameCard_checkboxDeleteTitle');
    li.appendChild(checkbox);

    const editButton = document.createElement('button');
    editButton.className = 'btn-edit-game';
    editButton.dataset.id = game._id;
    editButton.title = getText('gameCard_btnEditTitle');
    const editImg = document.createElement('img');
    editImg.src = 'Imagenes/Editar Juego.png';
    editImg.alt = getText('gameCard_btnEditImgAlt');
    editButton.appendChild(editImg);
    li.appendChild(editButton);

    // Contenedor de Imagen de Portada
    const imageContainer = document.createElement('div');
    imageContainer.className = 'card-image-container';
    const coverUrl = game.cover || 'placeholder_box.png'; // Usa URL de Cloudinary o placeholder
    const coverImage = document.createElement('img');
    coverImage.src = coverUrl;
    coverImage.alt = getText('gameCard_coverImgAlt', { title: game.title });
    coverImage.className = 'card-cover-image';
    imageContainer.appendChild(coverImage);
    
    // Logos de plataforma
    imageContainer.innerHTML += generatePlatformLogoHtml(game.platform);
    li.appendChild(imageContainer);

    // --- Contenido de Texto (BLOQUE DE CÓDIGO RESTAURADO) ---
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';

    const titleH3 = document.createElement('h3');
    titleH3.className = 'card-title';
    titleH3.title = game.title;
    titleH3.textContent = game.title;
    cardContent.appendChild(titleH3);

    const infoLine1 = document.createElement('div');
    infoLine1.className = 'game-info-line';
    const yearSpan = document.createElement('span');
    yearSpan.textContent = game.year || getText('gameCard_labelNA');
    const genreSpan = document.createElement('span');
    genreSpan.textContent = getText(game.genre) || getText('gameCard_labelNA');
    const platformSpan = document.createElement('span');
    platformSpan.textContent = getText(game.platform) || getText('gameCard_labelNA');
    infoLine1.append(yearSpan, ' - ', genreSpan, ' - ', platformSpan);
    cardContent.appendChild(infoLine1);

    const infoLine2 = document.createElement('div');
    infoLine2.className = 'game-info-line';
    let fmt = getText(game.format) || getText('gameCard_labelNA_short');
    if (game.format === 'gameForm_format_diskette' && game.capacity) {
        fmt += ` (${getText(game.capacity) || game.capacity})`;
    }
    const formatsWithQuantity = ['gameForm_format_diskette', 'gameForm_format_cd', 'gameForm_format_dvd'];
    if (game.quantity && formatsWithQuantity.includes(game.format)) {
        fmt += ` (x${game.quantity})`;
    }
    infoLine2.innerHTML = `<span>${getText('gameCard_labelFormat')}</span> <span>${escapeHtml(fmt)}</span>`;
    cardContent.appendChild(infoLine2);

    const infoLine3 = document.createElement('div');
    infoLine3.className = 'game-info-line';
    infoLine3.innerHTML = `<span>${getText('gameCard_labelDeveloper')}</span> <span>${escapeHtml(game.developer) || getText('gameCard_labelNA')}</span>`;
    cardContent.appendChild(infoLine3);

    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'card-rating';
    ratingDiv.innerHTML = generateDisplayStars10(game.rating);
    cardContent.appendChild(ratingDiv);
    
    li.appendChild(cardContent);
    // --- FIN DEL BLOQUE RESTAURADO ---

    return li;
}

/**
 * Renderiza la lista de juegos en el DOM.
 * @param {Array<Object>} gamesToRender - La lista de juegos a mostrar.
 * @param {boolean} [append=false] - Si es true, añade los juegos a la lista existente. Si es false, la reemplaza.
 */
export function renderGameList(gamesToRender, append = false) {
    if (!gameListElement) {
        console.error(getText('render_error_gameListNotInitialized'));
        return;
    }
    if (!append) {
        gameListElement.innerHTML = '';
    }
    if (!gamesToRender || gamesToRender.length === 0) {
        if (!append) updateDeleteButtonStateCallback();
        return; 
    }
    const frag = document.createDocumentFragment();
    gamesToRender.forEach(game => {
        const gameCardElement = createGameCard(game);
        frag.appendChild(gameCardElement);
    });
    gameListElement.appendChild(frag);
    updateDeleteButtonStateCallback();
}

/**
 * Genera el HTML para los logos de plataforma.
 * @param {string} platformKey - La clave de la plataforma (ej. 'platform_pc_dos').
 * @returns {string} El string HTML con la(s) imagen(es) del logo.
 */
function generatePlatformLogoHtml(platformKey) {
    const translatedPlatform = getText(platformKey);
    let logoHtml = '';
    const logoBasePath = 'Logos OS/';
    const platformLogos = {
        'Amstrad': 'amstrad Logo.png', 'Apple Macintosh': 'MacOS Logo 1995.png',
        'Atari 2600': 'atari 2600 logo.png', 'Atari Jaguar': 'Atari Jaguar logo.png',
        'Atari ST': 'atari st logo.png', 'Commodore 64': 'commodore 64 logo.png',
        'Commodore AMIGA': 'Commodore Amiga logo.png', 'Game Gear': 'Game Gear logo.png',
        'Linux': 'linux logo.png', 'Microsoft X BOX': 'Microsoft Xbox logo.png',
        'Microsoft X BOX 360': 'Microsoft Xbox 360 logo.png', 'Microsoft X BOX ONE': 'Microsoft Xbox ONE logo.png',
        'MSX': 'MSX logo.png', 'NEO GEO Pocket': 'NeoGeo Pocket logo.png',
        'NEO GEO Pocket Color': 'NeoGeo Pocket Color logo.png', 'Nintendo 3DS': 'Nintendo 3DS logo.png',
        'Nintendo 64': 'Nintendo 64 logo.png', 'Nintendo DS': 'Nintendo DS logo.png',
        'Nintendo Game BOY': 'Nintendo GameBoy logo.png', 'Nintendo Game BOY Advance': 'Nintendo GameBoy Adv logo.png',
        'Nintendo Game BOY Color': 'Nintendo GameBoy Color logo.png', 'Nintendo Game CUBE': 'Nintendo GameCube logo.png',
        'Nintendo NES': 'Nintendo NES logo.png', 'Nintendo Switch': 'Nintendo SWITCH logo.png',
        'Nintendo Switch 2': 'Nintendo SWITCH 2 logo.png', 'Nintendo Wii': 'Nintendo Wii logo.png',
        'Nintendo Wii U': 'Nintendo Wii U logo.png', 'Panasonic 3DO': '3DO logo.png',
        'PC DOS': 'MS-DOS logo.png', 'PC Engine': 'pc engine logo.png',
        'Sega 32X': 'Sega 32x logo.png', 'Sega CD': 'sega cd logo.png',
        'Sega Genesis': 'sega genesis logo.png', 'Sega Master System': 'Sega Master System logo.png',
        'Sega Megadrive': 'sega mega drive logo.png', 'Sega Saturn': 'sega saturn logo.png',
        'Sony PS Vita': 'PS VITA logo.png', 'Sony Play Station 2': 'PS2 logo.png',
        'Sony PlayStation': 'PS1 logo.png', 'Sony PlayStation 3': 'PS3 logo.png',
        'Sony PlayStation 4': 'PS4 logo.png', 'Sony PlayStation 5': 'PS5 logo.png',
        'Sony PsP': 'PSP logo.png', 'Super Nintendo': 'Nintendo SNES logo.png',
        'Turbo 16 Grafx': 'turbo grafx logo.png', 'Windows 95': 'Microsoft Windows 95 logo.png',
        'Windows 98': 'Microsoft Windows 98 logo.png', 'Windows Xp': 'Microsoft Windows xp logo.png',
        'Windows 10': 'Microsoft Windows 10 logo.png', 'ZX Spectrum': 'zx spectrum Logo.png',
    };
    const multiPlatformLogos = {
        'PC DOS - Windows': [{ name: 'MS-DOS logo.png', title: 'PC DOS' }, { name: 'Microsoft Windows 95 logo.png', title: 'Windows' }],
        'PC DOS - Apple Macintosh': [{ name: 'MS-DOS logo.png', title: 'PC DOS' }, { name: 'MacOS Logo 1995.png', title: 'Apple Macintosh' }],
    };
    const platformTitleBase = getText('gameCard_platformLabel');
    if (multiPlatformLogos[translatedPlatform]) {
        logoHtml = '<div class="platform-logo-stack">';
        multiPlatformLogos[translatedPlatform].forEach(logo => {
            const altText = getText('gameCard_logoAlt', { platform: escapeHtml(logo.title) });
            logoHtml += `<img src="${logoBasePath}${logo.name}" alt="${altText}" class="platform-logo stacked" title="${platformTitleBase} ${escapeHtml(logo.title)}">`;
        });
        logoHtml += '</div>';
    } else if (platformLogos[translatedPlatform]) {
        const logoFileName = platformLogos[translatedPlatform];
        const altText = getText('gameCard_logoAlt', { platform: escapeHtml(translatedPlatform) });
        logoHtml = `<img src="${logoBasePath}${logoFileName}" alt="${altText}" class="platform-logo platform-logo-single" title="${platformTitleBase} ${escapeHtml(translatedPlatform)}">`;
    }
    return logoHtml;
}

/**
 * Renderiza un número específico de tarjetas de placeholder, añadiéndolas a la lista actual.
 * @param {number} [count=10] - El número de placeholders a renderizar.
 */
export function renderPlaceholderGames(count = 10) {
    if (!gameListElement) {
        console.error(getText('render_error_gameListNotInitialized'));
        return;
    }
    const frag = document.createDocumentFragment();
    const lang = getCurrentLanguage();
    const availablePlaceholderLangs = ['cn', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'pt', 'ru'];
    const langToUse = availablePlaceholderLangs.includes(lang) ? lang : 'en';
    const imageUrl = `Imagenes/placeholder-${langToUse}.png`;
    for (let i = 0; i < count; i++) {
        const li = document.createElement('li');
        li.className = 'game-card-simple placeholder-card';
        const img = document.createElement('img');
        img.className = 'placeholder-img';
        img.src = imageUrl;
        const altText = getText('render_placeholderCardAlt', { number: i + 1 });
        img.alt = altText;
        li.appendChild(img);
        frag.appendChild(li);
    }
    gameListElement.appendChild(frag);
}
