// routes/products.routes.js
const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');

// Ruta para obtener todos los productos con filtros, paginación y ordenamiento.
// GET /api/products?limit=10&page=1&sort=asc&query=CategoríaX
router.get('/', productsController.getAllProducts);

// Ruta para obtener un producto por ID.
// GET /api/products/:pid
router.get('/:pid', productsController.getProductById);

// Ruta para agregar un nuevo producto.
// POST /api/products
router.post('/', productsController.addProduct);

// Ruta para actualizar un producto existente.
// PUT /api/products/:pid
router.put('/:pid', productsController.updateProduct);

// Ruta para eliminar un producto.
// DELETE /api/products/:pid
router.delete('/:pid', productsController.deleteProduct);

module.exports = router; // Exporta el router configurado

