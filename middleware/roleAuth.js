// Este middleware asume que el middleware de autenticación (auth.js) ya se ha ejecutado
// y que req.user existe y contiene el rol del usuario.

module.exports = function(roles) { // roles es un array de roles permitidos, ej: ['admin', 'editor']
    return function(req, res, next) {
        // Verificar si el usuario tiene un rol permitido
        if (!roles.includes(req.user.role)) {
            // 403 Forbidden - El usuario no tiene el rol necesario
            return res.status(403).json({ message: 'Access denied: insufficient permissions' });
        }
        next(); // El usuario tiene un rol permitido, pasar al siguiente
    };
};