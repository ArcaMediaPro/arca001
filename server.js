// server.js (COMPLETO CON LA RUTA PARA CAMBIAR PLAN)

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
// const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

console.log("--- PROBANDO PASO 1: MIDDLEWARE BÁSICOS ---");


// --- CONFIGURACIÓN DE MIDDLEWARE ---
app.use(helmet({crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "*.cloudinary.com", "data:"],
      "connect-src": ["'self'", "*.cloudinary.com"], 
    },
  },
}));


app.use(cors({origin: function (origin, callback) {
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


app.use((req, res, next) => {let csrfToken = req.cookies._csrfToken;
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(100).toString('hex');
        res.cookie('_csrfToken', csrfToken, { path: '/' });
    }
    res.locals._csrfToken = csrfToken;
    next();
});

// --- RUTAS ESTATICAS Y DE PRUEBA ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'promocional.html'));
});


app.use(express.static(path.join(__dirname, 'public')));


app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> Servidor de PRUEBA (Paso 1) corriendo en el puerto ${PORT}`);
});

module.exports = app;


