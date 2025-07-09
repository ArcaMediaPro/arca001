// controllers/subscriptionController.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mercadopago = require('mercadopago');
const User = require('../models/User');

// Configura el Access Token de Mercado Pago
mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Define los precios de tus planes. DEBES CREAR ESTOS PRODUCTOS EN TU DASHBOARD DE STRIPE.
const STRIPE_PLANS = {
    medium: { priceId: 'price_1RixNDQ1ZvKIrs41AOWTLwRk' }, // Reemplazar con tu Price ID real
    premium: { priceId: 'price_1RixQKQ1ZvKIrs41gQAybPx6' }, // Reemplazar con tu Price ID real
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

        // Si el usuario no tiene un ID de cliente de Stripe, se crea uno nuevo.
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.username,
                metadata: {
                    userId: user._id.toString(),
                },
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
            metadata: {
                userId: userId,
            }
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

        const preference = {
            items: [
                {
                    title: MERCADOPAGO_PLANS[planId].title,
                    unit_price: MERCADOPAGO_PLANS[planId].price,
                    quantity: 1,
                    currency_id: 'ARS' // O la moneda que corresponda
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
            external_reference: userId, // Guardamos el ID del usuario para identificarlo después
        };

        const response = await mercadopago.preferences.create(preference);
        res.json({ redirectUrl: response.body.init_point });

    } catch (error) {
        console.error("Error creando preferencia de Mercado Pago:", error);
        res.status(500).json({ message: 'Error al iniciar el pago con Mercado Pago.' });
    }
};
