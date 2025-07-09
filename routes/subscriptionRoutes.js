// routes/subscriptionRoutes.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// --- Importamos los controladores ---
const { 
    createStripeSession, 
    createMercadoPagoPreference,
    getStripeSessionStatus // <-- IMPORTAMOS LA NUEVA FUNCIÓN
} = require('../controllers/subscriptionController');

// Rutas para crear sesiones de pago
router.post('/create-stripe-session', authMiddleware, createStripeSession);
router.post('/create-mercadopago-preference', authMiddleware, createMercadoPagoPreference);

// --- INICIO: NUEVA RUTA ---
// Ruta para que el frontend verifique el estado de un pago y obtenga un nuevo token
router.get('/stripe-session-status', authMiddleware, getStripeSessionStatus);
// --- FIN: NUEVA RUTA ---

module.exports = router;