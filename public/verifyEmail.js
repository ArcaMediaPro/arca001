// public/verifyEmail.js (CON REDIRECCIÓN AUTOMÁTICA)

document.addEventListener('DOMContentLoaded', async () => {
    const messageContainer = document.getElementById('verification-container');
    
    /**
     * Muestra un mensaje en el contenedor principal.
     * @param {string} title - El título del mensaje (H1).
     * @param {string} text - El texto del párrafo.
     * @param {boolean} showLoginButton - Si se debe mostrar un botón para ir a la app.
     */
    const showMessage = (title, text, showLoginButton = false) => {
        let buttonHtml = '';
        if (showLoginButton) {
            // El enlace ahora apunta a la raíz, que sirve main.html
            buttonHtml = `<a href="/">Ir a Iniciar Sesión</a>`;
        }
        if (messageContainer) {
            messageContainer.innerHTML = `<h1>${title}</h1><p>${text}</p>${buttonHtml}`;
        }
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

    // 3. Enviar el token al backend
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
            // --- INICIO DE LA MODIFICACIÓN ---
            // Mostramos el mensaje de éxito
            showMessage('¡Cuenta Verificada!', data.message, false); // false para no mostrar el botón
            
            // Añadimos un mensaje de redirección
            const redirectMessage = document.createElement('p');
            redirectMessage.textContent = 'Serás redirigido en 3 segundos...';
            redirectMessage.style.fontSize = '0.9em';
            redirectMessage.style.marginTop = '20px';
            messageContainer.appendChild(redirectMessage);

            // Creamos una redirección automática después de 3 segundos
            setTimeout(() => {
                window.location.href = '/'; // Redirigimos a la página principal
            }, 3000); 
            // --- FIN DE LA MODIFICACIÓN ---
        } else {
            // Si la verificación falla, mostramos un error y el botón para reintentar
            showMessage('Error de Verificación', data.message, true);
        }

    } catch (error) {
        console.error('Error de red al verificar:', error);
        showMessage('Error de Conexión', 'No se pudo contactar al servidor. Por favor, inténtalo más tarde.', true);
    }
});