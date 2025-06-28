// cleanupOrphans.js (FINAL CON CONFIRMACIÓN DETALLADA)
// USO: node cleanupOrphans.js
// DESCRIPCIÓN: Compara los usuarios de la base de datos con las carpetas de Cloudinary,
//              detecta carpetas de usuario huérfanas, muestra sus nombres y permite su eliminación completa.

require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const inquirer = require('inquirer');
const User = require('./models/User'); 
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

function slugify(text) {
    if (!text) return 'sin-titulo';
    return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '').substring(0, 50);
}

async function getExpectedUserFolders() {
    const spinner = ora('1. Obteniendo lista de usuarios desde la base de datos...').start();
    try {
        const users = await User.find({}, 'username').lean();
        const expectedFolders = new Set(
            users.map(user => `${slugify(user.username)}-${user._id}`)
        );
        spinner.succeed(chalk.green(`1. Se encontraron ${chalk.yellow(expectedFolders.size)} usuarios activos en la base de datos.`));
        return expectedFolders;
    } catch (error) {
        spinner.fail(chalk.red('Error al obtener usuarios de la base de datos.'));
        throw error;
    }
}

async function getCloudinaryUserFolders() {
    const spinner = ora(`2. Obteniendo la lista de carpetas de usuario de Cloudinary...`).start();
    try {
        const { folders } = await cloudinary.api.sub_folders(PROJECT_FOLDER);
        const cloudinaryFolders = new Set(folders.map(f => f.name));
        spinner.succeed(chalk.green(`2. Se encontraron ${chalk.yellow(cloudinaryFolders.size)} carpetas de usuario en Cloudinary.`));
        return cloudinaryFolders;
    } catch (error) {
        spinner.fail(chalk.red('Error al obtener carpetas de Cloudinary.'));
        throw error;
    }
}

async function cleanupEmptyFolders(currentPath) {
    let deletedFolders = [];
    const { folders } = await cloudinary.api.sub_folders(currentPath);
    for (const subfolder of folders) {
        const subfolderPath = `${currentPath}/${subfolder.name}`;
        const deletedSubfolders = await cleanupEmptyFolders(subfolderPath);
        deletedFolders = deletedFolders.concat(deletedSubfolders);
    }
    const { resources } = await cloudinary.api.resources({ type: 'upload', prefix: currentPath, max_results: 1 });
    const { folders: remainingSubfolders } = await cloudinary.api.sub_folders(currentPath);
    if (resources.length === 0 && remainingSubfolders.length === 0) {
        try {
            await cloudinary.api.delete_folder(currentPath);
            deletedFolders.push(currentPath);
        } catch (error) {
            if (error.http_code !== 404) {
               console.error(chalk.red(`\nNo se pudo eliminar la carpeta vacía ${currentPath}`), error.message);
            }
        }
    }
    return deletedFolders;
}

/**
 * Script principal
 */
