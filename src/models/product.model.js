const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // Importar uuid para generar IDs únicos

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4, // Generar un UUID automáticamente
    unique: true // Asegurar que sea único
  },
  title: {
    type: String,
    required: [true, 'El título del producto es obligatorio.'], // Mensaje de error personalizado
    trim: true // Elimina espacios en blanco al inicio y final
  },
  description: {
    type: String,
    required: [true, 'La descripción del producto es obligatoria.'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'El código del producto es obligatorio.'],
    unique: true,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'El precio del producto es obligatorio.'],
    min: [0, 'El precio no puede ser negativo.'] // Validación mínima
  },
  status: {
    type: Boolean,
    required: true, // Hacerlo requerido explícitamente
    default: true // Valor por defecto si no se proporciona
  },
  stock: {
    type: Number,
    required: [true, 'El stock del producto es obligatorio.'],
    min: [0, 'El stock no puede ser negativo.'],
    validate: {
      validator: Number.isInteger,
      message: 'El stock debe ser un número entero ({VALUE}).'
    }
  },
  category: {
    type: String,
    required: [true, 'La categoría del producto es obligatoria.'],
    trim: true,
  },
  thumbnails: {
    type: [{ // Define como un array de strings
        type: String,
        trim: true // Quitar espacios de las URLs de imagen
    }],
    required: false, // Hacer el array opcional
    default: [] // Por defecto un array vacío
 }
}, {
    timestamps: true // Añade createdAt y updatedAt automáticamente
});


// Exportar el modelo compilado
module.exports = mongoose.model('Product', productSchema);