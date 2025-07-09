// controllers/subscriptionController.js (CORREGIDO)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// 1. Importamos los objetos necesarios de la librería de Mercado Pago
const { MercadoPagoConfig, Preference } = require('mercadopago');
const User = require('../models/User');

// 2. Creamos una instancia del cliente de Mercado Pago con el Access Token
const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Define los precios de tus planes de Stripe
const STRIPE_PLANS = {
    medium: { priceId: process.env.STRIPE_PRICE_ID_MEDIUM },
    premium: { priceId: process.env.STRIPE_PRICE_ID_PREMIUM },
};

// Define los precios para Mercado Pago
const MERCADOPAGO_PLANS = {
    medium: { title: 'Plan Coleccionista PRO', price: 4.99 },
    premium: { title: 'Plan Leyenda Arcade', price: 9.99 },
};


/**
 * Crea una sesión de pago en Stripe.
 */
exports.createStripeSession = async (req, res) => {
    const { planId } = req.body;
    const userId = req.user.id;

    if (!STRIPE_PLANS[planId]) {
        return res.status(400).json({ message: 'Plan no válido.' });
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


/**
 * Crea una preferencia de pago en Mercado Pago.
 */
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

        // 3. Creamos una instancia de "Preference" usando el cliente
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

        // 4. Usamos el cliente de preferencia para crearla
        const response = await preferenceClient.create({ body: preferenceData });
        res.json({ redirectUrl: response.init_point });

    } catch (error) {
        console.error("Error creando preferencia de Mercado Pago:", error);
        res.status(500).json({ message: 'Error al iniciar el pago con Mercado Pago.' });
    }
};