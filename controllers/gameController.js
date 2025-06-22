// controllers/gameController.js (VERSIÓN ACTUALIZADA PARA CLOUDINARY)
const Game = require('../models/Game');
const User = require('../models/User');
const cloudinary = require('../config/cloudinaryConfig');
const { validationResult } = require('express-validator');
const path = require('path');

const PLAN_LIMITS = {
    free: 50,
    medium: 500,
    premium: Infinity,
};

// --- FUNCIONES AUXILIARES PARA CLOUDINARY ---

/**
 * Extrae el public_id de una URL de Cloudinary. Es necesario para poder borrar la imagen.
 * @param {string} imageUrl - La URL completa de la imagen en Cloudinary.
 * @returns {string|null} El public_id o null si no se puede extraer.
 */
const getPublicIdFromUrl = (imageUrl) => {
    if (!imageUrl) return null;
    try {
        // Extrae la parte de la URL que constituye el public_id, incluyendo la carpeta.
        // Ejemplo: de "http.../upload/v.../catalogador_pro/user/covers/cover-123.jpg"
        // extrae "catalogador_pro/user/covers/cover-123"
        const regex = /upload\/(?:v\d+\/)?(.*)\.(?:jpe?g|png|gif|webp)/;
        const matches = imageUrl.match(regex);
        return matches ? matches[1] : null;
    } catch (e) {
        console.error("Error extrayendo public_id de la URL:", imageUrl, e);
        return null;
    }
};


/**
 * Elimina un archivo de Cloudinary usando su public_id.
 * @param {string} publicId - El public_id del archivo a eliminar.
 */
const deleteFileFromCloudinary = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Error borrando archivo de Cloudinary:", publicId, error);
    }
};

/**
 * Elimina un archivo de Cloudinary a partir de su URL completa.
 * @param {string} fileUrl - La URL del archivo a eliminar.
 */
const deleteFileByUrl = async (fileUrl) => {
    if (!fileUrl) return;
    const publicId = getPublicIdFromUrl(fileUrl);
    if (publicId) {
        await deleteFileFromCloudinary(publicId);
    }
};


/**
 * En caso de error en la creación/actualización del juego, elimina los archivos que se hayan subido a Cloudinary.
 * @param {object} req - El objeto de la petición, que contiene req.files.
 */
const cleanupUploadedFilesOnError = async (req) => {
    if (!req.files) return;
    const deletionPromises = [];
    if (req.files.cover) req.files.cover.forEach(f => deletionPromises.push(deleteFileByUrl(f.path)));
    if (req.files.backCover) req.files.backCover.forEach(f => deletionPromises.push(deleteFileByUrl(f.path)));
    if (req.files.screenshots) req.files.screenshots.forEach(f => deletionPromises.push(deleteFileByUrl(f.path)));
    await Promise.all(deletionPromises);
};


// --- CONTROLADORES DE RUTA ---

// OBTENER TODOS LOS JUEGOS (Función existente, no requiere cambios)
const getGames = async (req, res) => {
    try {
        const games = await Game.find({ owner: req.user.id }).sort({ title: 1 });
        res.status(200).json(games);
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor al obtener juegos' });
    }
};


