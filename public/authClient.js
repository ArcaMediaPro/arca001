// authClient.js (MODIFICADO Y CORREGIDO)
import { API_BASE_URL } from './appConfig.js';
import { getElem } from './domUtils.js';
import { clearUserServerThemeSettingsCache } from './config.js';
import { notificationService } from './notificationService.js';
// --- IMPORTACIÓN PARA I18N ---
import { getText } from './i18n.js';

// --- Global Authentication Variables ---
export let globalCsrfToken = null;
export let currentLoggedInUsername = null;
export let currentUserRole = null;
export let currentLoggedInUserEmail = null;
export let currentUserThemeSettings = null;
export let currentUserLanguage = null;

// Variables para el contador de plan
export let currentUserPlanName = null;
export let currentUserGameCount = 0;
export let currentUserPlanLimit = 0;

let authArea;
let gameArea;
let userInfoDiv;
let loggedInUsernameSpan;
let logoutButton;
let loginFormContainer;
let registerFormContainer;
let requestResetFormContainer;
let loginForm;
let registerForm;
let requestResetForm;
let loginUsernameInput;
let loginPasswordInput;
let registerUsernameInput;
let registerPasswordInput;
let registerEmailInput;
let resetEmailInput;
let authMessageDiv;

// --- INICIO: NUEVA FUNCIÓN PARA INICIAR SUSCRIPCIÓN ---
/**
 * Inicia el proceso de pago para un plan específico.
 * @param {string} planId - El ID del plan ('medium' o 'premium').
 */
async function initiateSubscription(planId) {
    // Por ahora, usamos Stripe por defecto. Más adelante podemos añadir la lógica para que el usuario elija.
    const provider = 'stripe'; 
    const endpoint = provider === 'stripe' 
        ? `${API_BASE_URL}/subscriptions/create-stripe-session`
        : `${API_BASE_URL}/subscriptions/create-mercadopago-preference`;

    try {
        notificationService.info(getText('subscription_initiating'));

        const response = await fetchAuthenticated(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId }),
        });

        const session = await response.json();

        if (session.redirectUrl) {
            // Limpiamos el plan pendiente antes de redirigir
            sessionStorage.removeItem('pendingSubscriptionPlan');
            window.location.href = session.redirectUrl;
        } else {
            throw new Error('No se recibió una URL de redirección de la pasarela de pago.');
        }
    } catch (error) {
        console.error('Error al iniciar la suscripción:', error);
        notificationService.error(error.message || getText('subscription_error_start'));
    }
}
// --- FIN: NUEVA FUNCIÓN ---


export function initAuthUI() {
    authArea = getElem('auth-area', false);
    gameArea = getElem('game-area', false);
    userInfoDiv = getElem('user-info', false);
    loggedInUsernameSpan = getElem('logged-in-username', false);
    logoutButton = getElem('logout-button', false);

    loginFormContainer = getElem('login-form-container', false);
    registerFormContainer = getElem('register-form-container', false);
    requestResetFormContainer = getElem('request-reset-form-container', false) || getElem('promo-request-reset-form-container', false);

    loginForm = getElem('login-form', false);
    registerForm = getElem('register-form', false);
    requestResetForm = getElem('request-reset-form', false) || getElem('promo-request-reset-form', false);

    authMessageDiv = getElem('auth-message', false);

    if (loginForm) {
        loginUsernameInput = loginForm.querySelector('#login-username');
        loginPasswordInput = loginForm.querySelector('#login-password');
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = loginUsernameInput ? loginUsernameInput.value.trim() : '';
            const password = loginPasswordInput ? loginPasswordInput.value.trim() : '';
            if (!username || !password) {
                displayAuthMessage(getText('auth_enterUserPass'), true);
                return;
            }
            await loginUser(username, password);
        });
    }

    if (registerForm) {
        registerUsernameInput = registerForm.querySelector('#register-username');
        registerEmailInput = registerForm.querySelector('#register-email');
        registerPasswordInput = registerForm.querySelector('#register-password');
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = registerUsernameInput ? registerUsernameInput.value.trim() : '';
            const email = registerEmailInput ? registerEmailInput.value.trim() : '';
            const password = registerPasswordInput ? registerPasswordInput.value.trim() : '';
            
            let Rmsg = "";
            if (!username) { Rmsg += getText('auth_enterUsername') + " "; }
            if (!email) { Rmsg += getText('auth_enterEmail') + " "; }
            if (!password) { Rmsg += getText('auth_enterPassword') + " "; }
            if(Rmsg) {displayAuthMessage(Rmsg.trim(), true); return;}

            await registerUser(username, email, password);
        });
    }

    if (requestResetForm) {
        resetEmailInput = requestResetForm.querySelector('#reset-email') || requestResetForm.querySelector('#promo-reset-email');
        if (resetEmailInput) {
            requestResetForm.addEventListener('submit', handleRequestPasswordReset);
        } else {
            console.warn(getText('auth_warn_resetEmailInputNotFound'));
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }
}

