// controllers/planController.js
const Plan = require('../models/Plan');

// Función para obtener los límites actuales
exports.getPlanLimits = async (req, res) => {
    try {
        let freePlan = await Plan.findOne({ name: 'free' });
        let mediumPlan = await Plan.findOne({ name: 'medium' });

        // Si no existen, los creamos con valores por defecto
        if (!freePlan) {
            freePlan = await new Plan({ name: 'free', limit: 50 }).save();
        }
        if (!mediumPlan) {
            mediumPlan = await new Plan({ name: 'medium', limit: 500 }).save();
        }

        res.json({
            free: freePlan.limit,
            medium: mediumPlan.limit
        });
    } catch (error) {
        console.error("Error al obtener los límites de los planes:", error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// Función para actualizar los límites
exports.updatePlanLimits = async (req, res) => {
    const { free, medium } = req.body;

    try {
        if (typeof free !== 'number' || typeof medium !== 'number') {
            return res.status(400).json({ message: 'Los límites deben ser números.' });
        }

        await Plan.updateOne({ name: 'free' }, { limit: free }, { upsert: true });
        await Plan.updateOne({ name: 'medium' }, { limit: medium }, { upsert: true });

        res.json({ message: 'Límites de los planes actualizados correctamente.' });

    } catch (error) {
        console.error("Error al actualizar los límites de los planes:", error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};
