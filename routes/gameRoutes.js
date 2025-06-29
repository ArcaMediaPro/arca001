// routes/gameRoutes.js (VERSIÓN COMPLETA Y FINAL PARA CLOUDINARY)
const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinaryConfig'); // Importamos nuestra config de Cloudinary
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const Game = require('../models/Game');
const axios = require('axios');

const {
    createGame,
    getGameById,
    updateGame,
    deleteGame,
    deleteScreenshots
} = require('../controllers/gameController');


function slugify(text) {
    if (!text) return 'sin-titulo';
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')           // Reemplaza espacios con -
        .replace(/[^\w\-]+/g, '')       // Elimina caracteres no alfanuméricos (excepto -)
        .replace(/\-\-+/g, '-')         // Reemplaza múltiples - con uno solo
        .replace(/^-+/, '')             // Quita - del principio
        .replace(/-+$/, '')             // Quita - del final
        .substring(0, 50);              // Limita la longitud a 50 caracteres
}



// --- NUEVA Configuración de Multer con CloudinaryStorage ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // La lógica para la carpeta del usuario ya es correcta y se mantiene.
        let userFolderName = 'unauthenticated';
        if (req.user && req.user.username && req.user._id) {
            const usernameSlug = slugify(req.user.username); 
            userFolderName = `${usernameSlug}-${req.user._id}`;
        }
        
        let imageTypeFolder = 'others';
        if (file.fieldname === 'cover') {
            imageTypeFolder = 'covers';
        } else if (file.fieldname === 'backCover') {
            imageTypeFolder = 'backCovers';
        } else if (file.fieldname === 'screenshots') {
            imageTypeFolder = 'screenshots';
        }

        // --- INICIO DE LA CORRECCIÓN ---
        // No podemos usar req.body.title aquí. En su lugar, usamos el nombre del archivo original.
        // Esto es más robusto y descriptivo.
        
        // 1. Tomamos el nombre original del archivo sin la extensión (ej. "Mi Screenshot Genial.jpg" -> "Mi Screenshot Genial")
        const originalNameWithoutExt = file.originalname.split('.').slice(0, -1).join('.');
        
        // 2. Lo "slugificamos" para que sea un nombre de archivo válido
        const fileName = slugify(originalNameWithoutExt);
        
        // 3. Añadimos un sufijo único para evitar sobreescrituras
        const uniqueSuffix = Date.now();
        
        return {
            folder: `catalogador_pro/${userFolderName}/${imageTypeFolder}`,
            resource_type: 'image',
            // 4. Se crea el public_id final, que ahora es válido y muy descriptivo.
            public_id: `${fileName}-${uniqueSuffix}`
        };
        // --- FIN DE LA CORRECCIÓN ---
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('¡Solo se permiten archivos de imagen!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Límite 10MB
    fileFilter: fileFilter,
});


// --- FIN DE LA NUEVA CONFIGURACIÓN ---


// --- Middleware para verificar el token CSRF (Tu código original) ---
const verifyCsrfToken = (req, res, next) => {
    const csrfTokenFromCookie = req.cookies._csrfToken; 
    const csrfTokenFromHeader = req.headers['x-csrf-token']; 

    if (!csrfTokenFromCookie || !csrfTokenFromHeader || csrfTokenFromCookie !== csrfTokenFromHeader) { 
        console.warn('CSRF Token Invalido o Ausente. Bloqueando POST/PUT/DELETE.'); 
        return res.status(403).json({ message: 'CSRF token validation failed or token missing.' }); 
    }
    next();
};

