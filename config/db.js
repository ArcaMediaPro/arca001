// server.js (añadir esto al principio)
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Opciones para evitar warnings de Mongoose (pueden variar según versión)
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true, // Descomentar si usas Mongoose < 6
      // useFindAndModify: false // Descomentar si usas Mongoose < 6
    });
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error conectando a MongoDB: ${error.message}`);
    process.exit(1); // Salir del proceso si no se puede conectar
  }
};