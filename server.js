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

const adminRoutes = require('./routes/adminRoutes'); // Esto fue agregado para el nuevo archivo admenRoutes.js

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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'promocional.html')));



//app.use(express.static(path.join(__dirname, 'public')));

//app.get('/api', (req, res) => res.send('API del Catalogador funcionando!'));

//app.use('/api/auth', authRoutes);
 
//app.use('/api/games', gameRoutes);
//app.use('/api/collections', collectionRoutes); 
//app.use('/api/preferences', preferenceRoutes); 

								// --- RUTAS DE ADMINISTRADOR ---

app.use('/api/admin', adminRoutes);


						// --- MANEJO DE ERRORES Y ARRANQUE ---
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ message: err.message || 'Ocurrió un error inesperado.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> Servidor corriendo y escuchando en el puerto ${PORT}`);
});

module.exports = app;