function displayAuthFormView(viewToShow) {
    if (loginFormContainer) loginFormContainer.style.display = (viewToShow === 'login' ? 'block' : 'none');
    if (registerFormContainer) registerFormContainer.style.display = (viewToShow === 'register' ? 'block' : 'none');
    if (requestResetFormContainer) requestResetFormContainer.style.display = (viewToShow === 'requestReset' ? 'block' : 'none');

    if (authMessageDiv) {
        authMessageDiv.textContent = '';
        authMessageDiv.className = 'auth-message';
    }
}


export function showLoginFormView() {
    displayAuthFormView('login');
}
export function showRegisterFormView() {
    displayAuthFormView('register');
}
export function showRequestResetFormView() {
    displayAuthFormView('requestReset');
}

export function showAuthUI() {
    currentLoggedInUsername = null;
    currentUserRole = null;
    currentLoggedInUserEmail = null;
    globalCsrfToken = null;
    currentUserThemeSettings = null;

    const isPromoPage = !!document.getElementById('promo-page-content');
    if (isPromoPage) {
        const promoAuthModal = document.getElementById('auth-modal-overlay');
        if (promoAuthModal) {
            const promoAuthMessage = promoAuthModal.querySelector('#auth-message');
            if (promoAuthMessage) {
                promoAuthMessage.textContent = '';
                promoAuthMessage.className = 'auth-message';
            }
        }
        console.log(getText('auth_log_showAuthUIPromo'));
    } else {
        if (authArea) authArea.style.display = 'flex';
        if (gameArea) gameArea.style.display = 'none';
        if (userInfoDiv) userInfoDiv.style.display = 'none';
        if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = '';
        document.body.classList.add('auth-view-active');
        showLoginFormView();
        console.log(getText('auth_log_showAuthUIIndex'));
    }
}

export async function showGameUI(usernameToDisplay) {
    const isPromoPage = !!document.getElementById('promo-page-content');
    if (isPromoPage) {
        console.log(getText('auth_log_showGameUIPromoRedirect'));
        window.location.href = 'index.html';
    } else {
        if (authArea) authArea.style.display = 'none';
        if (gameArea) gameArea.style.display = 'block';
        if (userInfoDiv) userInfoDiv.style.display = 'flex';
        if (loggedInUsernameSpan) {
            loggedInUsernameSpan.textContent = usernameToDisplay || currentLoggedInUsername || getText('auth_defaultUsername');
        }
        if (authMessageDiv && authArea && authArea.contains(authMessageDiv)) {
            authMessageDiv.textContent = '';
            authMessageDiv.className = 'auth-message';
        }
        document.body.classList.remove('auth-view-active');
        console.log(getText('auth_log_showGameUIIndex'));
    }
}

export function displayAuthMessage(message, isError = true, clearAfterDelay = false, targetElementId = null) {
    const targetDiv = targetElementId ? getElem(targetElementId, false) : authMessageDiv;
    if (targetDiv) {
        targetDiv.textContent = message;
        targetDiv.className = isError ? 'auth-message error' : 'auth-message success';
        targetDiv.style.display = message ? 'block' : 'none';
        if (clearAfterDelay && message) {
            setTimeout(() => {
                if (targetDiv.textContent === message) {
                    targetDiv.textContent = '';
                    targetDiv.className = 'auth-message';
                    targetDiv.style.display = 'none';
                }
            }, 7000);
        }
    } else {
        if (isError && message) {
            notificationService.error(message);
        }
        console.warn(getText('auth_warn_messageElementNotFound').replace('{elementId}', targetElementId || 'authMessageDiv (default)'));
    }
}

export function updatePlanCounterUI() {
    const counterElement = getElem('plan-usage-counter', false);
    if (!counterElement) {
        return;
    }

    if (currentUserPlanName === 'free' || currentUserPlanName === 'medium') {
        const label = getText('planCounter_label') || 'Juegos';
        counterElement.textContent = `${label}: ${currentUserGameCount} / ${currentUserPlanLimit}`;
        counterElement.style.display = 'block';
    } else {
        counterElement.style.display = 'none';
    }
}

