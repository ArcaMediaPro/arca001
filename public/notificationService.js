// frontend/src/notificationService.js (o donde coloques tus archivos JS frontend)

/**
 * Muestra un mensaje tipo "toast" o "snackbar".
 * Necesitarás añadir un contenedor en tu index.html (ej. <div id="toast-container"></div>)
 * y estilos CSS para los toasts.
 */
function showToast(message, type = 'info', duration = 5000) {
    console.log(`[showToast ENTER] Mensaje: "${message}", Tipo: "${type}"`); // Log de entrada
    const container = document.getElementById('toast-container') || createToastContainer();

    if (!container) { // Verificación por si createToastContainer falla por alguna razón extrema
        console.error("[showToast] ¡ERROR FATAL! No se pudo obtener o crear el toast-container.");
        alert(`Fallback (Error de Notificación): ${type.toUpperCase()}: ${message}`); // Fallback muy básico
        return null;
    }
    console.log(`[showToast] Contenedor (ID: ${container.id}) encontrado/creado. Hijos actuales ANTES de añadir: ${container.children.length}`);

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'toast-close-btn';
    closeButton.onclick = () => {
        console.log("[showToast] Botón de cerrar clickeado para:", toast);
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => {
            toast.remove();
            console.log(`[showToast] Toast (cerrado manualmente) removido después de transición. Hijos restantes: ${container.children.length}`);
        }, { once: true });
        // Fallback por si la transición no se dispara al cerrar manualmente
        setTimeout(() => {
            if (toast.parentNode) {
                console.warn("[showToast] Fallback Cierre Manual: Removiendo toast porque transitionend no se disparó.", toast);
                toast.remove();
            }
        }, 600); // Un poco más que la duración de la animación de salida
    };
    toast.appendChild(closeButton);

    container.appendChild(toast);
    console.log(`[showToast] Toast APPENDED al contenedor. Nuevo total de hijos: ${container.children.length}. Toast:`, toast);

    // Forzar reflujo/repintado antes de añadir la clase para la transición.
    // Esto a veces ayuda a que las transiciones CSS se activen de forma más fiable.
    void toast.offsetWidth;

    setTimeout(() => {
        toast.classList.add('toast-visible');
        console.log(`[showToast] Clase 'toast-visible' AÑADIDA a:`, toast, `Opacidad actual: ${window.getComputedStyle(toast).opacity}, Transformación actual: ${window.getComputedStyle(toast).transform}`);
    }, 10); // Pequeño delay para activar la transición CSS

    if (duration) {
        setTimeout(() => {
            console.log(`[showToast] Duración (${duration}ms) agotada para:`, toast, `Intentando remover clase y luego el elemento.`);
            toast.classList.remove('toast-visible'); // Inicia la animación de salida
            toast.addEventListener('transitionend', () => {
                toast.remove();
                console.log(`[showToast] Toast (auto-cerrado) REMOVIDO después de transición. Hijos restantes: ${container.children.length}`);
            }, { once: true });
            // Fallback si transitionend no se dispara por alguna razón (ej. si el elemento se oculta con display:none antes de la transición)
            setTimeout(() => {
                if (toast.parentNode) {
                    console.warn("[showToast] Fallback Auto-Cierre: Removiendo toast porque transitionend no se disparó a tiempo.", toast);
                    toast.remove();
                }
            }, duration + 600); // Un poco más que la duración de la animación de salida + la duración del toast
        }, duration);
    }
    return toast;
}

function createToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        console.log("[createToastContainer] Contenedor no encontrado, creando uno nuevo.");
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
        console.log("[createToastContainer] Contenedor #toast-container CREADO y añadido al body.");
    }
    return container;
}

export const notificationService = {
    success: (message, duration = 4000) => {
        console.log("SUCCESS (llamada a notificationService): ", message);
        return showToast(message, 'success', duration);
    },
    error: (userMessage, technicalError = null, duration = 7000) => {
        console.error("ERROR User Message (llamada a notificationService):", userMessage, "Technical Detail:", technicalError || 'N/A');
        return showToast(userMessage, 'error', duration);
    },
    warn: (message, duration = 5000) => {
        console.warn("WARNING (llamada a notificationService): ", message);
        return showToast(message, 'warning', duration);
    },
    info: (message, duration = 4000) => {
        console.info("INFO (llamada a notificationService): ", message);
        return showToast(message, 'info', duration);
    },

    displayFieldErrors: (errorsArray, formElement, fieldNameMap = {}) => {
        if (!formElement) {
            console.warn("[displayFieldErrors] formElement no proporcionado.");
            return;
        }
        console.log("[displayFieldErrors] Mostrando errores de campo para el formulario:", formElement.id || "Sin ID", errorsArray);

        formElement.querySelectorAll('.field-error-message').forEach(el => el.remove());
        formElement.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

        let generalErrorMessages = [];

        if (errorsArray && Array.isArray(errorsArray)) {
            errorsArray.forEach(err => {
                const fieldName = fieldNameMap[err.path] || err.path;
                const inputField = formElement.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`);

                if (inputField) {
                    inputField.classList.add('input-error');
                    const errorSpan = document.createElement('span');
                    errorSpan.className = 'field-error-message error-text';
                    errorSpan.textContent = err.msg;
                    const parentDiv = inputField.closest('div');
                    if (parentDiv) {
                         parentDiv.appendChild(errorSpan);
                    } else {
                        inputField.parentNode.insertBefore(errorSpan, inputField.nextSibling);
                    }
                } else {
                    console.warn(`[displayFieldErrors] Campo "${fieldName}" (path: "${err.path}") no encontrado.`);
                    generalErrorMessages.push(err.msg);
                }
            });
        }

        if (generalErrorMessages.length > 0) {
            // Para evitar un bucle si displayFieldErrors es llamado desde notificationService.error
            // Simplemente logueamos aquí, la notificación general la hace el llamador.
            console.warn("[displayFieldErrors] Errores generales no asociados a campos:", generalErrorMessages);
            // Podrías decidir mostrar un toast genérico aquí también, pero cuidado con bucles.
            // showToast("Por favor, corrige los siguientes errores generales: " + generalErrorMessages.join("; "), 'error');
        }
    },

    clearFieldErrors: (formElement) => {
        if (!formElement) {
            console.warn("[clearFieldErrors] formElement no proporcionado.");
            return;
        }
        console.log("[clearFieldErrors] Limpiando errores de campo para el formulario:", formElement.id || "Sin ID");
        formElement.querySelectorAll('.field-error-message').forEach(el => el.remove());
        formElement.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    }
};