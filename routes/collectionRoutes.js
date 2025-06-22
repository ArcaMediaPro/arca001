// routes/collectionRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Game = require('../models/Game');
const User = require('../models/User');

console.log('>>> [collectionRoutes.js] Archivo cargado y ejecutándose.');

// --- RUTA PARA EXPORTAR COLECCIÓN DEL USUARIO ACTUAL ---
router.get('/export', authMiddleware, async (req, res) => {
    console.log('>>> [collectionRoutes.js] Petición GET a /api/collections/export recibida.');
    try {
        const userId = req.user.id; // ID del usuario autenticado
        console.log(`>>> [collectionRoutes.js] /export - Exportando colección para ownerId: ${userId}, Username: ${req.user.username}`);

        const games = await Game.find({ owner: userId }).lean(); // CORREGIDO: Filtrar por 'owner'

        const gamesToExport = games.map(game => {
            // Desestructurar incluyendo 'owner' para asegurar que no se pasa si es igual a gameOwnerField
            // y también para excluirlo explícitamente junto con los otros campos meta.
            const { _id, owner: gameOwnerField, userId: gameUserIdField, __v, createdAt, updatedAt, ...gameData } = game;
            return gameData; // gameData ya no contendrá _id, owner, userId, __v, createdAt, updatedAt
        });

        const filename = `coleccion_juegos_${req.user.username}_${new Date().toISOString().slice(0,10)}.json`;
        console.log(`>>> [collectionRoutes.js] /export - Nombre de archivo generado: ${filename}`);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(gamesToExport);
        console.log(`>>> [collectionRoutes.js] /export - Respuesta de exportación enviada con ${gamesToExport.length} juegos.`);

    } catch (error) {
        console.error(">>> [collectionRoutes.js] /export - Error al exportar colección:", error);
        res.status(500).json({ message: "Error interno del servidor al exportar la colección." });
    }
});

