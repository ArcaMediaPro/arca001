// public/promoMain.js (Versión Final Corregida y Actualizada)

import { loadTranslations, getText } from './i18n.js';
// Importamos las funciones que necesitamos de authClient
import { loginUser, registerUser, requestPasswordReset, displayAuthMessage, initAuthUI } from './authClient.js';

/**
 * Actualiza todos los elementos del DOM que tienen una clave de traducción.
 */
const updateUIText = () => {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const translation = getText(key);
        if (translation && !translation.startsWith('[')) {
            element.innerHTML = translation;
        }
    });
};

/**
 * Carga las traducciones para un idioma específico, actualiza la UI y lo guarda.
 */
const setLanguage = async (lang) => {
    localStorage.setItem('userLanguage', lang);
    await loadTranslations(lang);
    document.documentElement.lang = lang;
    updateUIText();
};

/**
 * Lógica que se ejecuta cuando el DOM está completamente cargado.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Configuración de Idioma ---
    const langSelector = document.getElementById('language-selector');
    const savedLang = localStorage.getItem('userLanguage') || 'es';
    if (langSelector) {
        langSelector.value = savedLang;
        setLanguage(savedLang);
        langSelector.addEventListener('change', (e) => {
            e.preventDefault();
            setLanguage(e.target.value);
        });
    }






// --- INICIO: Lógica de Validación y Envío para el Registro (Versión Robusta) ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Selección de Elementos del DOM ---
    const registerForm = document.getElementById('register-form');
    const registerPasswordInput = document.getElementById('register-password');
    const registerPasswordConfirmInput = document.getElementById('register-password-confirm');
    const passwordValidationMessage = document.getElementById('password-validation-message');
    const registerSubmitBtn = document.getElementById('register-submit-btn');
    const authMessage = document.getElementById('auth-message'); // Mensaje general
    const usernameInput = document.getElementById('register-username');

    // --- Verificación de elementos esenciales ---
    // Si falta alguno de los elementos clave, detenemos el script y avisamos en la consola.
    if (!registerForm || !registerPasswordInput || !registerPasswordConfirmInput || !passwordValidationMessage || !registerSubmitBtn || !authMessage || !usernameInput) {
        console.error("Error crítico: Uno o más elementos del formulario de registro no se encontraron en el DOM. El script no se ejecutará.");
        return; // Detenemos la ejecución para prevenir más errores.
    }

    // --- Función para validar las contraseñas en tiempo real ---
    const validatePasswords = () => {
        const pass = registerPasswordInput.value;
        const confirmPass = registerPasswordConfirmInput.value;
        let message = '';
        let passwordsAreValid = true;

        if (pass.length > 0 && pass.length < 7) {
            message = 'La contraseña debe tener al menos 7 caracteres.';
            passwordsAreValid = false;
        } else if (pass && confirmPass && pass !== confirmPass) {
            message = 'Las contraseñas no coinciden.';
            passwordsAreValid = false;
        }

        if (message) {
            passwordValidationMessage.textContent = message;
            passwordValidationMessage.style.display = 'block';
        } else {
            passwordValidationMessage.style.display = 'none';
        }

        registerSubmitBtn.disabled = !passwordsAreValid || !pass || !confirmPass;
    };

    // --- Listeners para validación en tiempo real ---
    registerPasswordInput.addEventListener('keyup', validatePasswords);
    registerPasswordConfirmInput.addEventListener('keyup', validatePasswords);

    // --- Manejador del envío del formulario ---
    registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        validatePasswords();

        if (!registerSubmitBtn.disabled) {
            handleSuccessfulRegistration();
        } else {
            console.warn("Envío bloqueado por validación fallida.");
        }
    });

    // --- Función para manejar el proceso POST-registro ---
    const handleSuccessfulRegistration = () => {
        const username = usernameInput.value;

        // 1. Mostrar estado de "cargando"
        registerSubmitBtn.disabled = true;
        registerSubmitBtn.textContent = 'Registrando...';
        authMessage.style.display = 'none';

        // 2. SIMULAMOS una llamada al servidor
        setTimeout(() => {
            // 3. Mostramos el mensaje de éxito en el div correcto
            authMessage.textContent = `¡Gracias por registrarte, ${username}! Revisa tu correo para confirmar tu cuenta.`;
            authMessage.className = 'auth-message success'; // Asignamos clase para estilos (ej. color verde)
            authMessage.style.display = 'block';

            // 4. Limpiamos y reseteamos el formulario
            registerForm.reset();
            passwordValidationMessage.style.display = 'none';
            registerSubmitBtn.textContent = 'Crear Cuenta';
            validatePasswords(); // Esto re-evaluará y deshabilitará el botón correctamente

        }, 1000); // 1 segundo de espera
    };
});






    // --- Lógica del Modal de Autenticación ---
    const authModal = document.getElementById('auth-modal-overlay');
    const closeModalBtn = document.getElementById('auth-modal-close');
    
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const resetFormContainer = document.getElementById('promo-request-reset-form-container');

    const showModal = (view = 'login') => {
        if (authModal) {
            // AHORA le decimos explícitamente dónde limpiar el mensaje
            displayAuthMessage('', false, false, 'auth-message');
            showAuthFormView(view);
            authModal.style.display = 'flex';
        }
    };

    const hideModal = () => {
        if (authModal) {
            authModal.style.display = 'none';
        }
    };
    
    const showAuthFormView = (viewToShow) => {
        if(loginFormContainer) loginFormContainer.style.display = 'none';
        if(registerFormContainer) registerFormContainer.style.display = 'none';
        if(resetFormContainer) resetFormContainer.style.display = 'none';

        if (viewToShow === 'login' && loginFormContainer) loginFormContainer.style.display = 'block';
        if (viewToShow === 'register' && registerFormContainer) registerFormContainer.style.display = 'block';
        if (viewToShow === 'reset' && resetFormContainer) resetFormContainer.style.display = 'block';
    };

    // --- Event Listeners para abrir/cerrar el modal ---
    document.getElementById('promo-btn-show-login')?.addEventListener('click', () => showModal('login'));
    document.getElementById('promo-link-show-login-hero')?.addEventListener('click', (e) => { e.preventDefault(); showModal('login'); });
    document.getElementById('promo-btn-show-register')?.addEventListener('click', () => showModal('register'));
    document.getElementById('promo-btn-cta-register')?.addEventListener('click', () => showModal('register'));
    
    closeModalBtn?.addEventListener('click', hideModal);
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) hideModal();
    });

    // --- Listeners para cambiar entre formularios dentro del modal ---
    document.getElementById('show-register-from-login')?.addEventListener('click', (e) => { e.preventDefault(); showAuthFormView('register'); });
    document.getElementById('show-login-from-register')?.addEventListener('click', (e) => { e.preventDefault(); showAuthFormView('login'); });
    document.getElementById('show-request-reset-form-modal')?.addEventListener('click', (e) => { e.preventDefault(); showAuthFormView('reset'); });
    document.getElementById('show-login-from-reset')?.addEventListener('click', (e) => { e.preventDefault(); showAuthFormView('login'); });

    // --- Listeners para el envío de formularios ---
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        // AHORA le pasamos el ID del div de mensajes
        await loginUser(username, password, 'auth-message');
    });

    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        // AHORA le pasamos el ID del div de mensajes
        await registerUser(username, email, password, 'auth-message');
    });
    
    // --- BLOQUE ACTUALIZADO ---
    document.getElementById('promo-request-reset-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('promo-reset-email').value;
        const submitButton = e.target.querySelector('button[type="submit"]');

        if (submitButton) submitButton.disabled = true;

        // Esta función de authClient.js ya la tienes.
        // Llama a nuestro backend para iniciar el proceso.
        const result = await requestPasswordReset(email);

        // Muestra el mensaje de éxito o error en el modal.
        if (result.message) {
            // NOTA: Corregido '!response.ok' por '!result.success' para que funcione.
            displayAuthMessage(result.message, !result.success, true, 'auth-message');
        }

        if (submitButton) submitButton.disabled = false;
    });
    // --- FIN DEL BLOQUE ACTUALIZADO ---

    // --- Lógica del menú móvil y footer ---
    const mobileMenuToggle = document.getElementById('promo-mobile-menu-toggle');
    const promoMenu = document.querySelector('.promo-menu');
    if (mobileMenuToggle && promoMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            promoMenu.classList.toggle('active');
        });
    }
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});