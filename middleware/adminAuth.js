// Podría estar en un nuevo archivo (ej. middleware/adminAuth.js)
// o añadido a tu auth.js existente y exportado.

// Asumiendo que después de la autenticación, el objeto 'req.user'
// se llena con los datos del usuario desde la base de datos, incluyendo el rol.
// Esto es una práctica común; tu 'authMiddleware' actual debería hacerlo.

const isAdmin = (req, res, next) => {
    // Primero, asegurarse de que el usuario está autenticado y req.user existe.
    // Esto lo haría el middleware de autenticación que se ejecuta antes.
    // Si req.user no existe o no tiene el campo 'role', es un problema
    // de cómo el middleware anterior está pasando la información.
    if (!req.user || !req.user.role) {
        // Este caso idealmente no debería ocurrir si el authMiddleware anterior funciona bien.
        return res.status(500).json({ message: 'Error de autenticación: información de rol no disponible.' });
    }

    if (req.user.role === 'admin') {
        next(); // El usuario es admin, continuar con la siguiente función en la ruta
    } else {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
};

module.exports = isAdmin; // O exportarlo como parte de un objeto si está en auth.js