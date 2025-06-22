// cleanupOrphans.js
// USO: node cleanupOrphans.js

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

const FOLDER_TO_SCAN = 'catalogador_pro';

// --- Funciones Auxiliares ---

/**
 * Obtiene todas las URLs de imágenes que están actualmente en uso en la base de datos.
 */
async function getActiveImageUrls() {
    const spinner = ora('1. Obteniendo URLs activas desde la base de datos...').start();
    try {
        const games = await Game.find({}, 'cover backCover screenshots').lean();
        const activeUrls = new Set();
        games.forEach(game => {
            if (game.cover) activeUrls.add(game.cover);
            if (game.backCover) activeUrls.add(game.backCover);
            if (game.screenshots && game.screenshots.length > 0) {
                game.screenshots.forEach(url => activeUrls.add(url));
            }
        });
        spinner.succeed(chalk.green(`1. Se encontraron ${chalk.yellow(activeUrls.size)} URLs de imágenes en uso en la base de datos.`));
        return activeUrls;
    } catch (error) {
        spinner.fail(chalk.red('Error al obtener URLs de la base de datos.'));
        throw error;
    }
}

/**
 * Obtiene todos los archivos de la carpeta especificada en Cloudinary.
 */
async function getCloudinaryFiles() {
    const spinner = ora(`2. Obteniendo lista de archivos de la carpeta "${FOLDER_TO_SCAN}" en Cloudinary...`).start();
    let allFiles = [];
    let next_cursor = null;

    try {
        do {
            const result = await cloudinary.api.resources({
                type: 'upload',
                prefix: FOLDER_TO_SCAN, // Busca todos los archivos dentro de esta carpeta y sus subcarpetas.
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
    console.log(chalk.bold.cyan('\n--- Iniciando script de limpieza de archivos huérfanos ---\n'));
    
    const dbSpinner = ora('Conectando a MongoDB...').start();
    await mongoose.connect(process.env.MONGO_URI);
    dbSpinner.succeed(chalk.green('✅ Conexión a MongoDB establecida.'));

    try {
        const activeUrls = await getActiveImageUrls();
        const cloudinaryFiles = await getCloudinaryFiles();

        if (cloudinaryFiles.length === 0) {
            console.log(chalk.yellow('\nNo se encontraron archivos en Cloudinary. El script ha finalizado.'));
            return;
        }

        console.log(chalk.gray('\n--- Muestra de URLs para depuración ---'));
        console.log(chalk.bold('Desde Base de Datos (primeras 5):'));
        console.log(Array.from(activeUrls).slice(0, 5));
        console.log(chalk.bold('Desde Cloudinary (primeras 5):'));
        console.log(cloudinaryFiles.slice(0, 5).map(f => f.secure_url));
        console.log(chalk.gray('-------------------------------------\n'));

        const comparisonSpinner = ora('3. Comparando listas para encontrar archivos huérfanos...').start();
        const orphanFiles = cloudinaryFiles.filter(file => !activeUrls.has(file.secure_url));
        comparisonSpinner.succeed(chalk.green('3. Comparación completada.'));

        console.log(chalk.bold.cyan('\n--- Reporte de Archivos Huérfanos ---\n'));
        if (orphanFiles.length === 0) {
            console.log(chalk.bold.green('¡Excelente! No se encontraron archivos huérfanos. Todo está limpio. ✨'));
        } else {
            console.log(chalk.yellow(`Se encontraron ${chalk.bold(orphanFiles.length)} archivos huérfanos:`));
            orphanFiles.forEach(file => {
                console.log(chalk.gray(`  - ${file.public_id}`));
            });

            console.log(chalk.yellow('\n-----------------------------------------\n'));
            
            // --- INICIO DE LA CORRECCIÓN ---
            // Se cambia "inquirer.prompt" por "inquirer.default.prompt" para compatibilidad.
            const { confirmDelete } = await inquirer.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirmDelete',
                    message: `¿Deseas eliminar permanentemente estos ${chalk.bold.red(orphanFiles.length)} archivos de Cloudinary?`,
                    default: false,
                },
            ]);
            // --- FIN DE LA CORRECCIÓN ---

            if (confirmDelete) {
                const deletionSpinner = ora(`Eliminando ${orphanFiles.length} archivos...`).start();
                const publicIdsToDelete = orphanFiles.map(file => file.public_id);
                
                for (let i = 0; i < publicIdsToDelete.length; i += 100) {
                    const batch = publicIdsToDelete.slice(i, i + 100);
                    try {
                        await cloudinary.api.delete_resources(batch);
                        deletionSpinner.text = `Eliminando ${i + batch.length} de ${orphanFiles.length} archivos...`;
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