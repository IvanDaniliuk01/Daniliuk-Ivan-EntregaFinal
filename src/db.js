// db.js
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/ecommerce_db';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB conectado correctamente a:', MONGO_URI);
  } catch (error) {
    console.error('Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
