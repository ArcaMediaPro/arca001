// dataHealth.js
// USO: node dataHealth.js
// DESCRIPCIÓN: Revisa la integridad de los datos en la base de datos y genera un reporte.

require('dotenv').config();
const mongoose = require('mongoose');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const Game = require('./models/Game');
const User = require('./models/User');

/**
 * Script principal que ejecuta todas las comprobaciones de salud.
 */
async function runHealthCheck() {
    console.log(chalk.bold.cyan('\n--- Iniciando script de Diagnóstico y Salud de Datos ---\n'));
    
    const dbSpinner = ora('Conectando a MongoDB...').start();
    await mongoose.connect(process.env.MONGO_URI);
    dbSpinner.succeed(chalk.green('✅ Conexión a MongoDB establecida.'));

    try {
        // --- 1. Encontrar Juegos Huérfanos ---
        const orphanSpinner = ora('1. Buscando juegos huérfanos (sin propietario válido)...').start();
        const allUserIds = new Set((await User.find({}, '_id').lean()).map(u => u._id.toString()));
        const allGames = await Game.find({}, 'owner').lean();
        
        const orphanGames = allGames.filter(game => !game.owner || !allUserIds.has(game.owner.toString()));
        
        if (orphanGames.length > 0) {
            orphanSpinner.warn(chalk.yellow(`1. Se encontraron ${chalk.bold(orphanGames.length)} juegos huérfanos.`));
        } else {
            orphanSpinner.succeed(chalk.green('1. No se encontraron juegos huérfanos. ¡La integridad es correcta!'));
        }

        // --- 2. Encontrar Usuarios Inactivos (sin juegos) ---
        const inactiveSpinner = ora('2. Buscando usuarios inactivos (0 juegos catalogados)...').start();
        const usersWithGames = new Set(allGames.filter(g => g.owner).map(g => g.owner.toString()));
        const inactiveUsers = await User.find({ _id: { $nin: Array.from(usersWithGames).map(id => new mongoose.Types.ObjectId(id)) } }, 'username email').lean();
        
        if (inactiveUsers.length > 0) {
            inactiveSpinner.succeed(chalk.green(`2. Se encontraron ${chalk.yellow(inactiveUsers.length)} usuarios sin juegos.`));
        } else {
            inactiveSpinner.succeed(chalk.green('2. Todos los usuarios registrados tienen al menos un juego.'));
        }
        
        // --- 3. Generar Reporte General ---
        const reportSpinner = ora('3. Generando reporte general...').start();
        const totalUsers = allUserIds.size;
        const totalGames = allGames.length;
        const topPlatforms = await Game.aggregate([
            { $group: { _id: '$platform', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, platform: '$_id', count: 1 } },
        ]);
        reportSpinner.succeed(chalk.green('3. Reporte general generado.'));

        // --- Mostrar Resultados ---
        console.log(chalk.bold.cyan('\n--- Reporte de Salud del Sistema ---\n'));
        console.log(chalk.bold('Estadísticas Generales:'));
        console.log(`  - Usuarios Totales: ${chalk.bold.yellow(totalUsers)}`);
        console.log(`  - Juegos Totales: ${chalk.bold.yellow(totalGames)}`);
        
        if (topPlatforms.length > 0) {
            console.log(chalk.bold('\nTop 5 Plataformas más Populares:'));
            topPlatforms.forEach((p, index) => {
                console.log(chalk.gray(`  ${index + 1}. ${p.platform}: ${p.count} juegos`));
            });
        }
        
        if (inactiveUsers.length > 0) {
            console.log(chalk.bold.yellow('\nUsuarios Inactivos (0 juegos):'));
            inactiveUsers.forEach(user => {
                console.log(chalk.gray(`  - ${user.username} (${user.email})`));
            });
        }

        if (orphanGames.length > 0) {
            console.log(chalk.bold.red('\n¡Alerta! Juegos Huérfanos Encontrados:'));
            orphanGames.forEach(game => {
                console.log(chalk.gray(`  - Juego con ID: ${game._id} (propietario no encontrado)`));
            });

            console.log(chalk.yellow('\n-----------------------------------------\n'));
            const { confirmDelete } = await inquirer.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirmDelete',
                    message: `¿Deseas eliminar permanentemente estos ${chalk.bold.red(orphanGames.length)} juegos huérfanos de la base de datos?`,
                    default: false,
                },
            ]);

            if (confirmDelete) {
                const deletionSpinner = ora('Eliminando juegos huérfanos...').start();
                const orphanGameIds = orphanGames.map(g => g._id);
                const result = await Game.deleteMany({ _id: { $in: orphanGameIds } });
                deletionSpinner.succeed(chalk.bold.green(`¡Limpieza completada! Se eliminaron ${result.deletedCount} juegos.`));
            } else {
                console.log(chalk.blue('\nOperación de limpieza cancelada. No se modificó la base de datos.'));
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
runHealthCheck();
