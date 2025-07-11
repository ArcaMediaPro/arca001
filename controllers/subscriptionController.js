// controllers/subscriptionController.js (CON FUNCIÓN DE CANCELACIÓN)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MercadoPagoConfig, Preference } = require('mercadopago');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

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


// =================================================================
// === INICIO: NUEVA FUNCIÓN PARA SINCRONIZAR LA SESIÓN          ===
// =================================================================

/**
 * Verifica el estado de una sesión de Checkout de Stripe y devuelve un nuevo token.
 */
exports.getStripeSessionStatus = async (req, res) => {
    const { session_id } = req.query;

    try {
        if (!session_id) {
            return res.status(400).json({ message: 'Falta el ID de la sesión.' });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        // Verificamos que la sesión de pago fue exitosa
        if (session.payment_status !== 'paid') {
            return res.status(402).json({ message: 'El pago no ha sido completado.' });
        }

        // Buscamos al usuario asociado a esta sesión
        const user = await User.findOne({ stripeCustomerId: session.customer });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Creamos un nuevo token con la información actualizada del usuario
        const payload = {
            id: user._id,
            username: user.username,
            role: user.role,
            email: user.email,
            plan: user.subscriptionPlan, // Usamos el plan actualizado de la BD
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1h', // O la duración que prefieras
        });
        
        // Devolvemos el nuevo token al frontend
        res.json({ token });

    } catch (error) {
        console.error("Error verificando la sesión de Stripe:", error);
        res.status(500).json({ message: 'Error al verificar el estado del pago.' });
    }
};
// =================================================================
// === FIN: NUEVA FUNCIÓN                                        ===
// =================================================================


// =================================================================
// === INICIO: NUEVA FUNCIÓN PARA CANCELAR LA SUSCRIPCIÓN        ===
// =================================================================
/**
 * Cancela una suscripción activa de Stripe al final del período de facturación.
 */
exports.cancelStripeSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.stripeSubscriptionId) {
            return res.status(400).json({ message: 'No se encontró una suscripción activa para cancelar.' });
        }

        // Le decimos a Stripe que cancele la suscripción al final del período actual.
        // El usuario mantendrá el acceso hasta la fecha de vencimiento.
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        // Actualizamos el estado en nuestra base de datos para reflejar la cancelación pendiente.
        user.subscriptionStatus = 'canceled';
        await user.save();

        res.status(200).json({ message: 'Tu suscripción ha sido cancelada y no se renovará. Seguirás teniendo acceso hasta el final de tu ciclo de facturación.' });

    } catch (error) {
        console.error("Error cancelando la suscripción de Stripe:", error);
        res.status(500).json({ message: 'Error al procesar la cancelación de la suscripción.' });
    }
};
// =================================================================
// === FIN: NUEVA FUNCIÓN                                        ===
// =================================================================



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
