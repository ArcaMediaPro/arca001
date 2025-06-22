// public/static-page.js
document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('back-link-button');
    if (backButton) {
        backButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevenir la navegación del href="#"
            history.back();
        });
    }
});