// server.js (COMPLETO CON LA RUTA PARA CAMBIAR PLAN)

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// --- REQUIRES DE MODELOS Y RUTAS ---
mongoose.set('strictQuery', true);

const User = require('./models/User');
const Game = require('./models/Game');
const UserPreferences = require('./models/UserPreferences');

const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const authMiddleware = require('./middleware/auth');
const isAdmin = require('./middleware/adminAuth');

// --- CONEXIÓN A LA BASE DE DATOS ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {});
        console.log(`✅ MongoDB Conectado Correctamente. Host: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('❌ ERROR DE CONEXIÓN A MONGODB:', error.message);
        process.exit(1);
    }
};

connectDB();

const app = express();


// --- CONFIGURACIÓN DE MIDDLEWARE ---
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "*.cloudinary.com", "data:"],
      "connect-src": ["'self'", "*.cloudinary.com"], 
    },
  },
}));

app.use(cors({
    origin: function (origin, callback) {
        const allowedOriginsConfig = [
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            'http://localhost:5173',
            process.env.FRONTEND_URL
        ].filter(Boolean);

        if (!origin || allowedOriginsConfig.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
    let csrfToken = req.cookies._csrfToken;
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(100).toString('hex');
        res.cookie('_csrfToken', csrfToken, { path: '/' });
    }
    res.locals._csrfToken = csrfToken;
    next();
});

									// --- RUTAS ---
// app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'promocional.html')));



//app.use(express.static(path.join(__dirname, 'public')));
//app.get('/api', (req, res) => res.send('API del Catalogador funcionando!'));
//app.use('/api/auth', authRoutes); 
//app.use('/api/games', gameRoutes);
//app.use('/api/collections', collectionRoutes); 
//app.use('/api/preferences', preferenceRoutes); 

								// --- RUTAS DE ADMINISTRADOR ---
//app.get('/api/admin/users', authMiddleware, isAdmin, async (req, res) => { 
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

//app.put('/api/admin/users/:id', authMiddleware, isAdmin, async (req, res) => {
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

//app.delete('/api/admin/users/:id', authMiddleware, isAdmin, async (req, res) => {
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

					// <<< INICIO DE LA NUEVA RUTA PARA ACTUALIZAR PLANES >>>

//app.put('/api/admin/users/:id/plan', authMiddleware, isAdmin, async (req, res) => {
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
							// <<< FIN DE LA NUEVA RUTA >>>

//app.get('/api/admin/cloudinary-stats', authMiddleware, isAdmin, async (req, res) => {
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

						// --- MANEJO DE ERRORES Y ARRANQUE ---
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ message: err.message || 'Ocurrió un error inesperado.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> Servidor corriendo y escuchando en el puerto ${PORT}`);
});

module.exports = app;