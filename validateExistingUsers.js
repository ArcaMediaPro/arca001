// validateExistingUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Asegúrate de que la ruta a tu modelo sea correcta

const validateUsers = async () => {
    console.log('>>> Conectando a la base de datos...');
    try {
        await mongoose.connect(process.env.MONGO_URI, {});
        console.log('>>> Conexión exitosa.');

        console.log('>>> Actualizando usuarios existentes...');
        
        // Esta consulta busca todos los usuarios donde 'isVerified' NO sea 'true'
        // y lo establece en 'true'.
        const result = await User.updateMany(
            { isVerified: { $ne: true } }, 
            { $set: { isVerified: true } }
        );

        console.log('--- Proceso de validación completado ---');
        console.log(`>>> Usuarios encontrados para actualizar: ${result.matchedCount}`);
        console.log(`>>> Usuarios actualizados exitosamente: ${result.modifiedCount}`);
        
    } catch (error) {
        console.error('XXX Error durante el script de validación:', error);
    } finally {
        // Cierra la conexión a la base de datos para que el script termine
        await mongoose.disconnect();
        console.log('>>> Desconectado de la base de datos.');
    }
};

// Ejecuta la función
validateUsers();