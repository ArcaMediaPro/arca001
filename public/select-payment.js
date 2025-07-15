// public/select-payment.js (con lógica de i18n)
import { loadTranslations, getText } from './i18n.js';

// --- INICIO DE LA CORRECCIÓN ---
// Función para leer una cookie específica
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
// --- FIN DE LA CORRECCIÓN ---

// --- FUNCIONES DE TRADUCCIÓN (ESPECÍFICAS PARA ESTA PÁGINA) ---
const applyTranslations = () => {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        try {
            const translatedText = getText(key);
            const targetAttr = element.getAttribute('data-i18n-target-attr');
            if (targetAttr) {
                element.setAttribute(targetAttr, translatedText);
            } else {
                element.textContent = translatedText;
            }
        } catch (e) {
            console.warn(`Clave de traducción no encontrada: ${key}`);
        }
    });
};

const initializeLanguage = async () => {
    const supportedLanguages = ['es', 'en', 'it', 'pt', 'ja', 'ru', 'fr', 'hi', 'cn', 'de'];
    
    // --- INICIO DE LA CORRECCIÓN ---
    // Ahora busca en localStorage, luego en la cookie, y finalmente en el navegador.
    let langToUse = localStorage.getItem('userLanguage') || getCookie('preferredLanguage') || (navigator.language || navigator.userLanguage).split(/[-_]/)[0];
    // --- FIN DE LA CORRECCIÓN ---

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
                // Para iniciar un pago, el usuario ya debe estar autenticado,
                // por lo que la cookie de sesión se enviará automáticamente.
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
