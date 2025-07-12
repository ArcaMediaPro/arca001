// routes/planRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/adminAuth');
const { getPlanLimits, updatePlanLimits } = require('../controllers/planController');

// Ruta para obtener los límites actuales (solo para admins)
// GET /api/plans
router.get('/', authMiddleware, isAdmin, getPlanLimits);

// Ruta para actualizar los límites (solo para admins)
// PUT /api/plans
router.put('/', authMiddleware, isAdmin, updatePlanLimits);

module.exports = router;
