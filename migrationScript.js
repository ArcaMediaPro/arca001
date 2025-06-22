// migrationScript.js
require('dotenv').config(); // Para cargar variables de entorno como MONGO_URI
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Asegúrate de que estas rutas a tus modelos sean correctas desde la ubicación del script
const User = require('./models/User');
const Game = require('./models/Game');

// --- Configuración ---
// Raíz del directorio de uploads. Si tus rutas en BD son 'uploads/covers/img.jpg', esta es la base.
// Y si tu servidor estático sirve '/uploads' desde 'path.join(__dirname, 'uploads')'
// y el script corre desde la raíz del proyecto, 'process.cwd()' debería ser la raíz.
const UPLOADS_ROOT_DIR = path.resolve(process.cwd(), 'uploads'); // Directorio base de uploads

async function migrateFilesAndPaths() {
    try {
        console.log('Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Conectado para la migración.');

        // Obtener todos los juegos y popular el owner para acceder al username
        const games = await Game.find({}).populate('owner', 'username');
        console.log(`Se encontraron ${games.length} juegos para procesar.`);

        let gamesProcessed = 0;
        let filesMoved = 0;
        let pathsUpdatedInDb = 0;

        for (const game of games) {
            gamesProcessed++;
            console.log(`\n[${gamesProcessed}/${games.length}] Procesando juego: "${game.title}" (ID: ${game._id})`);

            if (!game.owner || !game.owner.username) {
                console.warn(`  ADVERTENCIA: Juego con ID ${game._id} no tiene 'owner' o 'owner.username'. Omitiendo este juego.`);
                continue;
            }

            const username = game.owner.username;
            // Validar username para nombres de carpeta seguros (básico)
            const safeUsername = username.replace(/[^a-zA-Z0-9_.-]/g, '_');
            if (username !== safeUsername) {
                console.warn(`  ADVERTENCIA: Username '${username}' contiene caracteres no seguros, se usará '${safeUsername}' para la carpeta.`);
            }

            let gameModified = false;

            // Función auxiliar para procesar una ruta de archivo individual
            const processSinglePath = (currentDbPath, imageTypeFolderForLog) => {
                if (!currentDbPath || typeof currentDbPath !== 'string' || !currentDbPath.startsWith('uploads/')) {
                    // console.log(`    ${imageTypeFolderForLog}: Ruta no válida o vacía: '${currentDbPath}'. Omitiendo.`);
                    return { newPath: currentDbPath, moved: false, updated: false };
                }

                const pathSegments = currentDbPath.split('/'); // ej: ['uploads', 'covers', 'imagen.jpg'] o ['uploads', 'usuario', 'covers', 'imagen.jpg']

                // Verificar si la ruta ya parece estar en el nuevo formato
                if (pathSegments.length === 4 && pathSegments[0] === 'uploads' && pathSegments[1] === safeUsername) {
                    // console.log(`    ${imageTypeFolderForLog}: Ruta '${currentDbPath}' ya parece estar en el nuevo formato. Omitiendo movimiento.`);
                    return { newPath: currentDbPath, moved: false, updated: false };
                }
                
                // Asumir formato antiguo: uploads/TIPO/archivo.jpg
                if (pathSegments.length !== 3 || pathSegments[0] !== 'uploads') {
                    console.warn(`    ${imageTypeFolderForLog}: Ruta '${currentDbPath}' no sigue el formato antiguo esperado 'uploads/TIPO/archivo.jpg'. Omitiendo.`);
                    return { newPath: currentDbPath, moved: false, updated: false };
                }

                const originalTypeFolder = pathSegments[1]; // ej: 'covers', 'screenshots'
                const filename = pathSegments[2];

                if (!['covers', 'backCovers', 'screenshots'].includes(originalTypeFolder)) {
                    console.warn(`    ${imageTypeFolderForLog}: Tipo de carpeta original desconocido '${originalTypeFolder}' en ruta ${currentDbPath}. Omitiendo.`);
                    return { newPath: currentDbPath, moved: false, updated: false };
                }

                // Construir nuevas rutas
                const newRelativeDbPath = path.join('uploads', safeUsername, originalTypeFolder, filename).replace(/\\/g, '/');
                
                // Rutas absolutas para operaciones de fs
                // process.cwd() es el directorio desde donde se ejecuta el script (asumimos raíz del proyecto)
                const oldAbsoluteFilePath = path.resolve(process.cwd(), currentDbPath);
                const newAbsoluteFilePath = path.resolve(process.cwd(), newRelativeDbPath);
                const newTargetDirectory = path.dirname(newAbsoluteFilePath);

                let fileMovedSuccessfully = false;

                if (fs.existsSync(oldAbsoluteFilePath)) {
                    try {
                        if (!fs.existsSync(newTargetDirectory)) {
                            fs.mkdirSync(newTargetDirectory, { recursive: true });
                            console.log(`    ${imageTypeFolderForLog}: Directorio creado: ${newTargetDirectory}`);
                        }
                        fs.renameSync(oldAbsoluteFilePath, newAbsoluteFilePath);
                        console.log(`    ${imageTypeFolderForLog}: MOVIDO: ${oldAbsoluteFilePath} -> ${newAbsoluteFilePath}`);
                        filesMoved++;
                        fileMovedSuccessfully = true;
                    } catch (moveError) {
                        console.error(`    ${imageTypeFolderForLog}: ERROR al mover ${oldAbsoluteFilePath} a ${newAbsoluteFilePath}:`, moveError.message);
                    }
                } else {
                    console.warn(`    ${imageTypeFolderForLog}: Archivo antiguo NO ENCONTRADO en ${oldAbsoluteFilePath}. (Ruta en BD: ${currentDbPath})`);
                    // Si el archivo no está en la ruta antigua, verificar si ya está en la nueva (ej. script interrumpido)
                    if(fs.existsSync(newAbsoluteFilePath)){
                        console.log(`    ${imageTypeFolderForLog}: Archivo ya existe en la NUEVA ubicación: ${newAbsoluteFilePath}. Se actualizará la BD si es necesario.`);
                        fileMovedSuccessfully = true; // Considerar como "listo para actualizar BD"
                    }
                }

                if (fileMovedSuccessfully && currentDbPath !== newRelativeDbPath) {
                    return { newPath: newRelativeDbPath, moved: true, updated: true };
                } else if (currentDbPath !== newRelativeDbPath && fs.existsSync(newAbsoluteFilePath) && !fs.existsSync(oldAbsoluteFilePath) ) {
                    // El archivo está en el nuevo lugar, pero la BD no lo refleja (tal vez un intento anterior movió el archivo pero no guardó la BD)
                    return { newPath: newRelativeDbPath, moved: false, updated: true };
                }
                
                return { newPath: currentDbPath, moved: false, updated: false }; // No se movió o no se debe actualizar la BD
            };

            // Procesar cover
            if (game.cover) {
                const result = processSinglePath(game.cover, "Cover");
                if (result.updated) {
                    game.cover = result.newPath;
                    gameModified = true;
                }
            }

            // Procesar backCover
            if (game.backCover) {
                const result = processSinglePath(game.backCover, "BackCover");
                if (result.updated) {
                    game.backCover = result.newPath;
                    gameModified = true;
                }
            }

            // Procesar screenshots
            if (game.screenshots && Array.isArray(game.screenshots) && game.screenshots.length > 0) {
                const newScreenshotPaths = [];
                let screenshotsChanged = false;
                for (let i = 0; i < game.screenshots.length; i++) {
                    const ssPath = game.screenshots[i];
                    const result = processSinglePath(ssPath, `Screenshot ${i + 1}`);
                    newScreenshotPaths.push(result.newPath);
                    if (result.updated) {
                        screenshotsChanged = true;
                    }
                }
                if (screenshotsChanged) {
                    game.screenshots = newScreenshotPaths;
                    gameModified = true;
                }
            }

            if (gameModified) {
                try {
                    await game.save();
                    pathsUpdatedInDb++;
                    console.log(`  Juego ID ${game._id} actualizado en la BD.`);
                } catch (saveError) {
                    console.error(`  ERROR guardando juego ID ${game._id} en la BD:`, saveError.message);
                }
            } else {
                // console.log(`  Juego ID ${game._id} no tuvo modificaciones de ruta de archivo necesarias.`);
            }
        }

        console.log('\n--- Resumen de la Migración ---');
        console.log(`Juegos totales procesados: ${games.length}`);
        console.log(`Archivos físicos movidos exitosamente: ${filesMoved}`);
        console.log(`Documentos de juego actualizados en la BD: ${pathsUpdatedInDb}`);
        console.log('---------------------------------');
        console.log('Migración de archivos y rutas completada.');

    } catch (error) {
        console.error('ERROR CRÍTICO durante el script de migración:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Desconectado de MongoDB.');
    }
}

// --- Preguntar confirmación antes de ejecutar ---
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("************************************************************************************");
console.log("* ADVERTENCIA: Este script modificará archivos en tu sistema y datos en MongoDB.   *");
console.log("* ASEGÚRATE DE HABER REALIZADO UNA COPIA DE SEGURIDAD COMPLETA DE TU BASE DE DATOS  *");
console.log("* Y DE TU CARPETA 'uploads' ANTES DE CONTINUAR.                                  *");
console.log("************************************************************************************");

readline.question('¿Estás ABSOLUTAMENTE SEGURO de que quieres continuar con la migración? (escribe "si" para continuar): ', (answer) => {
  if (answer.toLowerCase() === 'si' || answer.toLowerCase() === 'sí') {
    console.log('Iniciando migración...');
    migrateFilesAndPaths();
  } else {
    console.log('Migración cancelada por el usuario.');
    mongoose.disconnect().catch(err => console.error('Error al desconectar MongoDB tras cancelación:', err));
  }
  readline.close();
});