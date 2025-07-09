// routes/subscriptionRoutes.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// --- Importamos los controladores que crearán los pagos ---
const { createStripeSession, createMercadoPagoPreference } = require('../controllers/subscriptionController');

// Ruta para crear una sesión de pago con Stripe
router.post('/create-stripe-session', authMiddleware, createStripeSession);

// Ruta para crear una preferencia de pago con Mercado Pago
router.post('/create-mercadopago-preference', authMiddleware, createMercadoPagoPreference);

module.exports = router;