export async function registerUser(username, email, password, targetElementId = null) {
    displayAuthMessage('', false, false, targetElementId);
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            displayAuthMessage(data.message || getText('auth_registrationSuccessWithVerification'), false, false, targetElementId);
            const registerForm = document.getElementById('register-form') || document.querySelector('.auth-modal-content #register-form');
            if (registerForm) {
                registerForm.reset();
            }
        } else {
            if (data.errors && Array.isArray(data.errors)) {
                const errorMessages = data.errors.map(err => err.msg).join('. ');
                displayAuthMessage(errorMessages, true, false, targetElementId);
            } else {
                displayAuthMessage(data.message || getText('auth_registrationError_status').replace('{status}', response.status), true, false, targetElementId);
            }
        }
    } catch (error) {
        console.error('Network or server error during registration:', error);
        notificationService.error(getText('auth_serverConnectionError_registration'), error);
    }
}

export async function loginUser(username, password, targetElementId = null) {
    displayAuthMessage('', false, false, targetElementId);
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();

        if (response.ok && data.user && data.csrfToken) {
            currentLoggedInUsername = data.user.username;
            currentUserRole = data.user.role || 'user';
            currentLoggedInUserEmail = data.user.email || null;
            globalCsrfToken = data.csrfToken;
            currentUserThemeSettings = data.themeSettings || {};
            currentUserLanguage = data.user.language || 'es';
            currentUserPlanName = data.user.planName;
            currentUserGameCount = data.user.gameCount;
            currentUserPlanLimit = data.user.planLimit;

            // --- INICIO DE LA LÓGICA DE SUSCRIPCIÓN ---
            const pendingPlanId = sessionStorage.getItem('pendingSubscriptionPlan');
            
            if (pendingPlanId) {
                // Si había un plan pendiente, iniciamos el pago
                await initiateSubscription(pendingPlanId);
            } else {
                // Si no, procedemos con la redirección normal
                const isPromoPage = !!document.getElementById('promo-page-content');
                if (isPromoPage) {
                    window.location.href = 'index.html';
                } else {
                    window.location.reload();
                }
            }
            // --- FIN DE LA LÓGICA DE SUSCRIPCIÓN ---

        } else {
            currentLoggedInUsername = null;
            currentUserRole = null;
            currentLoggedInUserEmail = null;
            globalCsrfToken = null;
            currentUserThemeSettings = null;
            displayAuthMessage(data.message || getText('auth_loginFailed_status').replace('{status}', response.status), true, false, targetElementId);
        }
    } catch (error) {
        console.error('Network or server error during login:', error);
        notificationService.error(getText('auth_serverConnectionError_login'), error);
        currentLoggedInUsername = null;
        currentUserRole = null;
        currentLoggedInUserEmail = null;
        globalCsrfToken = null;
        currentUserThemeSettings = null;
    }
}
export async function logoutUser() {
    console.log(getText('auth_log_attemptingLogout'));
    try {
        await fetchAuthenticated(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
        console.log(getText('auth_log_logoutBackendSuccess'));
    } catch (error) {
        console.error('Error during backend logout call:', error);
        notificationService.error(getText('auth_error_logoutServer'), error);
    } finally {
        currentLoggedInUsername = null;
        currentUserRole = null;
        currentLoggedInUserEmail = null;
        globalCsrfToken = null;
        currentUserThemeSettings = null;
        if (typeof clearUserServerThemeSettingsCache === 'function') {
            clearUserServerThemeSettingsCache();
        }
        currentUserPlanName = null;
        currentUserGameCount = 0;
        currentUserPlanLimit = 0;
        updatePlanCounterUI();
        console.log(getText('auth_log_redirectingAfterLogout'));
        window.location.href = 'promocional.html';
    }
}

export async function checkAuthStatus() {
    try {
        const response = await fetchAuthenticated(`${API_BASE_URL}/auth/status`);
        if (response.ok) {
            const data = await response.json();
            if (data.isAuthenticated && data.user && data.csrfToken) {
                currentLoggedInUsername = data.user.username;
                currentUserRole = data.user.role || 'user';
                currentLoggedInUserEmail = data.user.email || null;
                globalCsrfToken = data.csrfToken;
                currentUserThemeSettings = data.themeSettings || {};
                currentUserLanguage = data.user.language || 'es';
                currentUserPlanName = data.user.planName;
                currentUserGameCount = data.user.gameCount;
                currentUserPlanLimit = data.user.planLimit;
                return { isAuthenticated: true, user: data.user };
            }
        }
        return { isAuthenticated: false };

    } catch (error) {
        console.error(getText('auth_error_checkAuthStatusFetch') + ": " + error.message);
        return { isAuthenticated: false, error: error };
    }
}

export async function fetchAuthenticated(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: { ...options.headers }
    };
    const method = options.method?.toUpperCase() || 'GET';
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (globalCsrfToken) {
            defaultOptions.headers['X-CSRF-Token'] = globalCsrfToken;
        } else {
            console.warn(getText('auth_warn_csrfTokenMissing').replace('{method}', method).replace('{url}', url));
        }
    }
    const fetchOptions = { ...options, ...defaultOptions, headers: { ...defaultOptions.headers, ...(options.headers || {}) } };
    
    try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const error = new Error();
            error.response = response;
            
            try {
                const errorData = await response.clone().json();
                error.data = errorData;
                error.message = errorData.message || `Error ${response.status}: ${response.statusText}`;
            } catch (e) {
                error.message = `Error ${response.status}: ${response.statusText}`;
            }

            if (response.status === 401 && !url.includes('/auth/')) {
                notificationService.error(getText('auth_error_sessionExpired'));
                showAuthUI();
            } else if (response.status === 403) {
                console.error(getText('auth_error_403Forbidden').replace('{url}', url));
            }
            
            throw error;
        }

        return response;

    } catch (error) {
        if (error.response) {
            throw error;
        }

        console.error(getText('auth_error_networkFetch').replace('{url}', url) + ":", error);
        notificationService.error(getText('auth_error_networkConnection'), error);
        throw error;
    }
}

