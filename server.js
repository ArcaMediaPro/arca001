// server.js (VERSIÓN DE PRUEBA SIMPLIFICADA)

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

console.log("--- INICIANDO SERVIDOR EN MODO DE PRUEBA SIMPLIFICADO ---");

// 1. Primero, definimos la ruta específica para la página de inicio.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'promocional.html'));
});

// 2. Después, servimos todos los archivos de la carpeta 'public'.
// Esto debería servir promoMain.js, style.css, imágenes, etc.
app.use(express.static(path.join(__dirname, 'public')));


app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> Servidor de PRUEBA corriendo en el puerto ${PORT}`);
});

module.exports = app;