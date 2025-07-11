// modals/configTabs/adminUserManagement.js (VERSIÓN CORREGIDA Y REESTRUCTURADA)
import { getElem, escapeHtml } from '../../domUtils.js';
import * as adminService from '../../adminService.js';
import { notificationService } from '../../notificationService.js';
import { currentLoggedInUsername } from '../../authClient.js';

// Referencias a los elementos del DOM
let loadUsersBtnElement, adminUserListContainerElement, adminUserMessageElement,
    adminEditUserSectionElement, editingUserUsernameSpanElement, editingUserIdInputElement,
    editUserUsernameInputElement, editUserEmailInputElement, editUserRoleElement, editUserNewPasswordInputElement,
    saveUserChangesBtnElement, cancelUserEditBtnElement,
    adminSearchUsernameInput, adminSearchEmailInput, adminPerformUserSearchBtn, adminClearUserSearchBtn;

function displayAdminUserMessage(message, isError = false, clearAfterDelay = true) {
    if (adminUserMessageElement) {
        adminUserMessageElement.innerHTML = escapeHtml(message);
        adminUserMessageElement.className = `auth-message ${isError ? 'error' : 'success'}`;
        adminUserMessageElement.style.display = message ? 'block' : 'none';
        if (!isError && message && clearAfterDelay) {
            setTimeout(() => {
                if (adminUserMessageElement.innerHTML === escapeHtml(message)) {
                    adminUserMessageElement.innerHTML = '';
                    adminUserMessageElement.style.display = 'none';
                }
            }, 7000);
        }
    }
}

