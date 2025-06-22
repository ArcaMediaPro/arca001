const mongoose = require('mongoose');

const UserPreferencesSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    language: {
        type: String,
        default: 'es',
        required: true
    },
    themeSettings: {
        type: Map,
        of: String,
        default: {}
    },
    lastModified: {
        type: Date,
        default: Date.now
    }
});

UserPreferencesSchema.pre('save', function(next) {
    this.lastModified = Date.now();
    next();
});

module.exports = mongoose.model('UserPreferences', UserPreferencesSchema);