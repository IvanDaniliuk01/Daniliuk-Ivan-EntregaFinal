// controllers/carts.controller.js

const cartManager = require('../managers/CartManager');

// POST /api/carts: Crear un carrito nuevo
const createCart = async (req, res) => {
  try {
    // El manager maneja la creación
    const newCart = await cartManager.createCart();
    // Devolver 201 Created con el nuevo carrito
    return res.status(201).json({ status: "success", payload: newCart });
  } catch (error) {
    console.error("Error en carts.controller.createCart:", error);
    return res.status(500).json({ status: "error", error: `Error interno al crear carrito: ${error.message}` });
  }
};

// GET /api/carts/:cid: Obtener un carrito por su ID (con populate)
const getCartById = async (req, res) => {
  try {
    const { cid } = req.params;
    // El manager valida ID, busca, puebla y lanza error si no encuentra
    const cart = await cartManager.getCartById(cid);
    // No es necesario chequear !cart aquí
    return res.status(200).json({ status: "success", payload: cart });
  } catch (error) {
    console.error(`Error en carts.controller.getCartById(${req.params.cid}):`, error);
    // Determinar código de estado basado en el error del manager
    if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al obtener el carrito: ${error.message}` });
  }
};

// POST /api/carts/:cid/product/:pid: Agregar un producto al carrito
const addProductToCart = async (req, res) => {
  try {
    const { cid, pid } = req.params;
    // El manager valida IDs, busca carrito, verifica si está finalizado, agrega/incrementa producto
    const updatedCart = await cartManager.addProductToCart(cid, pid);

    const io = req.io;
    if (io) {
        // Emitir el carrito actualizado SÓLO a la sala de ese carrito
        io.to(cid).emit('cartUpdated', updatedCart);
        console.log(`Evento 'cartUpdated' emitido a sala ${cid} tras agregar producto vía API.`);
    } else {
        console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    // Devolver 200 OK con el carrito actualizado
    return res.status(200).json({ status: "success", payload: updatedCart });

  } catch (error) {
    console.error(`Error en carts.controller.addProductToCart(${req.params.cid}, ${req.params.pid}):`, error);
    // Determinar código de estado según el error
     if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
    if (error.message.includes('finalizado')) {
         return res.status(400).json({ status: "error", error: error.message }); // 400 Bad Request (o 403 Forbidden)
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al agregar producto al carrito: ${error.message}` });
  }
};

// PUT /api/carts/:cid/product/:pid: Disminuir la cantidad de un producto en el carrito (Implementado originalmente en manager como decrement)
const decrementProductInCart = async (req, res) => {
  try {
    const { cid, pid } = req.params;
    // El manager valida IDs, busca carrito, verifica finalizado, decrementa/elimina producto
    const updatedCart = await cartManager.decrementProductQuantity(cid, pid);

    const io = req.io;
    if (io) {
        io.to(cid).emit('cartUpdated', updatedCart);
         console.log(`Evento 'cartUpdated' emitido a sala ${cid} tras decrementar producto vía API.`);
    } else {
         console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    return res.status(200).json({ status: "success", payload: updatedCart });

  } catch (error) {
     console.error(`Error en carts.controller.decrementProductInCart(${req.params.cid}, ${req.params.pid}):`, error);
    // Determinar código de estado según el error
     if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
     if (error.message.includes('finalizado')) {
         return res.status(400).json({ status: "error", error: error.message }); // 400 Bad Request
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al decrementar producto del carrito: ${error.message}` });
  }
};

// PUT /api/carts/:cid/finalize: Finalizar el carrito (Implementación añadida)
const finalizeCart = async (req, res) => {
  try {
    const { cid } = req.params;
    // El manager valida ID, busca carrito, marca como finalizado
    const updatedCart = await cartManager.finalizeCart(cid);

    const io = req.io;
    if (io) {
        io.to(cid).emit('cartUpdated', updatedCart); // Actualizar estado general
        io.to(cid).emit('cartFinalized', { cartId: updatedCart._id, finalizedAt: updatedCart.updatedAt }); // Evento específico
        console.log(`Eventos 'cartUpdated' y 'cartFinalized' emitidos a sala ${cid} tras finalizar carrito vía API.`);
        // Opcional: Hacer que los sockets abandonen la sala
        // io.in(cid).socketsLeave(cid);
    } else {
        console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    return res.status(200).json({ status: "success", payload: updatedCart });
  } catch (error) {
     console.error(`Error en carts.controller.finalizeCart(${req.params.cid}):`, error);
    // Determinar código de estado según el error
     if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
    // Error genérico (manager ya maneja si estaba finalizado con warning, no error)
    return res.status(500).json({ status: "error", error: `Error interno al finalizar carrito: ${error.message}` });
  }
};

// DELETE /api/carts/:cid/products/:pid: Eliminar un producto específico del carrito
const deleteProductFromCart = async (req, res) => {
  try {
    const { cid, pid } = req.params;
    // El manager valida IDs, busca carrito, verifica finalizado, filtra producto
    const updatedCart = await cartManager.deleteProductFromCart(cid, pid);

    const io = req.io;
     if (io) {
        io.to(cid).emit('cartUpdated', updatedCart);
        console.log(`Evento 'cartUpdated' emitido a sala ${cid} tras eliminar producto vía API.`);
    } else {
        console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    return res.status(200).json({ status: "success", payload: updatedCart });
  } catch (error) {
    console.error(`Error en carts.controller.deleteProductFromCart(${req.params.cid}, ${req.params.pid}):`, error);
    // Determinar código de estado según el error
     if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        // Puede ser 'carrito no encontrado' o 'producto no encontrado en carrito'
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
     if (error.message.includes('finalizado')) {
         return res.status(400).json({ status: "error", error: error.message }); // 400 Bad Request
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al eliminar producto del carrito: ${error.message}` });
  }
};

