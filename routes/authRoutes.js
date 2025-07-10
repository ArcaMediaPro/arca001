// routes/authRoutes.js (VERSIÓN FINAL, CON LÓGICA DE SELECCIÓN DE PAGO)

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserPreferences = require('../models/UserPreferences');
const Game = require('../models/Game');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');

// Ya no necesitamos importar los controladores de suscripción aquí
// const { createStripeSession } = require('../controllers/subscriptionController');

const PLAN_LIMITS = {
    free: 50,
    medium: 500,
    premium: Infinity,
};

const DEFAULT_THEME_SETTINGS_BACKEND = {
    '--clr-bg-body': '#2c2a3f', '--clr-text-main': '#e0e0e0', '--clr-text-secondary': '#bdbdbd',
    '--clr-bg-section': '#3d3b54', '--clr-border': '#545170', '--clr-accent-1': '#ffb74d',
    '--clr-accent-2': '#ffcc80', '--clr-btn-p-bg': '#ff8a65', '--clr-btn-p-text': '#212121',
    '--clr-btn-p-hover': '#ffab91', '--clr-btn-s-bg': '#6a679e', '--clr-btn-s-text': '#ffffff',
    '--clr-btn-s-hover': '#8481b8', '--clr-btn-d-bg': '#e57373', '--clr-btn-d-text': '#ffffff',
    '--clr-btn-d-hover': '#ef5350', '--clr-input-focus': '#ff8a65',
    '--clr-sidebar-active-bg': '#ff8a65', '--clr-sidebar-active-text': '#212121',
    '--clr-sidebar-hover-bg': '#545170', '--font-body': 'sans-serif',
    '--font-headings-main': 'sans-serif', '--font-headings-card': 'sans-serif',
    '--font-ui': 'sans-serif', '--font-size-body': '0.9',
    '--font-size-headings-main': '1.8', '--font-size-headings-card': '1.1',
    '--font-size-ui': '0.9'
};

