// server.js (Prueba1)
require('dotenv').config(); // Añadido
const express = require('express');
const cors = require('cors'); // Añadido
const path = require('path');
const cookieParser = require('cookie-parser'); // Añadido

const app = express();
const PORT = process.env.PORT || 5000;
console.log("--- PROBANDO: dotenv y cookie-parser ---");


// Añadido
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



app.use(cookieParser()); // Añadido

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'promocional.html')));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, '0.0.0.0', () => console.log(`>>> Servidor corriendo en el puerto ${PORT}`));
module.exports = app;