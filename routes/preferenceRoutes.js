// routes/preferenceRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const UserPreferences = require('../models/UserPreferences');

// Asumimos que tienes tus DEFAULT_THEME_SETTINGS en un archivo accesible por el backend
// Ejemplo: const { DEFAULT_THEME_SETTINGS } = require('../config/themeDefaults');
// Por ahora, lo simularemos aquí si no existe ese archivo.
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


// GET: Obtener preferencias del usuario
router.get('/', authMiddleware, async (req, res) => {
    try {
        let preferences = await UserPreferences.findOne({ user: req.user.id });
        if (!preferences) {
            // Si no existen, crearlas con los valores por defecto del backend
            const defaultSettingsMap = new Map(Object.entries(DEFAULT_THEME_SETTINGS_BACKEND));
            preferences = new UserPreferences({
                user: req.user.id,
                themeSettings: defaultSettingsMap
            });
            await preferences.save();
        }
        // Convertir el Map a un objeto plano para la respuesta JSON
        const themeSettingsObject = preferences.themeSettings ? Object.fromEntries(preferences.themeSettings) : {};
        res.json(themeSettingsObject);
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        res.status(500).json({ message: 'Error al obtener las preferencias del usuario.' });
    }
});

// PUT: Actualizar preferencias del usuario
router.put('/', authMiddleware, async (req, res) => {
    const { themeSettings } = req.body; // themeSettings debe ser un objeto
    if (!themeSettings || typeof themeSettings !== 'object') {
        return res.status(400).json({ message: 'Formato de themeSettings inválido. Se esperaba un objeto.' });
    }

    try {
        let preferences = await UserPreferences.findOne({ user: req.user.id });
        if (!preferences) {
            preferences = new UserPreferences({ user: req.user.id });
        }
        // Convertir el objeto themeSettings a un Map antes de guardarlo
        preferences.themeSettings = new Map(Object.entries(themeSettings));
        await preferences.save();
         // Convertir el Map a un objeto plano para la respuesta JSON
        const themeSettingsObject = preferences.themeSettings ? Object.fromEntries(preferences.themeSettings) : {};
        res.json({ message: 'Preferencias actualizadas correctamente.', themeSettings: themeSettingsObject });
    } catch (error) {
        console.error('Error updating user preferences:', error);
        res.status(500).json({ message: 'Error al actualizar las preferencias del usuario.' });
    }
});

// --- PEGA ESTE BLOQUE COMPLETO ---
// @route   PUT /api/preferences/language
// @desc    Actualizar la preferencia de idioma del usuario
// @access  Private
router.put('/language', authMiddleware, async (req, res) => {
    const { language } = req.body;
    if (!language) {
        return res.status(400).json({ message: 'El idioma es requerido.' });
    }

    try {
        // Busca y actualiza, o crea el documento de preferencias si no existe
        await UserPreferences.findOneAndUpdate(
            { user: req.user.id },
            { $set: { language: language } },
            { new: true, upsert: true }
        );
        res.json({ message: 'Preferencia de idioma actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la preferencia de idioma:', error);
        res.status(500).json({ message: 'Error interno del servidor al guardar el idioma.' });
    }
});


module.exports = router;