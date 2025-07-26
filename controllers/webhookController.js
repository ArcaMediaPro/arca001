// controllers/webhookController.js (CON DEPURACIÓN MEJORADA)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

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
                await activateSubscription(session);
                break;
            case 'customer.subscription.updated':
                const subscriptionUpdated = event.data.object;
                console.log(`🔔 Webhook 'customer.subscription.updated' recibido para la suscripción: ${subscriptionUpdated.id}`);
                await updateSubscriptionStatus(subscriptionUpdated);
                break;
            case 'customer.subscription.deleted':
                const subscriptionDeleted = event.data.object;
                console.log(`🗑️ Webhook 'customer.subscription.deleted' recibido para la suscripción: ${subscriptionDeleted.id}`);
                await cancelSubscription(subscriptionDeleted);
                break;
            default:
                console.log(`Evento de Stripe no manejado: ${event.type}`);
        }
        // Si todo va bien, respondemos a Stripe con un 200
        res.status(200).json({ received: true });
    } catch (error) {
        // --- INICIO DE LA CORRECCIÓN ---
        // Si alguna de las funciones auxiliares (como activateSubscription) falla,
        // capturamos el error aquí y le informamos a Stripe que algo salió mal.
        console.error(`❌ Error al procesar el webhook '${event.type}':`, error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el webhook.' });
        // --- FIN DE LA CORRECCIÓN ---
    }
};

// --- Funciones auxiliares para manejar la lógica de la base de datos ---

async function activateSubscription(session) {
    const userId = session.metadata.userId;
    const stripeSubscriptionId = session.subscription;

    if (!userId || !stripeSubscriptionId) {
        throw new Error(`Error crítico en el webhook: Faltan datos en la sesión. UserID: ${userId}, SubscriptionID: ${stripeSubscriptionId}`);
    }
    console.log(`Intentando activar suscripción para UserID: ${userId} con StripeSubID: ${stripeSubscriptionId}`);
    
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
    console.log(`Price ID recibido de Stripe: ${priceId}`);
    
    if (priceId === process.env.STRIPE_PRICE_ID_MEDIUM) {
        user.subscriptionPlan = 'medium';
        console.log('Plan asignado: medium');
    } else if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM) {
        user.subscriptionPlan = 'premium';
        console.log('Plan asignado: premium');
    } else {
        console.warn('ADVERTENCIA: El Price ID recibido no coincide con ningún plan configurado.');
    }

    await user.save();
    console.log(`✅ Suscripción activada y guardada en la BD para el usuario: ${userId}`);
}

async function updateSubscriptionStatus(subscription) {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    if (user) {
        user.subscriptionStatus = subscription.status;
        user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        await user.save();
        console.log(`Estado de suscripción actualizado para el usuario: ${user._id}`);
    }
}

async function cancelSubscription(subscription) {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    if (user) {
        user.subscriptionStatus = 'canceled';
        user.subscriptionPlan = 'free';
        await user.save();
        console.log(`Suscripción cancelada en la base de datos para el usuario: ${user._id}`);
    }
}
