// server.js (BASE FUNCIONAL)
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
console.log("--- INICIANDO SERVIDOR ---");
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'promocional.html')));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, '0.0.0.0', () => console.log(`>>> Servidor corriendo en el puerto ${PORT}`));
module.exports = app;