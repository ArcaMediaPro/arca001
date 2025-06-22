// utils/emailSender.js
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config(); // Asegúrate de que las variables de entorno estén cargadas

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // ej. 'smtp.mailtrap.io' o 'smtp.gmail.com'
    port: process.env.EMAIL_PORT, // ej. 2525 o 587 o 465
    secure: process.env.EMAIL_PORT == 465, // true para puerto 465, false para otros
    auth: {
        user: process.env.EMAIL_USERNAME, // Tu usuario del servicio de email
        pass: process.env.EMAIL_PASSWORD, // Tu contraseña del servicio de email
    },
    // Si usas Gmail y tienes 2FA, necesitarás una "App Password"
    // tls: { rejectUnauthorized: false } // A veces necesario para localhost o ciertos proveedores
});

const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Tu Aplicación'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@tuapp.com'}>`,
            to: options.email,
            subject: options.subject,
            text: options.message, // Para versión en texto plano
            html: options.htmlMessage || options.message, // Para versión HTML (preferible)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email enviado: ' + info.response);
        return info;
    } catch (error) {
        console.error('Error enviando email:', error);
        throw error; // Re-lanzar el error para que el llamador lo maneje
    }
};

module.exports = sendEmail;