// controllers/subscriptionController.js (REESTRUCTURADO Y CORREGIDO)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MercadoPagoConfig, Preference, PreApproval } = require('mercadopago');
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

// --- Creación de Sesiones de Pago ---

exports.createStripeSession = async (req, res) => {
    const { planId } = req.body;
    const userId = req.user.id;

    if (!STRIPE_PLANS[planId] || !STRIPE_PLANS[planId].priceId) {
        console.error(`Error: Price ID para el plan '${planId}' no está configurado.`);
        return res.status(400).json({ message: 'La configuración para este plan no está completa.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

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
            line_items: [{ price: STRIPE_PLANS[planId].priceId, quantity: 1 }],
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
                    currency_id: 'ARS' // Asegúrate de que esta es la moneda correcta
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
        res.json({ redirectUrl: response.init_point }); // Corregido para enviar response.init_point

    } catch (error) {
        console.error("Error creando preferencia de Mercado Pago:", error);
        res.status(500).json({ message: 'Error al iniciar el pago con Mercado Pago.' });
    }
};

exports.getStripeSessionStatus = async (req, res) => {
    const { session_id } = req.query;

    try {
        if (!session_id) {
            return res.status(400).json({ message: 'Falta el ID de la sesión.' });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        if (session.payment_status !== 'paid') {
            return res.status(402).json({ message: 'El pago no ha sido completado.' });
        }

        const user = await User.findOne({ stripeCustomerId: session.customer });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const payload = {
            id: user._id,
            username: user.username,
            role: user.role,
            email: user.email,
            plan: user.subscriptionPlan,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });
        
        res.cookie('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', maxAge: 3600000 });
        res.json({ message: 'Sesión sincronizada' });

    } catch (error) {
        console.error("Error verificando la sesión de Stripe:", error);
        res.status(500).json({ message: 'Error al verificar el estado del pago.' });
    }
};


// --- FUNCIÓN UNIFICADA PARA CANCELAR SUSCRIPCIÓN (INICIADA POR EL USUARIO) ---
exports.cancelSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || user.subscriptionStatus !== 'active') {
            return res.status(400).json({ message: 'No se encontró una suscripción activa para cancelar.' });
        }

        // Lógica para cancelar en Stripe
        if (user.subscriptionProvider === 'stripe' && user.stripeSubscriptionId) {
            console.log(`Iniciando cancelación en Stripe para la suscripción: ${user.stripeSubscriptionId}`);
            await stripe.subscriptions.update(user.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            user.subscriptionStatus = 'pending_cancellation';
            await user.save();
            return res.status(200).json({ message: 'Tu suscripción de Stripe ha sido programada para su cancelación. Seguirás teniendo acceso hasta el final de tu ciclo de facturación.' });
        }
        
        // Lógica para cancelar en Mercado Pago
        if (user.subscriptionProvider === 'mercadopago' && user.mercadoPagoSubscriptionId) {
            console.log(`Iniciando cancelación en Mercado Pago para la suscripción: ${user.mercadoPagoSubscriptionId}`);
            const preapproval = new PreApproval(mpClient);
            await preapproval.update({ id: user.mercadoPagoSubscriptionId, body: { status: 'cancelled' } });
            user.subscriptionStatus = 'cancelled';
            await user.save();
            return res.status(200).json({ message: 'Tu suscripción de Mercado Pago ha sido cancelada.' });
        }

        return res.status(400).json({ message: 'No se pudo determinar el proveedor de la suscripción o falta el ID correspondiente.' });

    } catch (error) {
        console.error("Error cancelando la suscripción:", error);
        res.status(500).json({ message: 'Error al procesar la cancelación de la suscripción.' });
    }
};