export function getCurrentUserRole() {
    return currentUserRole;
}
export function getCurrentUserEmail() {
    return currentLoggedInUserEmail;
}

async function handleRequestPasswordReset(event) {
    event.preventDefault();
    if (!resetEmailInput) {
        notificationService.error(getText('auth_error_resetEmailFieldMissing'));
        console.error(getText('auth_error_resetEmailInputUndefined'));
        return;
    }
    const email = resetEmailInput.value.trim();
    if (!email) {
        displayAuthMessage(getText('auth_enterEmail'), true);
        return;
    }
    const submitButton = event.target.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    displayAuthMessage(getText('auth_info_processingRequest'), false);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (response.ok) {
            displayAuthMessage(data.message || getText('auth_resetEmailSent'), false, true);
            if (requestResetForm) requestResetForm.reset();
        } else {
            displayAuthMessage(data.message || getText('auth_resetEmailError_status').replace('{status}', response.status), true);
        }
    } catch (error) {
        console.error('Error en requestPasswordReset:', error);
        notificationService.error(getText('auth_serverConnectionError_requestReset'), error);
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

export async function requestPasswordReset(email) {
    const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return response.json();
}


export async function submitChangePassword(currentPassword, newPassword, confirmNewPassword, messageElementId) {
    const messageTarget = messageElementId || 'configChangePasswordMessage';
    displayAuthMessage("", false, false, messageTarget);


    if (!currentPassword || !newPassword || !confirmNewPassword) {
        displayAuthMessage(getText('auth_error_allFieldsRequired'), true, false, messageTarget);
        return { success: false };
    }
    if (newPassword !== confirmNewPassword) {
        displayAuthMessage(getText('auth_error_passwordsNoMatch'), true, false, messageTarget);
        return { success: false };
    }
    if (newPassword.length < 6) {
        displayAuthMessage(getText('auth_error_passwordTooShort').replace('{minLength}', '6'), true, false, messageTarget);
        return { success: false };
    }

    displayAuthMessage(getText('auth_info_processingPasswordChange'), false, false, messageTarget);

    try {
        const response = await fetchAuthenticated(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await response.json();

        if (response.ok) {
            displayAuthMessage(data.message || getText('auth_passwordUpdateSuccess'), false, true, messageTarget);
            return { success: true };
        } else {
            displayAuthMessage(data.message || getText('auth_passwordUpdateError_status').replace('{status}', response.status), true, false, messageTarget);
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('Error en submitChangePassword:', error);
        displayAuthMessage(error.message || getText('auth_serverConnectionError_passwordChange'), true, false, messageTarget);
        return { success: false, message: error.message };
    }
}

export function isAuthenticated() {
    return !!currentLoggedInUsername;
}

export function getCurrentUserThemeSettings() {
    return currentUserThemeSettings;
}

/**
 * Actualiza el conteo de juegos del usuario y refresca la UI del contador.
 * @param {number} changeAmount - El número a sumar (si es positivo) o restar (si es negativo) al contador.
 */
export function updateCurrentUserGameCount(changeAmount) {
    currentUserGameCount += changeAmount;
    if (currentUserGameCount < 0) {
        currentUserGameCount = 0; // Para evitar números negativos por si ocurre algún error.
    }
    updatePlanCounterUI(); // Llama a la función que ya creamos para redibujar el contador.
}

export async function saveLanguagePreference(languageCode) {
    if (!isAuthenticated()) {
        console.log("Usuario no autenticado. No se guarda el idioma en el servidor.");
        return;
    }

    try {
        await fetchAuthenticated(`${API_BASE_URL}/preferences/language`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ language: languageCode }),
        });
    } catch (error) {
        console.error("Error al guardar la preferencia de idioma:", error);
        notificationService.error("No se pudo guardar tu preferencia de idioma.");
    }
}
