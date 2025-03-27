// models/cart.model.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // Correcto: Referencia al modelo Product
    required: [true, 'El ID del producto es obligatorio en el item del carrito.'],
  },
  quantity: {
    type: Number,
    required: [true, 'La cantidad es obligatoria en el item del carrito.'],
    min: [1, 'La cantidad mínima debe ser 1.'], // No debe haber items con cantidad 0 o negativa
    validate: { // Asegurar que sea entero
        validator: Number.isInteger,
        message: 'La cantidad debe ser un número entero ({VALUE}).'
    }
  }
}, { _id: false }); 


const cartSchema = new mongoose.Schema({
  products: {
      type: [cartItemSchema], // Usar el sub-schema definido
      default: [] // Por defecto, un array vacío
  },
  finalized: {
      type: Boolean,
      default: false,
      required: true
  }
}, {
    timestamps: true // Añade createdAt y updatedAt
});


module.exports = mongoose.model('Cart', cartSchema);