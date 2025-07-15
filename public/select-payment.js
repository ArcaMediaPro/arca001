// public/select-payment.js (con lógica de i18n)
import { loadTranslations, getText } from './i18n.js';

// --- FUNCIONES DE TRADUCCIÓN (ESPECÍFICAS PARA ESTA PÁGINA) ---
const applyTranslations = () => {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        try {
            element.textContent = getText(key);
        } catch (e) {
            console.warn(`Clave de traducción no encontrada: ${key}`);
        }
    });
};

const initializeLanguage = async () => {
    const supportedLanguages = ['es', 'en', 'it', 'pt', 'ja', 'ru', 'fr', 'hi', 'cn', 'de'];
    let langToUse = localStorage.getItem('userLanguage') || (navigator.language || navigator.userLanguage).split(/[-_]/)[0];
    if (!supportedLanguages.includes(langToUse)) {
        langToUse = 'es';
    }
    await loadTranslations(langToUse);
    applyTranslations();
};

// --- LÓGICA DE PAGO ---
document.addEventListener('DOMContentLoaded', () => {
    // Primero, inicializamos el idioma
    initializeLanguage().then(() => {
        // Una vez cargadas las traducciones, configuramos los botones
        const stripeBtn = document.getElementById('pay-with-stripe');
        const mpBtn = document.getElementById('pay-with-mercadopago');
        const loader = document.getElementById('payment-loader');
        const errorP = document.getElementById('payment-error');

        const urlParams = new URLSearchParams(window.location.search);
        const planId = urlParams.get('plan');

        const resetUI = () => {
            if (loader) loader.style.display = 'none';
            if (errorP) errorP.style.display = 'none';
            if (stripeBtn) stripeBtn.style.display = 'inline-block';
            if (mpBtn) mpBtn.style.display = 'inline-block';
        };

        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                resetUI();
            }
        });

        if (!planId) {
            showError(getText('selectPayment_errorNoPlan'));
            setTimeout(() => { window.location.href = '/promocional.html'; }, 4000);
            return;
        }

        const initiatePayment = async (provider) => {
            showLoader(true);
            showError('');

            const endpoint = provider === 'stripe'
                ? '/api/subscriptions/create-stripe-session'
                : '/api/subscriptions/create-mercadopago-preference';

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'No se pudo iniciar el proceso de pago.');
                }

                const session = await response.json();

                if (session.redirectUrl) {
                    window.location.href = session.redirectUrl;
                } else {
                    throw new Error('No se recibió una URL de redirección.');
                }

            } catch (error) {
                showError(error.message);
                showLoader(false);
            }
        };

        const showLoader = (show) => {
            if (loader) loader.style.display = show ? 'block' : 'none';
            if (stripeBtn) stripeBtn.style.display = show ? 'none' : 'inline-block';
            if (mpBtn) mpBtn.style.display = show ? 'none' : 'inline-block';
        };

        const showError = (message) => {
            if (errorP) {
                errorP.textContent = message;
                errorP.style.display = message ? 'block' : 'none';
            }
        };

        if (stripeBtn) {
            stripeBtn.addEventListener('click', () => initiatePayment('stripe'));
        }
        if (mpBtn) {
            mpBtn.addEventListener('click', () => initiatePayment('mercadopago'));
        }
    });
});