// PUT /api/carts/:cid: Actualizar todos los productos del carrito
const updateCartProducts = async (req, res) => {
  try {
    const { cid } = req.params;
    // Se espera recibir un arreglo de productos en req.body.products
    const newProductsArray = req.body.products; // Asegúrate que el cliente envíe { "products": [...] }
     if (!newProductsArray) {
         return res.status(400).json({ status: "error", error: "Falta el array 'products' en el body." });
    }
    // El manager valida ID carrito, formato del array, IDs de producto, cantidades, finalizado
    const updatedCart = await cartManager.updateCartProducts(cid, newProductsArray);

    const io = req.io;
     if (io) {
        io.to(cid).emit('cartUpdated', updatedCart);
        console.log(`Evento 'cartUpdated' emitido a sala ${cid} tras actualizar carrito masivamente vía API.`);
    } else {
         console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    return res.status(200).json({ status: "success", payload: updatedCart });
  } catch (error) {
    console.error(`Error en carts.controller.updateCartProducts(${req.params.cid}):`, error);
    // Determinar código de estado según el error
     if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
    // Errores de formato, IDs, cantidad, finalizado, etc.
    if (error.message.includes('formato') || error.message.includes('cantidad') || error.message.includes('elemento') || error.message.includes('finalizado')) {
         return res.status(400).json({ status: "error", error: error.message }); // 400 Bad Request
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al actualizar productos del carrito: ${error.message}` });
  }
};

// PUT /api/carts/:cid/products/:pid: Actualizar solo la cantidad de un producto del carrito
const updateProductQuantity = async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const { quantity } = req.body; // Espera { "quantity": number } en el body
     if (quantity === undefined) {
          return res.status(400).json({ status: "error", error: "Falta el campo 'quantity' en el body." });
    }
    // El manager valida IDs, cantidad, carrito finalizado, producto en carrito
    const updatedCart = await cartManager.updateProductQuantity(cid, pid, quantity);

    const io = req.io;
    if (io) {
        io.to(cid).emit('cartUpdated', updatedCart);
        console.log(`Evento 'cartUpdated' emitido a sala ${cid} tras actualizar cantidad vía API.`);
    } else {
         console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    return res.status(200).json({ status: "success", payload: updatedCart });
  } catch (error) {
    console.error(`Error en carts.controller.updateProductQuantity(${req.params.cid}, ${req.params.pid}):`, error);
    // Determinar código de estado según el error
     if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
    if (error.message.includes('cantidad') || error.message.includes('finalizado')) {
         return res.status(400).json({ status: "error", error: error.message }); // 400 Bad Request
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al actualizar cantidad del producto: ${error.message}` });
  }
};

// DELETE /api/carts/:cid: Eliminar todos los productos del carrito (vaciar carrito)
const clearCart = async (req, res) => {
  try {
    const { cid } = req.params;
    // El manager valida ID, busca carrito, verifica finalizado, vacía productos
    const updatedCart = await cartManager.clearCart(cid); // Devuelve el carrito vacío

    const io = req.io;
     if (io) {
        io.to(cid).emit('cartUpdated', updatedCart);
         console.log(`Evento 'cartUpdated' emitido a sala ${cid} tras vaciar carrito vía API.`);
    } else {
        console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    // Devolver 200 OK con el carrito vacío
    return res.status(200).json({ status: "success", payload: updatedCart }); // O 204 No Content si se prefiere

  } catch (error) {
    console.error(`Error en carts.controller.clearCart(${req.params.cid}):`, error);
    // Determinar código de estado según el error
     if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
     if (error.message.includes('finalizado')) {
         return res.status(400).json({ status: "error", error: error.message }); // 400 Bad Request
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al vaciar el carrito: ${error.message}` });
  }
};

module.exports = {
  createCart,
  getCartById,
  addProductToCart,
  decrementProductInCart, // Corresponde a PUT /:cid/product/:pid
  finalizeCart,            // Corresponde a PUT /:cid/finalize
  deleteProductFromCart,   // Corresponde a DELETE /:cid/products/:pid
  updateCartProducts,      // Corresponde a PUT /:cid
  updateProductQuantity,   // Corresponde a PUT /:cid/products/:pid
  clearCart                // Corresponde a DELETE /:cid
};