// --- Cadenas de Validación y Sanitización (Tu código original) ---
const gameValidationRules = [ 
    body('title').trim().notEmpty().withMessage('El título es obligatorio.'), 
    body('platform').trim().notEmpty().withMessage('La plataforma es obligatoria.'), 
    body('year').optional({ checkFalsy: true }).isInt({ min: 1950, max: 2099 }).withMessage('El año debe ser un número válido entre 1950 y 2099.').toInt(), 
    body('developer').optional({ checkFalsy: true }).trim().escape(), 
    body('publisher').optional({ checkFalsy: true }).trim().escape(), 
    body('genre').trim().notEmpty().withMessage('El género es obligatorio.'), 
    body('format').trim().notEmpty().withMessage('El formato es obligatorio.'), 
    body('quantity').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero positivo.').toInt(), 
    body('capacity').optional({ checkFalsy: true }).trim().escape(), 
    body('language').optional({ checkFalsy: true }).trim().escape(), 
    body('region').optional({ checkFalsy: true }).trim().escape(), 
    body('ageRating').optional({ checkFalsy: true }).trim().escape(), 
    body('barcode').optional({ checkFalsy: true }).trim().escape(), 
    body('condition').optional({ checkFalsy: true }).trim().escape(), 
    body('progress').optional({ checkFalsy: true }).trim().escape(), 
    body('multiplayer').trim() 
        .customSanitizer(value => { 
            if (value === 'true') return true; 
            if (value === 'false') return false; 
            return value; 
        })
        .isBoolean().withMessage('Multijugador debe ser un valor booleano (true/false).'), 
    body('numPlayers').optional({ checkFalsy: true }) 
        .isInt({ min: 1 }).withMessage('El número de jugadores debe ser un entero positivo.').toInt(), 
    body('additionalInfo').optional({ checkFalsy: true }).trim().escape(), 
    body('copyProtection').optional({ checkFalsy: true }).trim().escape(), 
    body('rating').notEmpty().withMessage('El puntaje es obligatorio.').isInt({ min: 0, max: 10 }).withMessage('El puntaje debe ser un número entre 0 y 10.').toInt(), 
    body('systemRequirements') 
        .optional({ checkFalsy: true }) 
        .customSanitizer(value => { 
            if (typeof value === 'string') { 
                try { return JSON.parse(value); } catch (e) { return {}; } 
            }
            return value; 
        })
        .isObject().withMessage('Los requisitos del sistema deben ser un objeto.'), 
    body('isLoaned').trim() 
        .customSanitizer(value => { 
            if (value === 'true') return true; 
            if (value === 'false') return false; 
            return value; 
        })
        .isBoolean().withMessage('El estado de préstamo (isLoaned) debe ser un valor booleano.'), 
    body('loanedTo').optional({ checkFalsy: true }).trim().escape() 
        .if(body('isLoaned').custom(value => value === true || value === 'true')) 
        .notEmpty().withMessage('El campo "Prestado A" es obligatorio si el juego está marcado como prestado.'), 
    body('loanDate').optional({ checkFalsy: true }) 
        .if(body('isLoaned').custom(value => value === true || value === 'true')) 
        .notEmpty().withMessage('La "Fecha de Préstamo" es obligatoria si el juego está marcado como prestado.') 
        .isISO8601().toDate().withMessage('La fecha de préstamo debe ser una fecha válida.'), 
];
const idParamValidation = [ 
    param('id').isMongoId().withMessage('El ID proporcionado no es válido.') 
];
const deleteScreenshotsValidationRules = [ 
    body('screenshotsToDelete') 
        .isArray({ min: 1 }).withMessage('Se requiere un array con al menos una ruta de captura para eliminar.') 
        .custom((value) => { 
            if (!value.every(item => typeof item === 'string' && item.trim() !== '')) { 
                throw new Error('Todas las rutas en screenshotsToDelete deben ser strings no vacíos.'); 
            }
            return true; 
        })
];

// Campos para Multer (sin cambios)
const gameUploadFields = upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'backCover', maxCount: 1 },
    { name: 'screenshots', maxCount: 6 }
]);


// --- Definición de Rutas CRUD ---

// GET /api/games - Obtener juegos con paginación, filtros y ordenación (Tu código original)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 20; 
        const skip = (page - 1) * limit; 
        let query = {}; 

        if (req.user && req.user.id) { 
            query.owner = req.user.id; 
        } else {
            console.warn("GET /api/games: req.user o req.user.id no encontrado después de authMiddleware. Esto no debería suceder.");
            return res.status(500).json({ message: "Error de autenticación interna." });
        }

        if (req.query.search) { 
            query.title = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); 
        }
        if (req.query.genre) query.genre = req.query.genre; 
        if (req.query.platform) query.platform = req.query.platform; 
        if (req.query.year && /^\d{4}$/.test(req.query.year)) query.year = parseInt(req.query.year); 

        let sortOptions = { title: 1 }; 
        if (req.query.sort) { 
            const [rawField, order] = req.query.sort.split('-'); 
            let actualField = rawField; 
            if (rawField === 'date') { 
                actualField = 'createdAt'; 
            }
            if (actualField && (order === 'asc' || order === 'desc')) { 
                sortOptions = { [actualField]: order === 'asc' ? 1 : -1 }; 
            }
        }

        const totalGames = await Game.countDocuments(query); 
        const games = await Game.find(query).sort(sortOptions).skip(skip).limit(limit).lean(); 

        res.json({ 
            games, 
            currentPage: page, 
            totalPages: Math.ceil(totalGames / limit), 
            totalGames, 
            hasNextPage: page < Math.ceil(totalGames / limit) 
        });
    } catch (error) {
        console.error("Error en GET /api/games:", error); 
        res.status(500).json({ message: "Error del servidor al obtener juegos.", error: error.message }); 
    }
});

