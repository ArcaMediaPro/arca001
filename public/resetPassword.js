// public/resetPassword.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-password-form');
    const tokenInput = document.getElementById('reset-token');
    const messageDiv = document.getElementById('reset-message');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitButton = form.querySelector('button[type="submit"]');

    // 1. Extraer el token de la URL en cuanto carga la página
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        tokenInput.value = token;
    } else {
        messageDiv.textContent = 'Token de reseteo no encontrado. Por favor, utiliza el enlace enviado a tu correo.';
        messageDiv.className = 'auth-message error';
        messageDiv.style.display = 'block';
        if (form) form.style.display = 'none'; // Ocultar formulario si no hay token
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const currentToken = tokenInput.value;

            // 2. Validación simple en el frontend
            if (newPassword.length < 6) {
                messageDiv.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
                messageDiv.className = 'auth-message error';
                messageDiv.style.display = 'block';
                return;
            }

            if (newPassword !== confirmPassword) {
                messageDiv.textContent = 'Las contraseñas no coinciden. Por favor, inténtalo de nuevo.';
                messageDiv.className = 'auth-message error';
                messageDiv.style.display = 'block';
                return;
            }

            if (submitButton) submitButton.disabled = true;
            messageDiv.style.display = 'none';

            // 3. Enviar la solicitud al backend
            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: currentToken, newPassword })
                });

                const data = await response.json();

                messageDiv.textContent = data.message;
                if (response.ok) {
                    messageDiv.className = 'auth-message success';
                    if (form) form.style.display = 'none';
                    // Opcional: Redirigir al usuario tras unos segundos
                    setTimeout(() => window.location.href = '/promocional.html', 5000);
                } else {
                    messageDiv.className = 'auth-message error';
                    if (submitButton) submitButton.disabled = false;
                }
                messageDiv.style.display = 'block';

            } catch (error) {
                messageDiv.textContent = 'Error de conexión con el servidor. Inténtalo más tarde.';
                messageDiv.className = 'auth-message error';
                messageDiv.style.display = 'block';
                if (submitButton) submitButton.disabled = false;
            }
        });
    }
});