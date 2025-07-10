// Este script maneja la lógica de la página de selección de pago.

document.addEventListener('DOMContentLoaded', () => {
    const stripeBtn = document.getElementById('pay-with-stripe');
    const mpBtn = document.getElementById('pay-with-mercadopago');
    const loader = document.getElementById('payment-loader');
    const errorP = document.getElementById('payment-error');

    // Leemos el plan que viene en la URL (ej: ?plan=medium)
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('plan');

    if (!planId) {
        showError('Error: No se ha especificado un plan. Serás redirigido.');
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
            // Usamos el token de autenticación que ya está en las cookies
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