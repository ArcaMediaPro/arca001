// controllers/webhookController.js (CON LÓGICA FUNCIONAL Y SDK DE MP ACTUALIZADO)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// --- CORRECCIÓN: Importación actualizada para el SDK de Mercado Pago v2+ ---
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const User = require('../models/User');

// --- CORRECCIÓN: Configuración actualizada del cliente de Mercado Pago ---
// Asegúrate de tener MERCADOPAGO_ACCESS_TOKEN en tus variables de entorno (.env)
const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});


/**
 * Maneja los eventos entrantes de los webhooks de Stripe.
 */
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('❌ FATAL: STRIPE_WEBHOOK_SECRET no está configurado en las variables de entorno.');
        return res.status(500).send('Error de configuración del servidor: Webhook secret no configurado.');
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`❌ Error en la firma del webhook de Stripe: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        // Maneja el evento
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log(`✅ Webhook 'checkout.session.completed' recibido para la sesión: ${session.id}`);
                await activateStripeSubscription(session);
                break;
            case 'customer.subscription.updated':
                const subscriptionUpdated = event.data.object;
                console.log(`🔔 Webhook 'customer.subscription.updated' recibido para la suscripción: ${subscriptionUpdated.id}`);
                await updateStripeSubscriptionStatus(subscriptionUpdated);
                break;
            case 'customer.subscription.deleted':
                const subscriptionDeleted = event.data.object;
                console.log(`🗑️ Webhook 'customer.subscription.deleted' recibido para la suscripción: ${subscriptionDeleted.id}`);
                await cancelStripeSubscription(subscriptionDeleted);
                break;
            default:
                console.log(`Evento de Stripe no manejado: ${event.type}`);
        }
        res.status(200).json({ received: true });
    } catch (error) {
        console.error(`❌ Error al procesar el webhook '${event.type}':`, error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el webhook.' });
    }
};

/**
 * Maneja los eventos entrantes de los webhooks de Mercado Pago.
 */
exports.handleMercadoPagoWebhook = async (req, res) => {
    console.log('🔔 Webhook de Mercado Pago recibido.');
    const notification = req.body;

    try {
        if (notification.type === 'subscription' && notification.data && notification.data.id) {
            console.log(`Procesando notificación para la suscripción de MP ID: ${notification.data.id}`);

            // --- CORRECCIÓN: Se instancia el servicio PreApproval con el cliente configurado ---
            const preapproval = new PreApproval(mpClient);

            // 1. Consultamos la suscripción a la API de Mercado Pago para obtener su estado real
            const mpSubscription = await preapproval.get({ id: notification.data.id });

            if (!mpSubscription) {
                throw new Error('No se pudo obtener la información de la suscripción de Mercado Pago.');
            }

            // 2. Buscamos al usuario en nuestra base de datos que corresponda a esta suscripción
            const user = await User.findOne({ mercadoPagoSubscriptionId: mpSubscription.id });

            if (!user) {
                console.warn(`⚠️ Usuario no encontrado para la suscripción de MP ID: ${mpSubscription.id}`);
                return res.status(200).json({ message: 'Usuario no encontrado, pero notificación recibida.' });
            }

            // 3. Verificamos el estado y actualizamos nuestra base de datos
            if (mpSubscription.status === 'cancelled') {
                await cancelMercadoPagoSubscription(user);
            } else {
                user.subscriptionStatus = mpSubscription.status;
                await user.save();
                console.log(`✅ Estado de suscripción de MP actualizado a '${mpSubscription.status}' para el usuario: ${user._id}`);
            }
        } else {
            console.log('Notificación de Mercado Pago recibida, pero no es de tipo suscripción o no tiene un ID válido.');
        }

        // 4. Respondemos a Mercado Pago para confirmar la recepción
        res.status(200).json({ received: true });

    } catch (error) {
        console.error('❌ Error al procesar el webhook de Mercado Pago:', error.message);
        res.status(500).json({ error: 'Error interno del servidor al procesar el webhook.' });
    }
};


// --- Funciones auxiliares para Stripe ---

async function activateStripeSubscription(session) {
    const userId = session.metadata.userId;
    const stripeSubscriptionId = session.subscription;

    if (!userId || !stripeSubscriptionId) {
        throw new Error(`Error crítico en el webhook: Faltan datos en la sesión. UserID: ${userId}, SubscriptionID: ${stripeSubscriptionId}`);
    }
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const user = await User.findById(userId);
    if (!user) {
        throw new Error(`Error en el webhook: No se encontró al usuario con ID: ${userId}`);
    }

    user.stripeSubscriptionId = stripeSubscriptionId;
    user.subscriptionProvider = 'stripe';
    user.subscriptionStatus = 'active';
    user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    
    const priceId = subscription.items.data[0].price.id;
    if (priceId === process.env.STRIPE_PRICE_ID_MEDIUM) {
        user.subscriptionPlan = 'medium';
    } else if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM) {
        user.subscriptionPlan = 'premium';
    }
    await user.save();
    console.log(`✅ Suscripción de Stripe activada para el usuario: ${userId}`);
}

async function updateStripeSubscriptionStatus(subscription) {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    if (user) {
        user.subscriptionStatus = subscription.status;
        user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        await user.save();
        console.log(`Estado de suscripción de Stripe actualizado para el usuario: ${user._id}`);
    }
}

async function cancelStripeSubscription(subscription) {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    if (user) {
        user.subscriptionStatus = 'canceled';
        user.subscriptionPlan = 'free';
        await user.save();
        console.log(`Suscripción de Stripe cancelada en la BD para el usuario: ${user._id}`);
    }
}

// --- Función auxiliar para Mercado Pago ---

async function cancelMercadoPagoSubscription(user) {
    console.log(`Iniciando cancelación de suscripción de MP para el usuario: ${user._id}`);
    user.subscriptionStatus = 'canceled';
    user.subscriptionPlan = 'free';
    user.subscriptionProvider = 'none'; // O mantener 'mercadopago' según tu lógica
    await user.save();
    console.log(`🗑️ Suscripción de Mercado Pago cancelada en la BD para el usuario: ${user._id}`);
}