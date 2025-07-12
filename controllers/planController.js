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

// --- INICIO DE LA CORRECCIÓN ---
// Función para actualizar los límites (ahora maneja actualizaciones parciales)
exports.updatePlanLimits = async (req, res) => {
    const { free, medium } = req.body;

    try {
        const updatePromises = [];

        // Si se proporcionó un límite para el plan 'free', lo actualizamos.
        if (typeof free === 'number' && free >= 0) {
            updatePromises.push(
                Plan.updateOne({ name: 'free' }, { limit: free }, { upsert: true })
            );
        }

        // Si se proporcionó un límite para el plan 'medium', lo actualizamos.
        if (typeof medium === 'number' && medium >= 0) {
            updatePromises.push(
                Plan.updateOne({ name: 'medium' }, { limit: medium }, { upsert: true })
            );
        }

        // Si no se envió ningún dato para actualizar, devolvemos un error.
        if (updatePromises.length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron datos válidos para actualizar.' });
        }

        // Ejecutamos todas las promesas de actualización en paralelo.
        await Promise.all(updatePromises);

        res.json({ message: 'Límites de los planes actualizados correctamente.' });

    } catch (error) {
        console.error("Error al actualizar los límites de los planes:", error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};
// --- FIN DE LA CORRECCIÓN ---