async function main() {
    console.log(chalk.bold.cyan('\n--- Iniciando script de mantenimiento integral de Cloudinary ---\n'));
    
    const dbSpinner = ora('Conectando a MongoDB...').start();
    await mongoose.connect(process.env.MONGO_URI);
    dbSpinner.succeed(chalk.green('✅ Conexión a MongoDB establecida.'));

    try {
        const expectedFolders = await getExpectedUserFolders();
        const cloudinaryFolders = await getCloudinaryUserFolders();

        const orphanFolders = [];
        cloudinaryFolders.forEach(folderName => {
            if (!expectedFolders.has(folderName)) {
                orphanFolders.push(folderName);
            }
        });
        
        console.log(chalk.bold.cyan('\n--- 1. Reporte de Carpetas de Usuario Huérfanas ---\n'));
        if (orphanFolders.length === 0) {
            console.log(chalk.bold.green('¡Excelente! No se encontraron carpetas de usuario huérfanas.'));
        } else {
            console.log(chalk.yellow(`Se encontraron ${chalk.bold(orphanFolders.length)} carpetas de usuario huérfanas:`));
            orphanFolders.forEach(folder => console.log(chalk.gray(`  - ${folder}`)));
            
            console.log(chalk.red.bold('\n¡ADVERTENCIA! La siguiente acción eliminará estas carpetas y TODO su contenido de forma PERMANENTE.'));
            console.log(chalk.yellow('----------------------------------------------------------------------------------\n'));
            
            // <<< INICIO DE LA MODIFICACIÓN >>>
            // Construir un mensaje de confirmación más detallado
            let confirmationMessage = `¿Estás seguro de que deseas eliminar la carpeta huérfana "${orphanFolders[0]}"?`;
            if (orphanFolders.length > 1) {
                confirmationMessage = `¿Estás seguro de que deseas eliminar estas ${chalk.bold.red(orphanFolders.length)} carpetas huérfanas y todo su contenido?`;
            }

            const { confirmDelete } = await inquirer.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirmDelete',
                    message: confirmationMessage,
                    default: false,
                },
            ]);
            // <<< FIN DE LA MODIFICACIÓN >>>

            if (confirmDelete) {
                const deletionSpinner = ora(`Eliminando carpetas huérfanas...`).start();
                let deletedCount = 0;
                for (const folderName of orphanFolders) {
                    const folderPath = `${PROJECT_FOLDER}/${folderName}`;
                    try {
                        await cloudinary.api.delete_resources_by_prefix(folderPath);
                        await cloudinary.api.delete_folder(`${folderPath}/covers`).catch(() => {});
                        await cloudinary.api.delete_folder(`${folderPath}/backCovers`).catch(() => {});
                        await cloudinary.api.delete_folder(`${folderPath}/screenshots`).catch(() => {});
                        await cloudinary.api.delete_folder(folderPath);
                        deletedCount++;
                        deletionSpinner.text = `Eliminando ${deletedCount} de ${orphanFolders.length} carpetas... (${folderName})`;
                    } catch (error) {
                        deletionSpinner.fail(chalk.red(`Error al eliminar la carpeta ${folderPath}.`));
                        console.error(error);
                    }
                }
                deletionSpinner.succeed(chalk.bold.green(`¡Limpieza de carpetas de usuario completada! Se eliminaron ${deletedCount} carpetas.`));
            } else {
                console.log(chalk.blue('\nOperación de carpetas huérfanas cancelada.'));
            }
        }

        console.log(chalk.bold.cyan('\n--- 2. Búsqueda de Todas las Carpetas y Subcarpetas Vacías ---\n'));
        const { confirmEmptyDelete } = await inquirer.default.prompt([
            {
                type: 'confirm',
                name: 'confirmEmptyDelete',
                message: `¿Deseas buscar y eliminar TODAS las carpetas y subcarpetas vacías restantes en el proyecto?`,
                default: false,
            },
        ]);

        if (confirmEmptyDelete) {
            const emptyDeletionSpinner = ora('Buscando y eliminando carpetas vacías...').start();
            try {
                const deletedEmptyFolders = await cleanupEmptyFolders(PROJECT_FOLDER);
                if (deletedEmptyFolders.length > 0) {
                    emptyDeletionSpinner.succeed(chalk.green(`Se eliminaron ${deletedEmptyFolders.length} carpetas/subcarpetas vacías:`));
                    deletedEmptyFolders.forEach(folder => console.log(chalk.gray(`  - ${folder}`)));
                } else {
                    emptyDeletionSpinner.succeed(chalk.green('No se encontraron carpetas vacías adicionales.'));
                }
            } catch (error) {
                emptyDeletionSpinner.fail(chalk.red('Ocurrió un error durante la limpieza de carpetas vacías.'));
                console.error(error);
            }
        } else {
            console.log(chalk.blue('\nOperación de limpieza de carpetas vacías cancelada.'));
        }

    } catch (error) {
        console.error(chalk.red('\nHa ocurrido un error crítico durante la ejecución del script:'), error);
    } finally {
        await mongoose.disconnect();
        console.log(chalk.gray('\nDesconectado de MongoDB.'));
    }
}

main();