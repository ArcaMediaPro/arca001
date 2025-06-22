// fixGenresScript.js
require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('./models/Game'); // Asegúrate que la ruta a tu modelo Game sea correcta

// Mapa de conversión: "Texto Antiguo": "Nueva Clave i18n"
const genreMigrationMap = {
    "Aventura": "gameForm_genre_adventure",
    "Aventura - RPG": "gameForm_genre_rpgAdventure",
    "Aventura Gráfica": "gameForm_genre_graphicAdventure",
    "Aventura Conversacional": "gameForm_genre_textAdventure",
    "Arcades": "gameForm_genre_arcade",
    "Deportes": "gameForm_genre_sports",
    "Estrategia por Turnos": "gameForm_genre_turnBasedStrategy",
    "Estrategia en Tiempo Real": "gameForm_genre_realTimeStrategy",
    "Ingenio - Puzzle": "gameForm_genre_puzzle",
    "Primera Persona - FPS": "gameForm_genre_fps",
    "Programa": "gameForm_genre_program",
    "Simulador": "gameForm_genre_simulation",
    "Simulador de Vuelo": "gameForm_genre_flightSim",
    "Simulador de Carreras": "gameForm_genre_racingSim",
    "Simulador Espacial": "gameForm_genre_spaceSim"
};

const runMigration = async () => {
    try {
        console.log('Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB conectado.');

        console.log('\nIniciando migración de géneros...');
        let totalUpdated = 0;

        for (const [oldGenreText, newGenreKey] of Object.entries(genreMigrationMap)) {
            const result = await Game.updateMany(
                { genre: oldGenreText }, // Busca todos los juegos con el texto antiguo
                { $set: { genre: newGenreKey } } // Los actualiza a la nueva clave i18n
            );

            if (result.modifiedCount > 0) {
                console.log(`- Se actualizaron ${result.modifiedCount} juegos del género "${oldGenreText}" a la clave "${newGenreKey}".`);
                totalUpdated += result.modifiedCount;
            }
        }

        console.log('\n--- Resultado de la Migración ---');
        if (totalUpdated > 0) {
            console.log(`¡Éxito! Se actualizaron un total de ${totalUpdated} documentos de juegos.`);
        } else {
            console.log('No se encontraron juegos con géneros de texto antiguo para migrar. ¡Tus datos ya están limpios!');
        }

    } catch (error) {
        console.error('ERROR CRÍTICO durante la migración:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDesconectado de MongoDB. Proceso finalizado.');
    }
};

runMigration();