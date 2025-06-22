// cleanupOrphans.js
// USO: node cleanupOrphans.js
// DESCRIPCIÓN: Revisa la integridad de los datos en la base de datos y genera un reporte.

require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const inquirer = require('inquirer');
const Game = require('./models/Game');
const chalk = require('chalk');
const ora = require('ora');

// --- Configuración ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PROJECT_FOLDER = 'catalogador_pro';

// --- Funciones Auxiliares ---

/**
 * Extrae el public_id de una URL de Cloudinary.
 * @param {string} url - La URL completa de la imagen.
 * @returns {string|null} El public_id o null si no se puede parsear.
 */
function getPublicIdFromUrl(url) {
    if (!url) return null;
    try {
        // Esta expresión regular es más robusta para extraer el public_id después de la versión y antes de la extensión.
        const regex = /\/v\d+\/(.+)\.\w+$/;
        const match = url.match(regex);
        return match ? match[1] : null;
    } catch (error) {
        console.error(chalk.red(`\nError extrayendo public_id de la URL: ${url}`), error);
        return null;
    }
}

/**
 * Obtiene todos los public_ids de imágenes que están actualmente en uso en la base de datos.
 */
async function getActivePublicIds() {
    const spinner = ora('1. Obteniendo IDs de imágenes activas desde la base de datos...').start();
    try {
        const games = await Game.find({}, 'cover backCover screenshots').lean();
        const activeIds = new Set();
        games.forEach(game => {
            if (game.cover) activeIds.add(getPublicIdFromUrl(game.cover));
            if (game.backCover) activeIds.add(getPublicIdFromUrl(game.backCover));
            if (game.screenshots && game.screenshots.length > 0) {
                game.screenshots.forEach(url => activeIds.add(getPublicIdFromUrl(url)));
            }
        });
        activeIds.delete(null);
        spinner.succeed(chalk.green(`1. Se encontraron ${chalk.yellow(activeIds.size)} IDs de imágenes en uso en la base de datos.`));
        return activeIds;
    } catch (error) {
        spinner.fail(chalk.red('Error al obtener IDs de la base de datos.'));
        throw error;
    }
}

/**
 * Obtiene TODOS los archivos de la cuenta de Cloudinary.
 */
async function getCloudinaryFiles() {
    const spinner = ora(`2. Obteniendo la lista completa de archivos de Cloudinary...`).start();
    let allFiles = [];
    let next_cursor = null;
    try {
        do {
            const result = await cloudinary.api.resources({
                type: 'upload',
                max_results: 500,
                next_cursor: next_cursor,
            });
            allFiles = allFiles.concat(result.resources);
            next_cursor = result.next_cursor;
            spinner.text = `2. Obteniendo archivos de Cloudinary... (${allFiles.length} encontrados hasta ahora)`;
        } while (next_cursor);
        spinner.succeed(chalk.green(`2. Se encontraron ${chalk.yellow(allFiles.length)} archivos en total en Cloudinary.`));
        return allFiles;
    } catch (error) {
        spinner.fail(chalk.red('Error al obtener archivos de Cloudinary.'));
        throw error;
    }
}

/**
 * Script principal
 */
async function findAndProcessOrphans() {
    console.log(chalk.bold.cyan('\n--- Iniciando script de limpieza de archivos huérfanos (Escaneo Completo) ---\n'));
    
    const dbSpinner = ora('Conectando a MongoDB...').start();
    await mongoose.connect(process.env.MONGO_URI);
    dbSpinner.succeed(chalk.green('✅ Conexión a MongoDB establecida.'));

    try {
        const activePublicIds = await getActivePublicIds();
        const cloudinaryFiles = await getCloudinaryFiles();

        if (cloudinaryFiles.length === 0) {
            console.log(chalk.yellow('\nTu cuenta de Cloudinary no tiene archivos para analizar.'));
            return; 
        }

        const comparisonSpinner = ora('3. Analizando archivos para encontrar huérfanos...').start();

        const misplacedFiles = [];
        const orphanFilesInProject = [];

        cloudinaryFiles.forEach(file => {
            // Revisa si el archivo está fuera de la carpeta del proyecto
            if (!file.public_id.startsWith(PROJECT_FOLDER + '/')) {
                misplacedFiles.push(file);
            } else {
                // Si está dentro, revisa si su ID está en la base de datos
                if (!activePublicIds.has(file.public_id)) {
                    orphanFilesInProject.push(file);
                }
            }
        });
        
        comparisonSpinner.succeed(chalk.green('3. Análisis completado.'));

        const totalOrphans = misplacedFiles.length + orphanFilesInProject.length;

        console.log(chalk.bold.cyan('\n--- Reporte de Archivos Huérfanos ---\n'));
        if (totalOrphans === 0) {
            console.log(chalk.bold.green('¡Excelente! No se encontraron archivos huérfanos. Todo está limpio. ✨'));
        } else {
            if (orphanFilesInProject.length > 0) {
                console.log(chalk.yellow(`Se encontraron ${chalk.bold(orphanFilesInProject.length)} archivos huérfanos DENTRO de la carpeta "${PROJECT_FOLDER}":`));
                orphanFilesInProject.forEach(file => {
                    console.log(chalk.gray(`  - ${file.public_id}`));
                });
            }
            if (misplacedFiles.length > 0) {
                console.log(chalk.yellow(`\nSe encontraron ${chalk.bold(misplacedFiles.length)} archivos FUERA de la carpeta del proyecto:`));
                misplacedFiles.forEach(file => {
                    console.log(chalk.gray(`  - ${file.public_id}`));
                });
            }

            console.log(chalk.yellow('\n-----------------------------------------\n'));
            const { confirmDelete } = await inquirer.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirmDelete',
                    message: `¿Deseas eliminar permanentemente un total de ${chalk.bold.red(totalOrphans)} archivos huérfanos de Cloudinary?`,
                    default: false,
                },
            ]);

            if (confirmDelete) {
                const allOrphansToDelete = [...orphanFilesInProject, ...misplacedFiles];
                const publicIdsToDelete = allOrphansToDelete.map(file => file.public_id);
                const deletionSpinner = ora(`Eliminando ${publicIdsToDelete.length} archivos...`).start();
                
                for (let i = 0; i < publicIdsToDelete.length; i += 100) {
                    const batch = publicIdsToDelete.slice(i, i + 100);
                    try {
                        await cloudinary.api.delete_resources(batch);
                        deletionSpinner.text = `Eliminando ${i + batch.length} de ${publicIdsToDelete.length} archivos...`;
                    } catch (error) {
                        deletionSpinner.fail(chalk.red(`Error durante la eliminación del lote ${i / 100 + 1}.`));
                        console.error(error);
                    }
                }
                deletionSpinner.succeed(chalk.bold.green('¡Limpieza completada!'));
            } else {
                console.log(chalk.blue('\nOperación cancelada por el usuario. No se eliminó ningún archivo.'));
            }
        }
    } catch (error) {
        console.error(chalk.red('\nHa ocurrido un error durante la ejecución del script:'), error);
    } finally {
        await mongoose.disconnect();
        console.log(chalk.gray('\nDesconectado de MongoDB.'));
    }
}

// Ejecutar el script
findAndProcessOrphans();