// CREAR UN NUEVO JUEGO
const createGame = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        await cleanupUploadedFilesOnError(req);
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('subscriptionPlan');
        if (!user) {
            await cleanupUploadedFilesOnError(req);
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const plan = user.subscriptionPlan;
        const limit = PLAN_LIMITS[plan];

        if (limit !== Infinity) {
            const currentGameCount = await Game.countDocuments({ owner: userId });
            if (currentGameCount >= limit) {
                await cleanupUploadedFilesOnError(req);
                return res.status(403).json({
                    message: `Has alcanzado el límite de ${limit} títulos para tu plan "${plan}".`,
                    messageKey: 'gameManager_planLimitReached',
                    messageParams: { limit, plan }
                });
            }
        }
        
        const { title, platform, year, developer, publisher, genre, format, quantity,
            capacity, language, region, ageRating, barcode, condition, progress,
            multiplayer, numPlayers, additionalInfo, copyProtection, rating,
            systemRequirements, isLoaned, loanedTo, loanDate } = req.body;
            
        const parsedIsLoaned = (isLoaned === 'true' || isLoaned === true);
        let parsedSystemRequirements = {};
        if (typeof systemRequirements === 'string') {
            try { parsedSystemRequirements = JSON.parse(systemRequirements || '{}'); } catch (e) { parsedSystemRequirements = {}; }
        } else if (typeof systemRequirements === 'object' && systemRequirements !== null) {
            parsedSystemRequirements = systemRequirements;
        }

        const gameData = {
            title, platform, genre, format, owner: userId,
            rating: rating ? parseInt(rating, 10) : 0,
            year: year ? parseInt(year, 10) : null,
            developer: developer || '', publisher: publisher || '',
            quantity: quantity ? parseInt(quantity, 10) : null,
            capacity: capacity || '', language: language || '',
            region: region || '', ageRating: ageRating || '',
            barcode: barcode || '', condition: condition || '',
            progress: progress || 'Pendiente',
            multiplayer: (multiplayer === 'true' || multiplayer === true),
            numPlayers: (multiplayer === 'true' || multiplayer === true) && numPlayers ? parseInt(numPlayers, 10) : null,
            additionalInfo: additionalInfo || '', copyProtection: copyProtection || '',
            systemRequirements: parsedSystemRequirements,
            isLoaned: parsedIsLoaned,
            loanedTo: parsedIsLoaned ? (loanedTo || '') : '',
            loanDate: parsedIsLoaned && loanDate ? new Date(loanDate) : null,
        };

        // Asigna las URLs de Cloudinary a los campos del juego
        if (req.files) {
            if (req.files.cover?.[0]) gameData.cover = req.files.cover[0].path;
            if (req.files.backCover?.[0]) gameData.backCover = req.files.backCover[0].path;
            if (req.files.screenshots?.length > 0) {
                gameData.screenshots = req.files.screenshots.map(file => file.path);
            }
        }

        const newGame = await Game.create(gameData);
        res.status(201).json(newGame);

    } catch (error) {
        await cleanupUploadedFilesOnError(req);
        if (error.name === 'ValidationError') {
            const mongooseErrors = Object.values(error.errors).map(el => ({ msg: el.message, path: el.path }));
            return res.status(400).json({ errors: mongooseErrors });
        }
        res.status(500).json({ message: 'Error del servidor al crear el juego.' });
    }
};

// OBTENER UN JUEGO POR ID (Función existente, no requiere cambios)
const getGameById = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const gameId = req.params.id;
        const game = await Game.findOne({ _id: gameId, owner: req.user.id });
        if (!game) {
            return res.status(404).json({ message: 'Juego no encontrado o no tienes permisos para verlo.' });
        }
        res.status(200).json(game);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'ID de juego con formato inválido.' });
        }
        res.status(500).json({ message: 'Error del servidor al obtener el juego' });
    }
};


