// routes/webhookRoutes.js

const express = require('express');
const router = express.Router();
const { handleStripeWebhook, handleMercadoPagoWebhook } = require('../controllers/webhookController');

// Ruta para recibir notificaciones de Stripe
// OJO: Esta ruta necesita el "cuerpo crudo" (raw body), no el JSON parseado.
// La configuración para esto se hace en server.js
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Ruta para recibir notificaciones de Mercado Pago
router.post('/mercadopago', handleMercadoPagoWebhook);

module.exports = router;
