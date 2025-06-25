// services/emailService.js (VERSIÓN FINAL PARA PRODUCCIÓN)
const nodemailer = require('nodemailer');

/**
 * Envía un correo electrónico usando las credenciales SMTP de producción
 * configuradas en las variables de entorno.
 * @param {object} options - Opciones del correo { to, subject, html }.
 */
const sendEmail = async ({ to, subject, html }) => {
    try {
        // Se elimina la función createTestAccount(). Ahora se crea un transportador
        // directamente con las variables de entorno que configuraste en Render.
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '465', 10), // Usamos 465 por defecto
            secure: parseInt(process.env.SMTP_PORT || '465', 10) === 465, // 'secure' es true si el puerto es 465
            auth: {
                user: process.env.SMTP_USER, // El usuario SMTP de tu proveedor
                pass: process.env.SMTP_PASS, // La contraseña SMTP (la de cPanel en tu caso)
            },
        });

        // Opciones del correo
        const mailOptions = {
            from: '"Catalogador PRO" <no-reply@arcamediapro.com>', // Un remitente profesional
            to: to,
            subject: subject,
            html: html,
        };

        // Enviar el correo
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo real enviado con éxito. Message ID:', info.messageId);
        
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('Error al enviar el correo real:', error);
        // Devolvemos un objeto de error sin detener la aplicación
        return { success: false, error: error };
    }
};

module.exports = { sendEmail };