// --- RUTA DE REGISTRO ---
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, planId } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Se requiere nombre de usuario, correo electrónico y contraseña.' });
        }

        const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'El nombre de usuario o correo electrónico ya existe.' });
        }
        
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
        
        const newUser = new User({ 
            username, 
            email, 
            password, 
            emailVerificationToken,
            pendingSubscriptionPlan: planId || null 
        });
        
        await newUser.save();

        const defaultSettingsMap = new Map(Object.entries(DEFAULT_THEME_SETTINGS_BACKEND));
        const newPrefs = new UserPreferences({ user: newUser._id, themeSettings: defaultSettingsMap });
        await newPrefs.save();

        const verificationURL = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email.html?token=${verificationToken}`;
        
        await sendEmail({
            to: newUser.email,
            subject: 'Verificación de Correo Electrónico - Catalogador PRO',
            html: `<p>¡Bienvenido a Catalogador PRO! Por favor, haz clic en el siguiente enlace para verificar tu cuenta:</p><p><a href="${verificationURL}">${verificationURL}</a></p>`
        });

        res.status(201).json({ message: '¡Registro exitoso! Por favor, revisa tu correo para verificar tu cuenta.' });

    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'El nombre de usuario o correo electrónico ya está en uso.' });
        if (error.name === 'ValidationError') {
            let messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        console.error('Error en /register:', error);
        res.status(500).json({ message: 'Error al registrar usuario.', errorDetails: error.message });
    }
});


// --- RUTA: VERIFICACIÓN DE CORREO ---
router.post('/verify-email', async (req, res) => { 
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token de verificación no proporcionado.' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({ 
            emailVerificationToken: hashedToken 
        }).select('+emailVerificationToken');

        if (!user) {
            return res.status(400).json({ message: 'Token de verificación inválido o ya utilizado.' });
        }

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();

        res.status(200).json({ message: '¡Correo verificado con éxito! Ya puedes iniciar sesión.' });
        
    } catch (error) {
        console.error("Error en /verify-email:", error);
        res.status(500).json({ message: 'Error del servidor durante la verificación.' });
    }
});


// --- RUTA DE INICIO DE SESIÓN (ACTUALIZADA) ---
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Se requiere nombre de usuario y contraseña.' });
        }
        
        const user = await User.findOne({ username }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        
        if (!user.isVerified) {
            return res.status(401).json({ 
                message: 'Tu cuenta no ha sido verificada. Por favor, revisa el correo que te enviamos.',
                notVerified: true
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // --- INICIO DE LA LÓGICA DE SUSCRIPCIÓN ---
        if (user.pendingSubscriptionPlan && user.subscriptionPlan === 'free') {
            const planId = user.pendingSubscriptionPlan;
            console.log(`Usuario ${username} tiene un plan pendiente: ${planId}. Redirigiendo a la selección de pago.`);
            
            // Limpiamos el plan pendiente de la BD para que no se le vuelva a cobrar
            user.pendingSubscriptionPlan = null;
            await user.save();
            
            // Construimos la URL a nuestra página de selección
            const redirectUrl = `/select-payment.html?plan=${planId}`;
            
            // Generamos el token de sesión para que el usuario esté logueado en la página de selección
            const payload = { id: user._id, username: user.username, role: user.role, email: user.email, plan: user.subscriptionPlan };
            const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.cookie('authToken', jwtToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', maxAge: 3600000 });

            // Enviamos la URL de redirección al frontend
            return res.json({ redirectUrl });
        }
        // --- FIN DE LA LÓGICA DE SUSCRIPCIÓN ---

        // Si no hay plan pendiente, es un login normal.
        const payload = { id: user._id, username: user.username, role: user.role, email: user.email, plan: user.subscriptionPlan };
        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('authToken', jwtToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', maxAge: 3600000 });
        
        const csrfTokenToUse = res.locals._csrfToken || req.cookies._csrfToken;
        const gameCount = await Game.countDocuments({ owner: user._id });
        const planLimit = PLAN_LIMITS[user.subscriptionPlan] || 0;
        const userPrefsDoc = await UserPreferences.findOne({ user: user._id });
        
        res.status(200).json({
            message: 'Login exitoso',
            user: { id: user._id, username: user.username, email: user.email, role: user.role, planName: user.subscriptionPlan, gameCount, planLimit, language: userPrefsDoc?.language || 'es' },
            csrfToken: csrfTokenToUse,
            themeSettings: userPrefsDoc?.themeSettings ? Object.fromEntries(userPrefsDoc.themeSettings) : DEFAULT_THEME_SETTINGS_BACKEND
        });
    } catch (error) {
        console.error('Error en /login:', error);
        res.status(500).json({ message: 'Error en el inicio de sesión.' });
    }
});


// --- RUTA DE LOGOUT ---
router.post('/logout', (req, res) => {
    res.clearCookie('authToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', path: '/' });
    res.status(200).json({ message: 'Sesión cerrada correctamente.' });
});

// --- RUTA PARA VERIFICAR EL ESTADO DE AUTENTICACIÓN ---
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const freshUser = await User.findById(req.user.id).select('username email role subscriptionPlan');
        if (!freshUser) {
            res.clearCookie('authToken');
            return res.status(401).json({ isAuthenticated: false, message: 'Usuario no encontrado.' });
        }
        const csrfTokenToUse = res.locals._csrfToken || req.cookies._csrfToken;
        const userPlan = freshUser.subscriptionPlan;
        const gameCount = await Game.countDocuments({ owner: freshUser._id });
        const planLimit = PLAN_LIMITS[userPlan] || 0;
        let userPrefsDocStatus = await UserPreferences.findOne({ user: req.user.id });
        let userLanguageStatus = userPrefsDocStatus?.language || 'es';
        let themeSettingsToReturnStatus = userPrefsDocStatus && userPrefsDocStatus.themeSettings ? Object.fromEntries(userPrefsDocStatus.themeSettings) : { ...DEFAULT_THEME_SETTINGS_BACKEND };
        res.status(200).json({
            isAuthenticated: true,
            user: { id: freshUser._id, username: freshUser.username, email: freshUser.email, role: freshUser.role, planName: userPlan, gameCount, planLimit, language: userLanguageStatus },
            csrfToken: csrfTokenToUse,
            themeSettings: themeSettingsToReturnStatus
        });
    } catch (error) {
        console.error('Error en GET /status:', error);
        res.status(500).json({ isAuthenticated: false, message: 'Error interno del servidor.' });
    }
});

// --- RUTA: SOLICITAR RESTABLECIMIENTO DE CONTRASEÑA ---
router.post('/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Por favor, proporciona un correo electrónico.' });
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(200).json({ message: 'Si tu correo electrónico está registrado, recibirás un enlace.' });
        }
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });
        const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password.html?token=${resetToken}`;
        await sendEmail({ to: user.email, subject: 'Restablecimiento de Contraseña', html: `<p>Solicitaste restablecer tu contraseña. Haz clic en este enlace (válido por 10 minutos): <a href="${resetURL}">${resetURL}</a></p>` });
        res.status(200).json({ message: 'Si tu correo electrónico está registrado, recibirás un enlace.' });
    } catch (error) {
        console.error('Error en /request-password-reset:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA: RESTABLECER LA CONTRASEÑA ---
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token y nueva contraseña son requeridos.' });
        }
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
        }
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.status(200).json({ message: 'Contraseña actualizada con éxito.' });
    } catch (error) {
        console.error('Error en /reset-password:', error);
        res.status(500).json({ message: 'Error al restablecer la contraseña.' });
    }
});

// --- RUTA: CAMBIAR CONTRASEÑA (USUARIO LOGUEADO) ---
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Contraseña actual y nueva (mín. 6 caracteres) son requeridas.' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'La contraseña actual es incorrecta.' });
        }
        user.password = newPassword;
        await user.save();
        res.status(200).json({ message: 'Contraseña actualizada con éxito.' });
    } catch (error) {
        console.error('Error en /change-password:', error);
        res.status(500).json({ message: 'Error al cambiar la contraseña.' });
    }
});

module.exports = router;