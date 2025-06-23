// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Importamos los modelos y middleware necesarios para estas rutas
const User = require('../models/User');
const Game = require('../models/Game');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/adminAuth');

// Todas las rutas aquí ya estarán bajo /api/admin, así que usamos /users, /users/:id, etc.

// GET /api/admin/users
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { username, email } = req.query;
        const filter = {};
        if (username) filter.username = { $regex: username, $options: 'i' };
        if (email) filter.email = { $regex: email, $options: 'i' };
        const users = await User.find(filter).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// PUT /api/admin/users/:id
router.put('/users/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const { username, email, role, newPassword } = req.body;
        if (username) user.username = username;
        if (email) user.email = email.toLowerCase();
        if (role) user.role = role;
        if (newPassword) user.password = newPassword;

        const updatedUser = await user.save();
        const userObject = updatedUser.toObject();
        delete userObject.password;
        res.json({ message: 'Usuario actualizado correctamente.', user: userObject });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'El nombre de usuario o el correo electrónico ya está en uso.' });
        res.status(500).json({ message: 'Error interno del servidor al actualizar el usuario.' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        if (user._id.equals(req.user.id)) return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta.' });
        
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error interno del servidor al eliminar el usuario.' });
    }
});

// PUT /api/admin/users/:id/plan
router.put('/users/:id/plan', authMiddleware, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { plan } = req.body;
    const allowedPlans = ['free', 'medium', 'premium'];

    if (!allowedPlans.includes(plan)) {
        return res.status(400).json({ message: 'Plan de suscripción inválido.' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        user.subscriptionPlan = plan;
        await user.save();
        res.json({ message: 'Plan de usuario actualizado correctamente.' });
    } catch (error) {
        console.error("Error en PUT /api/admin/users/:id/plan:", error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el plan.' });
    }
});

// GET /api/admin/cloudinary-stats
router.get('/cloudinary-stats', authMiddleware, isAdmin, async (req, res) => {
    try {
        const allGames = await Game.find({}).populate('owner', 'username');
        if (!allGames) return res.json([]);
        const statsByUser = {};
        allGames.forEach(game => {
            if (!game.owner || !game.owner._id) return;
            const ownerId = game.owner._id.toString();
            const ownerUsername = game.owner.username;
            if (!statsByUser[ownerId]) {
                statsByUser[ownerId] = { username: ownerUsername, covers: 0, backCovers: 0, screenshots: 0 };
            }
            if (game.cover) statsByUser[ownerId].covers += 1;
            if (game.backCover) statsByUser[ownerId].backCovers += 1;
            if (game.screenshots && game.screenshots.length > 0) statsByUser[ownerId].screenshots += game.screenshots.length;
        });
        const statsArray = Object.values(statsByUser).sort((a, b) => a.username.localeCompare(b.username));
        res.json(statsArray);
    } catch (error) {
        res.status(500).json({ message: "Error del servidor al obtener las estadísticas." });
    }
});


module.exports = router;