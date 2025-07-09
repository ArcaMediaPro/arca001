// controllers/webhookController.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

/**
 * Maneja los eventos entrantes de los webhooks de Stripe.
 */
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Usa el cuerpo crudo (raw body) de la petición para construir el evento
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`❌ Error en la firma del webhook de Stripe: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Maneja el evento
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('✅ Checkout Session completada:', session.id);
            
            // Lógica para activar la suscripción del usuario
            await activateSubscription(session);
            break;

        case 'customer.subscription.updated':
            const subscriptionUpdated = event.data.object;
            console.log('🔔 Suscripción actualizada:', subscriptionUpdated.id);
            await updateSubscriptionStatus(subscriptionUpdated);
            break;

        case 'customer.subscription.deleted':
            const subscriptionDeleted = event.data.object;
            console.log('🗑️ Suscripción cancelada:', subscriptionDeleted.id);
            await cancelSubscription(subscriptionDeleted);
            break;
            
        default:
            console.log(`Evento de Stripe no manejado: ${event.type}`);
    }

    res.status(200).json({ received: true });
};

/**
 * Maneja las notificaciones de Mercado Pago.
 * (Esta es una implementación básica, Mercado Pago puede requerir más pasos)
 */
exports.handleMercadoPagoWebhook = async (req, res) => {
    console.log('🔔 Notificación de Mercado Pago recibida:');
    console.log(req.query); // Mercado Pago a menudo envía datos como query params

    // Aquí iría la lógica para verificar y procesar la notificación de Mercado Pago.
    // Esto es más complejo y depende del tipo de notificación (pagos, suscripciones, etc.)
    // Por ahora, solo registramos que llegó.

    res.status(200).send('OK');
};


// --- Funciones auxiliares para manejar la lógica de la base de datos ---

async function activateSubscription(session) {
    const userId = session.metadata.userId;
    const stripeSubscriptionId = session.subscription;
    
    try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        const user = await User.findById(userId);
        if (user) {
            user.stripeSubscriptionId = stripeSubscriptionId;
            user.subscriptionProvider = 'stripe';
            user.subscriptionStatus = 'active';
            // Stripe usa timestamps de Unix (en segundos), los convertimos a milisegundos para JS
            user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
            
            // Asignar el plan basado en el ID de precio
            const priceId = subscription.items.data[0].price.id;
            if (priceId === process.env.STRIPE_PRICE_ID_MEDIUM) { // Necesitarás añadir estas variables a .env
                user.subscriptionPlan = 'medium';
            } else if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM) {
                user.subscriptionPlan = 'premium';
            }

            await user.save();
            console.log(`Suscripción activada para el usuario: ${userId}`);
        }
    } catch (error) {
        console.error(`Error al activar la suscripción para el usuario ${userId}:`, error);
    }
}

async function updateSubscriptionStatus(subscription) {
    try {
        const user = await User.findOne({ stripeSubscriptionId: subscription.id });
        if (user) {
            user.subscriptionStatus = subscription.status; // ej: 'active', 'past_due'
            user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
            await user.save();
            console.log(`Estado de suscripción actualizado para el usuario: ${user._id}`);
        }
    } catch (error) {
        console.error(`Error al actualizar la suscripción ${subscription.id}:`, error);
    }
}

async function cancelSubscription(subscription) {
    try {
        const user = await User.findOne({ stripeSubscriptionId: subscription.id });
        if (user) {
            user.subscriptionStatus = 'canceled';
            user.subscriptionPlan = 'free'; // Opcional: degradar al plan gratuito
            // No cambiamos la fecha de finalización, el usuario mantiene el acceso hasta que expire.
            await user.save();
            console.log(`Suscripción cancelada en la base de datos para el usuario: ${user._id}`);
        }
    } catch (error) {
        console.error(`Error al cancelar la suscripción ${subscription.id}:`, error);
    }
}
