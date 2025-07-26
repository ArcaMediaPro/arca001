// routes/subscriptionRoutes.js (CORREGIDO)

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Asegúrate de que la ruta a tu middleware de autenticación sea correcta.

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
// Esta es la ruta que probablemente estaba causando el error en la línea 24.
router.post(
    '/cancel-subscription',
    authMiddleware,
    subscriptionController.cancelSubscription
);


module.exports = router;
