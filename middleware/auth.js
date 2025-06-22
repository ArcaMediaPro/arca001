// middleware/auth.js
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../models/User'); // Asegúrate de que esta ruta sea correcta

if (!process.env.JWT_SECRET) {
    dotenv.config();
}

module.exports = async function(req, res, next) {
    console.log('--- Middleware de Autenticación Alcanzado (Modo Cookie con consulta a BD) ---');
    console.log('Ruta de la petición:', req.method, req.originalUrl);

    const token = req.cookies.authToken;
    console.log('Token recibido de cookie "authToken":', token ? token.substring(0, 10) + '...' : 'Ninguno');

    if (!token) {
        console.log('Middleware: No hay token en cookie. Enviando 401.');
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            console.error('Middleware: JWT_SECRET NO ESTÁ DEFINIDO. ERROR CRÍTICO.');
            return res.status(500).json({ message: 'Server configuration error: JWT Secret missing.' });
        }
        console.log('Middleware: Intentando verificar token de cookie...');

        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Middleware: Token de cookie verificado. Payload decodificado:', decodedPayload);

        // --- MODIFICACIÓN IMPORTANTE AQUÍ ---
        // Usar 'decodedPayload.id' en lugar de 'decodedPayload.userId'
        // ya que tu log muestra que el payload tiene la clave 'id'.
        if (!decodedPayload.id) {
            console.error('Middleware: El payload del token no contiene "id". Payload:', decodedPayload);
            return res.status(401).json({ message: 'Token inválido: falta identificador de usuario.' });
        }

        // Usar decodedPayload.id para buscar en la base de datos
		const userFromDB = await User.findById(decodedPayload.id); // No excluir la contraseña aquí
        if (!userFromDB) {
            console.log('Middleware: Usuario del token (ID:', decodedPayload.id, ') no encontrado en la BD. Enviando 401.');
            return res.status(401).json({ message: 'Usuario no encontrado o token inválido.' });
        }

        req.user = userFromDB;
        console.log('Middleware: req.user asignado desde la BD (ID:', userFromDB._id, ', Rol:', userFromDB.role, '). Llamando a next().');
        next();

    } catch (error) {
        console.error('Middleware: ERROR al verificar token de cookie o al buscar usuario en BD:', error.message);
        console.error('Middleware: Tipo de error:', error.name);
        res.status(401).json({ message: error.message || 'Token is not valid' });
    }
};