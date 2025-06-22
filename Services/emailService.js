// services/emailService.js
const nodemailer = require('nodemailer');

// Esta función crea una cuenta de prueba temporal en Ethereal
const createTestAccount = async () => {
    return new Promise((resolve, reject) => {
        nodemailer.createTestAccount((err, account) => {
            if (err) {
                console.error('Failed to create a testing account. ' + err.message);
                return reject(err);
            }
            console.log('>>> Cuenta de prueba de Ethereal creada exitosamente.');
            resolve(account);
        });
    });
};

/**
 * Envía un correo electrónico usando una cuenta de prueba de Ethereal.
 * @param {object} options - Opciones del correo { to, subject, text, html }.
 */
const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const testAccount = await createTestAccount();

        // --- BLOQUE ACTUALIZADO ---
        const transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
            // --- INICIO: AÑADE ESTE BLOQUE PARA SOLUCIONAR EL ERROR ---
            tls: {
                // No rechazar certificados auto-firmados (para entornos de desarrollo/proxy)
                rejectUnauthorized: false
            }
            // --- FIN: BLOQUE AÑADIDO ---
        });
        // --- FIN DEL BLOQUE ACTUALIZADO ---

        let info = await transporter.sendMail({
            from: '"Catalogador PRO (Pruebas)" <no-reply@catalogador.pro>',
            to,
            subject,
            text,
            html,
        });

        console.log('>>> Correo de prueba enviado: %s', info.messageId);
        // La siguiente línea es la más importante: te da el enlace para ver el correo.
        console.log('>>> URL de previsualización: %s', nodemailer.getTestMessageUrl(info));

    } catch (error) {
        console.error('Error al enviar el correo de prueba:', error);
    }
};

module.exports = { sendEmail };