// ACTUALIZAR UN JUEGO EXISTENTE
const updateGame = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        await cleanupUploadedFilesOnError(req);
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const gameId = req.params.id;
        const game = await Game.findOne({ _id: gameId, owner: req.user.id });

        if (!game) {
            await cleanupUploadedFilesOnError(req);
            return res.status(404).json({ message: 'Juego no encontrado o no tienes permisos para actualizarlo.' });
        }
        
        const updates = req.body;
        const allowedFields = [
            'title', 'platform', 'year', 'developer', 'publisher', 'genre', 'format', 'quantity',
            'capacity', 'language', 'region', 'ageRating', 'barcode', 'condition', 'progress',
            'multiplayer', 'numPlayers', 'additionalInfo', 'copyProtection', 'rating'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (['year', 'quantity', 'numPlayers', 'rating'].includes(field)) {
                    game[field] = updates[field] ? parseInt(updates[field], 10) : (field === 'rating' ? 0 : null);
                } else if (field === 'multiplayer') {
                    game[field] = (updates[field] === 'true' || updates[field] === true);
                } else {
                    game[field] = updates[field];
                }
            }
        });
        
        if (updates.systemRequirements !== undefined) {
            if (typeof updates.systemRequirements === 'string') {
                try { game.systemRequirements = JSON.parse(updates.systemRequirements || '{}'); } catch (e) { /* no-op */ }
            } else if (typeof updates.systemRequirements === 'object') {
                game.systemRequirements = updates.systemRequirements;
            }
        }

        if (updates.isLoaned !== undefined) {
            const parsedIsLoaned = (updates.isLoaned === 'true' || updates.isLoaned === true);
            game.isLoaned = parsedIsLoaned;
            game.loanedTo = parsedIsLoaned ? (updates.loanedTo || '') : '';
            game.loanDate = parsedIsLoaned && updates.loanDate ? new Date(updates.loanDate) : null;
        }
        
        const deletionPromises = [];
        if (req.files) {
            if (req.files.cover?.[0]) {
                if (game.cover) deletionPromises.push(deleteFileByUrl(game.cover));
                game.cover = req.files.cover[0].path;
            }
            if (req.files.backCover?.[0]) {
                if (game.backCover) deletionPromises.push(deleteFileByUrl(game.backCover));
                game.backCover = req.files.backCover[0].path;
            }
            if (req.files.screenshots?.length > 0) {
                const newScreenshotUrls = req.files.screenshots.map(file => file.path);
                // Opcional: si quieres borrar las viejas screenshots al subir nuevas, aquí iría la lógica.
                // Por ahora, solo añade las nuevas y mantiene un máximo de 6.
                game.screenshots = [...(game.screenshots || []), ...newScreenshotUrls].slice(-6);
            }
        }
        await Promise.all(deletionPromises);
        
        const updatedGameDoc = await game.save();
        res.status(200).json(updatedGameDoc);

    } catch (error) {
        await cleanupUploadedFilesOnError(req);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ errors: Object.values(error.errors).map(el => ({ msg: el.message, path: el.path })) });
        }
        res.status(500).json({ message: 'Error del servidor al actualizar el juego' });
    }
};


// ELIMINAR UN JUEGO
const deleteGame = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const gameId = req.params.id;
        const gameToDelete = await Game.findOneAndDelete({ _id: gameId, owner: req.user.id });
        if (!gameToDelete) {
            return res.status(404).json({ message: 'Juego no encontrado o no tienes permisos para eliminarlo.' });
        }
        
        const deletionPromises = [];
        if (gameToDelete.cover) deletionPromises.push(deleteFileByUrl(gameToDelete.cover));
        if (gameToDelete.backCover) deletionPromises.push(deleteFileByUrl(gameToDelete.backCover));
        if (gameToDelete.screenshots?.length > 0) {
            gameToDelete.screenshots.forEach(url => deletionPromises.push(deleteFileByUrl(url)));
        }
        await Promise.all(deletionPromises);
        
        res.status(200).json({ message: 'Juego eliminado correctamente', id: gameId });
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'ID de juego con formato inválido.' });
        }
        res.status(500).json({ message: 'Error del servidor al eliminar el juego' });
    }
};


// ELIMINAR CAPTURAS DE PANTALLA ESPECÍFICAS
const deleteScreenshots = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { id: gameId } = req.params;
    const { screenshotsToDelete } = req.body; // Array de URLs
    try {
        const game = await Game.findOne({ _id: gameId, owner: req.user.id });
        if (!game) return res.status(404).json({ message: 'Juego no encontrado.' });
        
        const deletionPromises = screenshotsToDelete.map(url => deleteFileByUrl(url));
        await Promise.all(deletionPromises);
        
        game.screenshots = game.screenshots.filter(url => !screenshotsToDelete.includes(url));
        const updatedGame = await game.save();

        res.status(200).json({
            message: 'Capturas de pantalla seleccionadas eliminadas.',
            game: updatedGame,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error interno del servidor al eliminar capturas.' });
    }
};


// --- EXPORTACIONES DEL MÓDULO ---
module.exports = {
    getGames,
    createGame,
    getGameById,
    updateGame,
    deleteGame,
    deleteScreenshots
};