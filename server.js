// server.js (Prueba1)
require('dotenv').config(); // Añadido
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser'); // Añadido

const app = express();
const PORT = process.env.PORT || 5000;
console.log("--- PROBANDO: dotenv y cookie-parser ---");

app.use(cookieParser()); // Añadido

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'promocional.html')));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, '0.0.0.0', () => console.log(`>>> Servidor corriendo en el puerto ${PORT}`));
module.exports = app;