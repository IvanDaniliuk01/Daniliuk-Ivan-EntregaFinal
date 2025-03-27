// routes/carts.routes.js
const express = require('express');
const router = express.Router();
const cartsController = require('../controllers/carts.controller');

// Ruta para crear un carrito nuevo.
// POST /api/carts
router.post('/', cartsController.createCart);

// Ruta para obtener un carrito por ID (con populate para obtener los detalles de cada producto).
// GET /api/carts/:cid
router.get('/:cid', cartsController.getCartById);

// Ruta para agregar un producto al carrito.
// POST /api/carts/:cid/product/:pid
router.post('/:cid/product/:pid', cartsController.addProductToCart);

// Ruta para disminuir la cantidad de un producto en el carrito.
// PUT /api/carts/:cid/product/:pid  <-- Método PUT según el controlador original (decrementProductInCart)
router.put('/:cid/product/:pid', cartsController.decrementProductInCart);

// Ruta para actualizar todos los productos del carrito con un arreglo de productos.
// PUT /api/carts/:cid
// Body esperado: { "products": [{ "product": "product_id", "quantity": N }, ...] }
router.put('/:cid', cartsController.updateCartProducts);

// Ruta para actualizar únicamente la cantidad de un producto en el carrito.
// PUT /api/carts/:cid/products/:pid <-- Endpoint diferente al de decrementar cantidad
// Body esperado: { "quantity": N }
router.put('/:cid/products/:pid', cartsController.updateProductQuantity);

// Ruta para eliminar un producto específico del carrito.
// DELETE /api/carts/:cid/products/:pid
router.delete('/:cid/products/:pid', cartsController.deleteProductFromCart);

// Ruta para eliminar todos los productos del carrito (vaciar el carrito).
// DELETE /api/carts/:cid
router.delete('/:cid', cartsController.clearCart);

// Ruta para finalizar el carrito.
// PUT /api/carts/:cid/finalize (Implementación añadida)
router.put('/:cid/finalize', cartsController.finalizeCart);

module.exports = router; // Exporta el router configurado

