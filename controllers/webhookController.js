// controllers/webhookController.js (CORREGIDO CON DEPURACIÓN AVANZADA)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// ... (el resto del código del controlador se mantiene igual) ...

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

    // Maneja el evento
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('✅ Checkout Session completada:', session.id);
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

// ... (otras funciones auxiliares como handleMercadoPagoWebhook) ...

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
            user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
            
            const priceId = subscription.items.data[0].price.id;

            // --- INICIO DE LA DEPURACIÓN AVANZADA ---
            console.log('--- Depuración de Webhook de Activación ---');
            console.log(`Price ID recibido de Stripe: ->|${priceId}|<-`);
            console.log(`Price ID para MEDIUM (desde .env): ->|${process.env.STRIPE_PRICE_ID_MEDIUM}|<-`);
            console.log(`Price ID para PREMIUM (desde .env): ->|${process.env.STRIPE_PRICE_ID_PREMIUM}|<-`);
            // --- FIN DE LA DEPURACIÓN AVANZADA ---

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
            user.subscriptionStatus = subscription.status;
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
            user.subscriptionPlan = 'free';
            await user.save();
            console.log(`Suscripción cancelada en la base de datos para el usuario: ${user._id}`);
        }
    } catch (error) {
        console.error(`Error al cancelar la suscripción ${subscription.id}:`, error);
    }
}
