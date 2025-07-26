// routes/webhookRoutes.js (CORREGIDO Y ACTUALIZADO)

const express = require('express');
const router = express.Router();

// 1. Importa el controlador completo (Forma corregida)
const webhookController = require('../controllers/webhookController');

// 2. Ruta para recibir notificaciones de Stripe
// OJO: Esta ruta necesita el "cuerpo crudo" (raw body) para verificar la firma.
router.post('/stripe', express.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);

// 3. Ruta para recibir notificaciones de Mercado Pago
router.post('/mercadopago', webhookController.handleMercadoPagoWebhook);

module.exports = router;