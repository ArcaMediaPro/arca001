// public/verifyEmail.js

document.addEventListener('DOMContentLoaded', async () => {
    const messageContainer = document.getElementById('verification-container');
    
    // Función para mostrar mensajes
    const showMessage = (title, text, showLoginButton = false) => {
        let buttonHtml = '';
        if (showLoginButton) {
            // Apunta a /app, la ruta que definimos para la app principal
            buttonHtml = `<a href="/app">Iniciar Sesión</a>`;
        }
        messageContainer.innerHTML = `<h1>${title}</h1><p>${text}</p>${buttonHtml}`;
    };

    // 1. Mostrar un mensaje de "cargando" inicial
    showMessage('Verificando...', 'Estamos validando tu cuenta. Por favor, espera un momento.');

    // 2. Extraer el token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showMessage('Error', 'Falta el token de verificación. Por favor, usa el enlace de tu correo.', true);
        return;
    }

    // 3. Enviar el token al backend usando un método POST
    try {
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