// GET /api/games/platforms-summary - Obtener resumen de plataformas (Tu código original)
router.get('/platforms-summary', authMiddleware, async (req, res) => {
    try {
        let matchStage = {}; 
        if (req.user && req.user.id && mongoose.Types.ObjectId.isValid(req.user.id)) { 
            matchStage.owner = new mongoose.Types.ObjectId(req.user.id); 
        }

        const aggregationPipeline = []; 
        if (Object.keys(matchStage).length > 0) { 
            aggregationPipeline.push({ $match: matchStage }); 
        }

        aggregationPipeline.push( 
            { $group: { _id: "$platform", count: { $sum: 1 } } }, 
            { $project: { _id: 0, platform: "$_id", count: 1 } }, 
            { $sort: { platform: 1 } } 
        );

        const platformSummaries = await Game.aggregate(aggregationPipeline); 
        res.json(platformSummaries); 

    } catch (error) {
        console.error("Error crítico en GET /api/games/platforms-summary:", error); 
        res.status(500).json({ message: "Error del servidor al obtener el resumen de plataformas.", error: error.message }); 
    }
});

// GET /api/games/genres - Obtener géneros únicos (Tu código original)
router.get('/genres', authMiddleware, async (req, res) => {
    try {
        const genres = await Game.distinct('genre', { owner: req.user.id }).exec();
        const cleanedGenres = genres.filter(genre => genre && typeof genre === 'string' && genre.trim() !== '');
        res.json(cleanedGenres.sort());
    } catch (error) {
        console.error("CRITICAL ERROR en GET /games/genres:", error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la lista de géneros.' });
    }
});


// GET /api/games/:id - Obtener un juego por ID
router.get('/:id', authMiddleware, idParamValidation, getGameById);

// POST /api/games - Crear un nuevo juego
router.post('/',
    authMiddleware,
    verifyCsrfToken,
    (req, res, next) => { 
        gameUploadFields(req, res, function (err) {
            if (err) {
                console.error("Error de Multer/Cloudinary (POST):", err);
                return res.status(400).json({ message: `Error durante la carga: ${err.message}` });
            }
            next();
        });
    },
    gameValidationRules,
    createGame
);

// PUT /api/games/:id - Actualizar un juego existente
router.put('/:id',
    authMiddleware,
    verifyCsrfToken,
    (req, res, next) => { 
        gameUploadFields(req, res, function (err) {
            if (err) {
                console.error("Error de Multer/Cloudinary (PUT):", err);
                return res.status(400).json({ message: `Error durante la carga para actualización: ${err.message}` });
            }
            next();
        });
    },
    idParamValidation,
    gameValidationRules,
    updateGame
);

// DELETE /api/games/:id - Eliminar un juego
router.delete('/:id', authMiddleware, verifyCsrfToken, idParamValidation, deleteGame);

// PUT /api/games/:id/screenshots - Eliminar capturas de pantalla específicas
router.put('/:id/screenshots',
    authMiddleware,
    verifyCsrfToken, 
    idParamValidation, 
    deleteScreenshotsValidationRules, 
    (req, res, next) => { 
        const errors = validationResult(req); 
        if (!errors.isEmpty()) { 
            return res.status(400).json({ errors: errors.array() }); 
        }
        next(); 
    },
    deleteScreenshots 
);

					// --- INICIO: RUTA PARA BÚSQUEDA EXTERNA ---

router.get('/search-external', authMiddleware, async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ message: 'Se necesita un término de búsqueda.' });
    }

    const RAWG_API_KEY = process.env.RAWG_API_KEY;
    if (!RAWG_API_KEY) {
        return res.status(500).json({ message: 'La clave de API para el servicio de juegos no está configurada en el servidor.' });
    }

    try {
        const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=10`;
        const response = await axios.get(url);

        // Simplificamos los datos antes de enviarlos al frontend
        const simplifiedResults = response.data.results.map(game => ({
            id: game.id,
            name: game.name,
            released: game.released,
            background_image: game.background_image,
            platforms: game.platforms.map(p => p.platform.name),
            genres: game.genres.map(g => g.name),
            // Guardamos los desarrolladores y distribuidores para el autocompletado
            developers: game.developers?.map(d => d.name) || [],
            publishers: game.publishers?.map(p => p.name) || []
        }));

        res.json(simplifiedResults);

    } catch (error) {
        console.error('Error al buscar juegos en la API externa:', error.message);
        res.status(500).json({ message: 'Error al comunicarse con el servicio externo de búsqueda de juegos.' });
    }
});

						// --- FIN: RUTA PARA BÚSQUEDA EXTERNA ---

module.exports = router;