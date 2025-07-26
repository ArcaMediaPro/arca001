// routes/subscriptionRoutes.js (CORREGIDO)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // Se añade JWT para el middleware de placeholder

// --- CORRECCIÓN TEMPORAL PARA EL ERROR 'MODULE_NOT_FOUND' ---
// La siguiente línea causaba el error porque el archivo no se encontraba en la ruta '../middleware/authMiddleware'.
// const authMiddleware = require('../middleware/authMiddleware'); 

// Se añade un middleware de autenticación de placeholder directamente aquí.
// Esto evita el error y permite que el servidor se inicie.
// DEBES ASEGURARTE DE QUE TU LÓGICA DE AUTENTICACIÓN REAL ESTÉ CORRECTAMENTE IMPLEMENTADA.
const authMiddleware = (req, res, next) => {
    // Este es un ejemplo que busca el token en una cookie llamada 'authToken'.
    // Ajusta esto según cómo manejes los tokens en tu frontend.
    const token = req.cookies.authToken; 
    
    if (!token) {
        // Si no hay token, las rutas protegidas no funcionarán correctamente.
        // En una aplicación real, aquí devolverías un error 401.
        console.warn('Advertencia: No se encontró authToken en las cookies. Las rutas protegidas pueden fallar.');
        return res.status(401).json({ message: 'Acceso no autorizado. Falta el token.' });
    }

    try {
        // Se verifica el token usando la clave secreta de tus variables de entorno.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Se añade el payload del token (que debe incluir el ID del usuario) al objeto de la petición.
        next(); // Se permite que la petición continúe hacia el controlador.
    } catch (error) {
        console.error('Error en el middleware de autenticación:', error.message);
        return res.status(401).json({ message: 'Token no es válido.' });
    }
};
// --- FIN DE LA CORRECCIÓN TEMPORAL ---


// Importa el controlador completo.
const subscriptionController = require('../controllers/subscriptionController');

// --- RUTAS PARA LA GESTIÓN DE SUSCRIPCIONES ---

// Ruta para crear una sesión de pago con Stripe
router.post(
    '/create-stripe-session',
    authMiddleware,
    subscriptionController.createStripeSession
);

// Ruta para crear una preferencia de pago con Mercado Pago
router.post(
    '/create-mercadopago-preference',
    authMiddleware,
    subscriptionController.createMercadoPagoPreference
);

// Ruta para que el frontend verifique el estado de una sesión de Stripe después del pago
router.get(
    '/stripe-session-status',
    subscriptionController.getStripeSessionStatus
);

// Ruta para que un usuario autenticado cancele su propia suscripción
// --- CORRECCIÓN: Se actualiza el nombre de la ruta para que coincida con la llamada del frontend ---
// El error 404 ocurría porque el frontend llamaba a '/cancel-stripe-subscription'
// mientras que la ruta estaba definida como '/cancel-subscription'.
router.post(
    '/cancel-stripe-subscription', // <-- RUTA ACTUALIZADA
    authMiddleware,
    subscriptionController.cancelSubscription
);


module.exports = router;