// public/verifyEmail.js (ACTUALIZADO PARA USAR POST)

document.addEventListener('DOMContentLoaded', async () => {
    const messageContainer = document.getElementById('verification-container');
    
    const showMessage = (title, text, showLoginButton = false) => {
        let buttonHtml = '';
        if (showLoginButton) {
            buttonHtml = `<a href="/app">Ir a Iniciar Sesión</a>`;
        }
        messageContainer.innerHTML = `<h1>${title}</h1><p>${text}</p>${buttonHtml}`;
    };

    showMessage('Verificando...', 'Estamos validando tu cuenta. Por favor, espera un momento.');
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showMessage('Error', 'Falta el token de verificación. Por favor, usa el enlace de tu correo.', true);
        return;
    }

    try {
        // <<< CAMBIO CLAVE: Ahora usamos fetch con método POST y enviamos el token en el cuerpo >>>
        const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: token })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('¡Cuenta Verificada!', data.message, true);
        } else {
            showMessage('Error de Verificación', data.message, true);
        }

    } catch (error) {
        console.error('Error de red al verificar:', error);
        showMessage('Error de Conexión', 'No se pudo contactar al servidor. Por favor, inténtalo más tarde.', true);
    }
});