// --- RUTA PARA IMPORTAR COLECCIÓN DEL USUARIO ACTUAL (CON LÓGICA DE FUSIÓN) ---
router.post('/import', authMiddleware, async (req, res) => {
    console.log('>>> [collectionRoutes.js] Petición POST a /api/collections/import (MODO FUSIÓN) recibida.');
    try {
        const userId = req.user.id; // Este es el ID del usuario QUE ESTÁ IMPORTANDO (sabri), se usará para el campo 'owner'
        const importedGamesData = req.body.games;
        console.log(`>>> [collectionRoutes.js] /import - Importando (MODO FUSIÓN) para ownerId: ${userId}, Username: ${req.user.username}, Cantidad de juegos en archivo: ${importedGamesData.length}`);

        if (!Array.isArray(importedGamesData)) {
            console.warn(">>> [collectionRoutes.js] /import - Formato de importación inválido. No es un array.");
            return res.status(400).json({ message: "Formato de importación inválido. Se esperaba un array de juegos." });
        }

        // CORREGIDO: Filtrar por 'owner'
        const existingUserGames = await Game.find({ owner: userId }).lean();
        const existingGamesMap = new Map();

        existingUserGames.forEach(game => {
            // CORREGIDO: Usar game.owner en el log para consistencia y depuración
            console.log(`>>> [collectionRoutes.js] /import - Mapeando juego existente de '${req.user.username}': Título='${game.title}', Plataforma='${game.platform}', OwnerID_en_DB='${game.owner}'`);
            if (game.title && game.platform) {
                const key = `${game.title.trim().toLowerCase()}_${game.platform.trim().toLowerCase()}`;
                existingGamesMap.set(key, game);
            } else {
                console.warn(`>>> [collectionRoutes.js] /import - Juego existente de '${req.user.username}' omitido del mapa (falta título o plataforma):`, JSON.stringify(game, null, 2));
            }
        });
        console.log(`>>> [collectionRoutes.js] /import - ${existingUserGames.length} juegos existentes encontrados y mapeados para el usuario ${req.user.username}. Iniciando comparación.`);

        let updatedCount = 0;
        let addedCount = 0;
        const operations = [];

        for (const importedGame of importedGamesData) {
            console.log(`>>> [collectionRoutes.js] /import - PROCESANDO JUEGO IMPORTADO: Título='${importedGame.title}', Plataforma='${importedGame.platform}'`);
            
            if (!importedGame.title || !importedGame.platform) {
                console.warn(`>>> [collectionRoutes.js] /import - Juego importado OMITIDO (falta título o plataforma):`, JSON.stringify(importedGame));
                continue;
            }

            const importKey = `${importedGame.title.trim().toLowerCase()}_${importedGame.platform.trim().toLowerCase()}`;
            console.log(`>>> [collectionRoutes.js] /import - Generada importKey: '${importKey}' para el juego "${importedGame.title}"`);
            
            const existingGameDocument = existingGamesMap.get(importKey);

            if (existingGameDocument) {
                console.log(`>>> [collectionRoutes.js] /import - Coincidencia encontrada en existingGamesMap para la clave '${importKey}'. Documento existente: _id=${existingGameDocument._id}. Preparando actualización.`);
                const { owner: ownerFromJson, _id, userId: userIdFromJson, ...gameDataFromImport } = importedGame; // Excluir 'owner' y 'userId' del JSON
                const updateData = {
                    ...gameDataFromImport,
                    owner: userId, // CORREGIDO: Asignar al campo 'owner' el ID del usuario que importa
                };

                operations.push({
                    updateOne: {
                        filter: { _id: existingGameDocument._id, owner: userId }, // CORREGIDO: Filtrar por 'owner'
                        update: { $set: updateData }
                    }
                });
                updatedCount++;
            } else {
                console.log(`>>> [collectionRoutes.js] /import - SIN Coincidencia en existingGamesMap para la clave '${importKey}'. Preparando inserción para juego nuevo ("${importedGame.title}").`);
                const { owner: ownerFromJson, _id, userId: userIdFromJson, ...gameDataFromImport } = importedGame; // Excluir 'owner' y 'userId' del JSON
                const newGameData = {
                    ...gameDataFromImport,
                    owner: userId, // CORREGIDO: Asignar al campo 'owner' el ID del usuario que importa
                    cover: gameDataFromImport.cover || null,
                    backCover: gameDataFromImport.backCover || null,
                    screenshots: gameDataFromImport.screenshots || [],
                };
                operations.push({
                    insertOne: {
                        document: newGameData
                    }
                });
                addedCount++;
            }
        }

        if (operations.length > 0) {
            console.log(`>>> [collectionRoutes.js] /import - Ejecutando ${operations.length} operaciones (adds/updates) en la BD.`);
            try {
                const bulkWriteResult = await Game.bulkWrite(operations, { ordered: false });
                console.log(">>> [collectionRoutes.js] /import - Resultado de bulkWrite:", JSON.stringify(bulkWriteResult, null, 2));
            } catch (bulkError) {
                console.error(">>> [collectionRoutes.js] /import - Error durante Game.bulkWrite:", bulkError);
                return res.status(500).json({ 
                    message: "Error durante el procesamiento en lote de la base de datos.", 
                    errorDetails: bulkError.message,
                    writeErrors: bulkError.writeErrors ? bulkError.writeErrors.map(e => ({ index: e.index, code: e.code, errmsg: e.errmsg })) : null
                });
            }
        } else {
            console.log(">>> [collectionRoutes.js] /import - No se realizaron operaciones en la BD (sin juegos nuevos o para actualizar).");
        }

        const successMessage = `Colección procesada: ${addedCount} juegos añadidos y ${updatedCount} juegos actualizados para ${req.user.username}.`;
        res.status(200).json({
            message: successMessage,
            added: addedCount,
            updated: updatedCount
        });
        console.log(`>>> [collectionRoutes.js] /import - ${successMessage}`);

    } catch (error) {
        console.error(">>> [collectionRoutes.js] /import - Error al importar (MODO FUSIÓN) colección:", error);
        let errorMessage = "Error interno del servidor al importar la colección.";
        if (error.name === 'ValidationError') {
            errorMessage = "Error de validación en los datos importados: " + error.message;
            return res.status(400).json({ message: errorMessage });
        }
        if (!res.headersSent) {
            res.status(500).json({ message: errorMessage, errorDetails: process.env.NODE_ENV !== 'production' ? error.message : undefined });
        }
    }
});

console.log('>>> [collectionRoutes.js] Enrutador configurado y listo para exportar.');
module.exports = router;