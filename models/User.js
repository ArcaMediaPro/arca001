const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Usar bcryptjs es una práctica común en Node.js
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'El correo electrónico es obligatorio.'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+\@.+\..+/, 'Por favor, introduce un correo electrónico válido.']
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin']
    },
    subscriptionPlan: {
        type: String,
        enum: ['free', 'medium', 'premium'],
        default: 'free',
    },

// --- AÑADE ESTE NUEVO CAMPO ---
    pendingSubscriptionPlan: {
        type: String,
        enum: ['medium', 'premium', null],
        default: null,
    },

    // --- CAMPOS AÑADIDOS Y REFINADOS ---
    isVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
        select: false // No se incluirá en las consultas por defecto
    },
    passwordResetToken: {
        type: String,
        select: false // Se añade { select: false } por seguridad
    },
    passwordResetExpires: {
        type: Date,
        select: false // Se añade { select: false } por seguridad
    }
    // --- FIN DE CAMPOS AÑADIDOS Y REFINADOS ---

}, {
    timestamps: true // Esto maneja createdAt y updatedAt automáticamente
});

// --- Middleware para Hashear la Contraseña antes de guardar ---
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// --- Método para Comparar Contraseñas ---
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// --- MÉTODO PARA GENERAR TOKEN (Mantenido como lo tenías) ---
userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutos
    return resetToken; // Se devuelve el token sin hashear para enviarlo por correo
};

module.exports = mongoose.model('User', userSchema);