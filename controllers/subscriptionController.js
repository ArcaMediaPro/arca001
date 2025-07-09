// controllers/subscriptionController.js (CORREGIDO CON DEPURACIÓN Y VERIFICACIÓN DE SECRET)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MercadoPagoConfig, Preference } = require('mercadopago');
const User = require('../models/User');

const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const STRIPE_PLANS = {
    medium: { priceId: process.env.STRIPE_PRICE_ID_MEDIUM },
    premium: { priceId: process.env.STRIPE_PRICE_ID_PREMIUM },
};

const MERCADOPAGO_PLANS = {
    medium: { title: 'Plan Coleccionista PRO', price: 4.99 },
    premium: { title: 'Plan Leyenda Arcade', price: 9.99 },
};


exports.createStripeSession = async (req, res) => {
    const { planId } = req.body;
    const userId = req.user.id;

    if (!STRIPE_PLANS[planId] || !STRIPE_PLANS[planId].priceId) {
        console.error(`Error: Price ID para el plan '${planId}' no está configurado en las variables de entorno.`);
        return res.status(400).json({ message: 'La configuración para este plan no está completa.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        let stripeCustomerId = user.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.username,
                metadata: { userId: user._id.toString() },
            });
            stripeCustomerId = customer.id;
            user.stripeCustomerId = stripeCustomerId;
            await user.save();
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [{
                price: STRIPE_PLANS[planId].priceId,
                quantity: 1,
            }],
            success_url: `${process.env.FRONTEND_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment-canceled.html`,
            metadata: { userId: userId }
        });

        res.json({ redirectUrl: session.url });

    } catch (error) {
        console.error("Error creando sesión de Stripe:", error);
        res.status(500).json({ message: 'Error al iniciar el pago con Stripe.' });
    }
};


exports.createMercadoPagoPreference = async (req, res) => {
    const { planId } = req.body;
    const userId = req.user.id;

    if (!MERCADOPAGO_PLANS[planId]) {
        return res.status(400).json({ message: 'Plan no válido.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const preferenceClient = new Preference(mpClient);

        const preferenceData = {
            items: [
                {
                    title: MERCADOPAGO_PLANS[planId].title,
                    unit_price: MERCADOPAGO_PLANS[planId].price,
                    quantity: 1,
                    currency_id: 'ARS'
                }
            ],
            payer: {
                email: user.email,
            },
            back_urls: {
                success: `${process.env.FRONTEND_URL}/payment-success.html`,
                failure: `${process.env.FRONTEND_URL}/payment-canceled.html`,
                pending: `${process.env.FRONTEND_URL}/payment-pending.html`,
            },
            auto_return: 'approved',
            external_reference: userId,
        };

        const response = await preferenceClient.create({ body: preferenceData });
        res.json({ redirectUrl: response.init_point });

    } catch (error) {
        console.error("Error creando preferencia de Mercado Pago:", error);
        res.status(500).json({ message: 'Error al iniciar el pago con Mercado Pago.' });
    }
};

// --- Funciones auxiliares para manejar los webhooks ---

// Se añade la función handleStripeWebhook que faltaba
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verificamos que la clave secreta del webhook esté configurada.
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

            console.log('--- Depuración de Webhook de Activación ---');
            console.log(`Price ID recibido de Stripe: ${priceId}`);
            console.log(`Price ID para MEDIUM (desde .env): ${process.env.STRIPE_PRICE_ID_MEDIUM}`);
            console.log(`Price ID para PREMIUM (desde .env): ${process.env.STRIPE_PRICE_ID_PREMIUM}`);

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