async function fetchAndRenderUsers(searchParams = {}) {
    if (!adminUserListContainerElement) return;
    adminUserListContainerElement.innerHTML = '<p style="text-align:center;">Cargando...</p>';
    displayAdminUserMessage('');
    try {
        const hasSearch = searchParams.username || searchParams.email;
        const users = hasSearch
            ? await adminService.searchAdminUsers(searchParams)
            : await adminService.fetchAllAdminUsers();
        renderAdminUserList(users);
        if (hasSearch && adminClearUserSearchBtn) {
            adminClearUserSearchBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        if (adminUserListContainerElement) adminUserListContainerElement.innerHTML = `<p style="color: var(--clr-btn-d-bg); text-align:center;">Error al cargar usuarios: ${escapeHtml(error.message)}</p>`;
        notificationService.error(`Error al obtener la lista de usuarios: ${error.message}`, error);
    }
}

function renderAdminUserList(users) {
    if (!adminUserListContainerElement) return;
    if (!users || users.length === 0) {
        adminUserListContainerElement.innerHTML = '<p style="text-align:center;">No se encontraron usuarios que coincidan.</p>';
        return;
    }
    let tableHtml = `<table class="admin-user-table"><thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Plan</th><th>Acciones</th></tr></thead><tbody>`;
    users.forEach(user => {
        tableHtml += `
            <tr data-user-id="${escapeHtml(user._id)}">
                <td data-label="Usuario">${escapeHtml(user.username)}</td>
                <td data-label="Email">${escapeHtml(user.email)}</td>
                <td data-label="Rol">${escapeHtml(user.role)}</td>
                <td data-label="Plan">
                    <select class="admin-input plan-select" data-userid="${escapeHtml(user._id)}">
                        <option value="free" ${user.subscriptionPlan === 'free' ? 'selected' : ''}>Free</option>
                        <option value="medium" ${user.subscriptionPlan === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="premium" ${user.subscriptionPlan === 'premium' ? 'selected' : ''}>Premium</option>
                    </select>
                </td>
                <td data-label="Acciones">
                    <button type="button" class="admin-button primary btn-save-plan" data-userid="${escapeHtml(user._id)}" data-username="${escapeHtml(user.username)}" title="Guardar Plan">PLAN</button>
                    <button type="button" class="admin-button edit-admin-user-btn" data-userid="${escapeHtml(user._id)}" data-username="${escapeHtml(user.username)}" data-email="${escapeHtml(user.email)}" data-role="${escapeHtml(user.role)}" title="Editar Usuario">
                        <img src="imagenes/Editar Juego.png" alt="Editar" style="width:14px;height:14px;">
                    </button>
                    <button type="button" class="admin-button danger delete-admin-user-btn" data-userid="${escapeHtml(user._id)}" data-username="${escapeHtml(user.username)}" title="Eliminar Usuario">
                        <img src="imagenes/Eliminar Seleccion.png" alt="Eliminar" style="width:14px;height:14px;">
                    </button>
                </td>
            </tr>`;
    });
    tableHtml += `</tbody></table>`;
    adminUserListContainerElement.innerHTML = tableHtml;

    adminUserListContainerElement.querySelectorAll('.edit-admin-user-btn').forEach(btn => btn.addEventListener('click', (e) => prepareEditAdminUserForm(e.currentTarget.dataset)));
    adminUserListContainerElement.querySelectorAll('.delete-admin-user-btn').forEach(btn => btn.addEventListener('click', (e) => confirmDeleteAdminUserWrapper(e.currentTarget.dataset.userid, e.currentTarget.dataset.username)));
    adminUserListContainerElement.querySelectorAll('.btn-save-plan').forEach(btn => btn.addEventListener('click', (e) => handleSavePlanClick(e.currentTarget)));
}

async function handleSavePlanClick(button) {
    const userId = button.dataset.userid;
    const username = button.dataset.username;
    const row = button.closest('tr');
    const selectElement = row.querySelector(`.plan-select[data-userid="${userId}"]`);
    if (!selectElement) return notificationService.error("No se pudo encontrar el selector de plan.");
    const newPlan = selectElement.value;
    const newPlanText = selectElement.options[selectElement.selectedIndex].text;
    if (confirm(`¿Está seguro de que desea cambiar el plan del usuario "${username}" a "${newPlanText}"?`)) {
        button.disabled = true;
        button.textContent = '...';
        try {
            await adminService.updateUserPlan(userId, newPlan);
            notificationService.success(`El plan de ${username} se ha actualizado a ${newPlanText}.`);
        } catch (error) {
            notificationService.error(`Error al actualizar el plan: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = 'PLAN';
        }
    }
}

function clearAdminEditForm() {
    if (editingUserIdInputElement) editingUserIdInputElement.value = '';
    if (editingUserUsernameSpanElement) editingUserUsernameSpanElement.textContent = '';
    if (editUserUsernameInputElement) editUserUsernameInputElement.value = '';
    if (editUserEmailInputElement) editUserEmailInputElement.value = '';
    if (editUserRoleElement) editUserRoleElement.value = 'user';
    if (editUserNewPasswordInputElement) editUserNewPasswordInputElement.value = '';
}

function prepareEditAdminUserForm(userData) {
    if (!adminEditUserSectionElement) return;
    clearAdminEditForm();
    editingUserIdInputElement.value = userData.userid;
    editingUserUsernameSpanElement.textContent = userData.username;
    editUserUsernameInputElement.value = userData.username;
    editUserEmailInputElement.value = userData.email;
    editUserRoleElement.value = userData.role;
    adminEditUserSectionElement.style.display = 'block';
    adminEditUserSectionElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleSaveAdminUserChanges() {
    if (!editingUserIdInputElement || !saveUserChangesBtnElement) return;
    const userId = editingUserIdInputElement.value;
    if (!userId) return;

    // --- INICIO DE LA CORRECCIÓN ---
    // Buscamos el selector de plan correspondiente a este usuario en la tabla
    const userRow = adminUserListContainerElement.querySelector(`tr[data-user-id="${userId}"]`);
    const planSelectElement = userRow ? userRow.querySelector('.plan-select') : null;
    // --- FIN DE LA CORRECCIÓN ---

    const userDataToUpdate = {
        username: editUserUsernameInputElement.value.trim(),
        email: editUserEmailInputElement.value.trim(),
        role: editUserRoleElement.value,
        // --- INICIO DE LA CORRECCIÓN ---
        // Añadimos el plan al objeto de datos que se enviará al backend
        subscriptionPlan: planSelectElement ? planSelectElement.value : undefined,
        // --- FIN DE LA CORRECCIÓN ---
    };
    const newPassword = editUserNewPasswordInputElement.value;
    if (newPassword) {
        if (newPassword.length < 6) return displayAdminUserMessage("La contraseña debe tener al menos 6 caracteres.", true, false);
        userDataToUpdate.newPassword = newPassword;
    }
    saveUserChangesBtnElement.disabled = true;
    displayAdminUserMessage("Guardando...", false, false);
    try {
        await adminService.updateAdminUser(userId, userDataToUpdate);
        notificationService.success(`Usuario "${userDataToUpdate.username}" actualizado.`);
        displayAdminUserMessage('', false);
        adminEditUserSectionElement.style.display = 'none';
        clearAdminEditForm();
        await fetchAndRenderUsers();
    } catch (error) {
        displayAdminUserMessage(`Error: ${error.message}`, true, false);
    } finally {
        saveUserChangesBtnElement.disabled = false;
    }
}

async function confirmDeleteAdminUserWrapper(userId, username) {
    if (currentLoggedInUsername === username) return notificationService.warn("No puedes eliminar tu propia cuenta.");
    if (confirm(`¿Eliminar permanentemente al usuario "${username}"?`)) {
        displayAdminUserMessage(`Eliminando a "${username}"...`, false, false);
        try {
            await adminService.deleteAdminUser(userId);
            notificationService.success(`Usuario "${username}" eliminado.`);
            displayAdminUserMessage('', false);
            await fetchAndRenderUsers();
            if (adminEditUserSectionElement.style.display === 'block' && editingUserIdInputElement.value === userId) {
                adminEditUserSectionElement.style.display = 'none';
                clearAdminEditForm();
            }
        } catch (error) {
            displayAdminUserMessage(`Error al eliminar: ${error.message}`, true, false);
        }
    }
}

export function initAdminUserManagement() {
    loadUsersBtnElement = getElem('loadUsersBtn', false);
    adminUserListContainerElement = getElem('adminUserListContainer', false);
    adminUserMessageElement = getElem('adminUserMessage', false);
    adminEditUserSectionElement = getElem('adminEditUserSection', false);
    editingUserUsernameSpanElement = getElem('editingUserUsername', false);
    editingUserIdInputElement = getElem('editingUserId', false);
    editUserUsernameInputElement = getElem('editUserUsername', false);
    editUserEmailInputElement = getElem('editUserEmail', false);
    editUserRoleElement = getElem('editUserRole', false);
    editUserNewPasswordInputElement = getElem('editUserNewPassword', false);
    saveUserChangesBtnElement = getElem('saveUserChangesBtn', false);
    cancelUserEditBtnElement = getElem('cancelUserEditBtn', false);
    adminSearchUsernameInput = getElem('adminSearchUsername', false);
    adminSearchEmailInput = getElem('adminSearchEmail', false);
    adminPerformUserSearchBtn = getElem('adminPerformUserSearchBtn', false);
    adminClearUserSearchBtn = getElem('adminClearUserSearchBtn', false);

    if (loadUsersBtnElement) {
        loadUsersBtnElement.addEventListener('click', () => {
            if (adminSearchUsernameInput) adminSearchUsernameInput.value = '';
            if (adminSearchEmailInput) adminSearchEmailInput.value = '';
            if (adminClearUserSearchBtn) adminClearUserSearchBtn.style.display = 'none';
            fetchAndRenderUsers();
        });
    }
    const performSearch = () => {
        const searchParams = {
            username: adminSearchUsernameInput.value.trim(),
            email: adminSearchEmailInput.value.trim()
        };
        if (!searchParams.username && !searchParams.email) return notificationService.warn("Introduce un término de búsqueda.");
        fetchAndRenderUsers(searchParams);
    };
    if (adminPerformUserSearchBtn) adminPerformUserSearchBtn.addEventListener('click', performSearch);
    if (adminClearUserSearchBtn) {
        adminClearUserSearchBtn.addEventListener('click', () => {
            adminSearchUsernameInput.value = '';
            adminSearchEmailInput.value = '';
            adminClearUserSearchBtn.style.display = 'none';
            fetchAndRenderUsers();
        });
    }
    if (saveUserChangesBtnElement) saveUserChangesBtnElement.addEventListener('click', handleSaveAdminUserChanges);
    if (cancelUserEditBtnElement) cancelUserEditBtnElement.addEventListener('click', () => {
        adminEditUserSectionElement.style.display = 'none';
        clearAdminEditForm();
    });
    console.log("Admin User Management Initialized");
}

export function refreshAdminUserListOnTabOpen() {
    if (adminUserListContainerElement) adminUserListContainerElement.innerHTML = '<p style="text-align:center;">Haga clic en "Cargar Todos" o realice una búsqueda.</p>';
    if (adminEditUserSectionElement) adminEditUserSectionElement.style.display = 'none';
    clearAdminEditForm();
    if(adminUserMessageElement) displayAdminUserMessage('');
    if (adminClearUserSearchBtn) adminClearUserSearchBtn.style.display = 'none';
    if(adminSearchUsernameInput) adminSearchUsernameInput.value = '';
    if(adminSearchEmailInput) adminSearchEmailInput.value = '';
}
