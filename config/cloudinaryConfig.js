
// config/cloudinaryConfig.js (VERSIÓN CORRECTA Y FINAL)
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Esta línea carga las variables del archivo .env en el entorno de Node.js
dotenv.config();

// Esta función configura Cloudinary usando las variables que leyó del .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Finalmente, exportamos la instancia de Cloudinary ya configurada
module.exports = cloudinary;


