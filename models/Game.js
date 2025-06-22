// models/Game.js
const mongoose = require('mongoose');

const SystemRequirementsSchema = new mongoose.Schema({
  cpu: { type: String, default: '' },
  sound: { type: String, default: '' },
  controller: { type: String, default: '' },
  gfx: { type: String, default: '' },
  memory: { type: String, default: '' },
  hdd: { type: String, default: '' }
}, { _id: false }); // _id: false para no crear IDs para este subdocumento

const GameSchema = new mongoose.Schema({
  // Campos del frontend (ajusta según necesidad)
  title: { type: String, required: [true, 'El título es obligatorio'], trim: true },
  platform: { type: String, required: [true, 'La plataforma es obligatoria'], trim: true },
  year: { type: Number },
  developer: { type: String, default: '', trim: true },
  publisher: { type: String, default: '', trim: true },
  genre: { type: String, required: [true, 'El género es obligatorio'], trim: true },
  format: { type: String, required: [true, 'El formato es obligatorio'] },
  quantity: { type: Number }, // Cantidad (Discos/Disquetes)
  capacity: { type: String, default: '' }, // Capacidad (Disquetes HD/DD)
  language: { type: String, default: '', trim: true },
  region: { type: String, default: '', trim: true },
  ageRating: { type: String, default: '', trim: true },
  barcode: { type: String, default: '', trim: true },
  condition: { type: String, default: '', trim: true },
  progress: { type: String, default: 'Pendiente' },
  multiplayer: { type: Boolean, default: false },
  numPlayers: { type: Number },
  additionalInfo: { type: String, default: '', trim: true },
  copyProtection: { type: String, default: '', trim: true },
  rating: { type: Number, default: 0, min: 0, max: 10 },
  cover: { type: String, default: null },
  backCover: { type: String, default: null },
  screenshots: [{ type: String }],
  systemRequirements: { type: SystemRequirementsSchema, default: () => ({}) },
  dateAdded: { type: Date, default: Date.now },

  // --- NUEVOS CAMPOS PARA SEGUIMIENTO DE PRÉSTAMOS ---
  isLoaned: {
    type: Boolean,
    default: false
  },
  loanedTo: {
    type: String,
    trim: true,
    default: ''
  },
  loanDate: {
    type: Date,
    default: null
  },
  // --- FIN DE NUEVOS CAMPOS ---

  owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Game', GameSchema);