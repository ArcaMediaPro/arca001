// models/Plan.js
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['free', 'medium', 'premium']
    },
    limit: {
        type: Number,
        required: true,
        default: 0
    }
});

module.exports = mongoose.model('Plan', planSchema);
