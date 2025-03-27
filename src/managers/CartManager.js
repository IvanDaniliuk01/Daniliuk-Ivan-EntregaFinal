// managers/CartManager.js
const Cart = require('../models/cart.model'); // Correcto: Importa el modelo Mongoose
// Necesitamos mongoose para validar ObjectIds
const mongoose = require('mongoose');

class CartManager {
  async createCart() {
    try {
        // Simplemente crea un carrito vacío
        const newCart = new Cart({ products: [] });
        await newCart.save();
        console.log("Nuevo carrito creado con ID:", newCart._id); // Log
        // Devuelve el objeto plano del carrito nuevo
        return newCart.toObject();
    } catch (error) {
        console.error("Error en CartManager.createCart:", error);
        throw new Error(`Error al crear carrito: ${error.message}`);
    }
  }

  async getCartById(id) {
    try {
        // Validar ID del carrito
        if (!mongoose.Types.ObjectId.isValid(id)) {
             throw new Error(`El ID de carrito '${id}' no es válido.`);
        }

        // Usamos populate para traer los datos completos de los productos
        // lean() convierte el resultado (incluyendo subdocumentos poblados) a objetos JS planos
        const cart = await Cart.findById(id).populate('products.product').lean();

        if (!cart) {
            throw new Error(`Carrito con ID '${id}' no encontrado.`);
        }
        if (cart.products && cart.products.length > 0) {
            const originalCount = cart.products.length;
            cart.products = cart.products.filter(item => item.product !== null);
            if (cart.products.length < originalCount) {
                console.warn(`Carrito ${id}: Se filtraron ${originalCount - cart.products.length} productos que ya no existen.`);
            }
        }

        return cart; // Ya es un objeto plano debido a .lean()
    } catch(error) {
        console.error(`Error en CartManager.getCartById(${id}):`, error);
         if (error.message.includes('no encontrado') || error.message.includes('no es válido')) {
            throw error;
         }
        throw new Error(`Error al obtener carrito por ID: ${error.message}`);
    }
  }

  async addProductToCart(cartId, productId) {
    try {
        // Validar IDs
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
             throw new Error(`El ID de carrito '${cartId}' no es válido.`);
        }
         if (!mongoose.Types.ObjectId.isValid(productId)) {
             throw new Error(`El ID de producto '${productId}' no es válido.`);
        }

        // Buscar el carrito
        const cart = await Cart.findById(cartId);
        if (!cart) throw new Error(`Carrito con ID '${cartId}' no encontrado.`);
        // Validar si el carrito ya está finalizado (opcional)
        if (cart.finalized) {
             throw new Error(`El carrito '${cartId}' ya está finalizado y no se puede modificar.`);
        }

        // Buscar si el producto ya está en el carrito
        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);

        if (productIndex !== -1) {
          // Si existe, incrementar cantidad
          cart.products[productIndex].quantity += 1;
          console.log(`Cantidad incrementada para producto ${productId} en carrito ${cartId}`);
        } else {
          // Si no existe, agregarlo al array
          cart.products.push({ product: productId, quantity: 1 });
           console.log(`Producto ${productId} agregado al carrito ${cartId}`);
        }

        await cart.save(); // Guardar los cambios en el carrito

        // Devolver el carrito actualizado CON los productos poblados y como objeto plano
        // Necesitamos volver a poblar después de guardar
        const updatedCart = await Cart.findById(cartId).populate('products.product').lean();
        return updatedCart;

    } catch (error) {
        console.error(`Error en CartManager.addProductToCart(${cartId}, ${productId}):`, error);
         if (error.message.includes('no encontrado') || error.message.includes('no es válido') || error.message.includes('finalizado')) {
            throw error;
         }
        throw new Error(`Error al agregar producto al carrito: ${error.message}`);
    }
  }

  async decrementProductQuantity(cartId, productId) {
    try {
        // Validar IDs
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
             throw new Error(`El ID de carrito '${cartId}' no es válido.`);
        }
         if (!mongoose.Types.ObjectId.isValid(productId)) {
             throw new Error(`El ID de producto '${productId}' no es válido.`);
        }

        const cart = await Cart.findById(cartId);
        if (!cart) throw new Error(`Carrito con ID '${cartId}' no encontrado.`);
        if (cart.finalized) {
             throw new Error(`El carrito '${cartId}' ya está finalizado y no se puede modificar.`);
        }

        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);
        if (productIndex === -1) throw new Error(`Producto con ID '${productId}' no encontrado en el carrito '${cartId}'.`);

        if (cart.products[productIndex].quantity > 1) {
          // Si la cantidad es mayor a 1, decrementar
          cart.products[productIndex].quantity -= 1;
          console.log(`Cantidad decrementada para producto ${productId} en carrito ${cartId}`);
        } else {
          // Si la cantidad es 1, eliminar el producto del array
          cart.products.splice(productIndex, 1);
          console.log(`Producto ${productId} eliminado del carrito ${cartId} (cantidad era 1)`);
        }

        await cart.save();

        // Devolver el carrito actualizado, poblado y como objeto plano
        const updatedCart = await Cart.findById(cartId).populate('products.product').lean();
        return updatedCart;

    } catch (error) {
        console.error(`Error en CartManager.decrementProductQuantity(${cartId}, ${productId}):`, error);
         if (error.message.includes('no encontrado') || error.message.includes('no es válido') || error.message.includes('finalizado')) {
            throw error;
         }
        throw new Error(`Error al decrementar cantidad del producto: ${error.message}`);
    }
  }

  async finalizeCart(cartId) {
    try {
        // Validar ID
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
             throw new Error(`El ID de carrito '${cartId}' no es válido.`);
        }
        const cart = await Cart.findById(cartId);
        if (!cart) throw new Error(`Carrito con ID '${cartId}' no encontrado.`);
        if (cart.finalized) {
            console.warn(`El carrito '${cartId}' ya estaba finalizado.`);
        }

        cart.finalized = true;
        await cart.save();
        console.log(`Carrito ${cartId} marcado como finalizado.`);

        // Devolver el carrito actualizado, poblado y como objeto plano
        const updatedCart = await Cart.findById(cartId).populate('products.product').lean();
        return updatedCart;
    } catch (error) {
        console.error(`Error en CartManager.finalizeCart(${cartId}):`, error);
         if (error.message.includes('no encontrado') || error.message.includes('no es válido')) {
            throw error;
         }
        throw new Error(`Error al finalizar carrito: ${error.message}`);
    }
  }

  // Métodos adicionales implementados en el original:

  // DELETE /api/carts/:cid/products/:pid
  async deleteProductFromCart(cartId, productId) {
     try {
        // Validar IDs
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
             throw new Error(`El ID de carrito '${cartId}' no es válido.`);
        }
         if (!mongoose.Types.ObjectId.isValid(productId)) {
             throw new Error(`El ID de producto '${productId}' no es válido.`);
        }

        const cart = await Cart.findById(cartId);
        if (!cart) throw new Error(`Carrito con ID '${cartId}' no encontrado.`);
        if (cart.finalized) {
             throw new Error(`El carrito '${cartId}' ya está finalizado y no se puede modificar.`);
        }

        const initialLength = cart.products.length;
        // Filtrar el array para remover el producto
        cart.products = cart.products.filter(p => p.product.toString() !== productId);

        if (cart.products.length === initialLength) {
             // Si el tamaño no cambió, el producto no estaba en el carrito
             throw new Error(`Producto con ID '${productId}' no encontrado en el carrito '${cartId}' para eliminar.`);
        }

        await cart.save();
        console.log(`Producto ${productId} eliminado completamente del carrito ${cartId}`);

        // Devolver el carrito actualizado, poblado y como objeto plano
        const updatedCart = await Cart.findById(cartId).populate('products.product').lean();
        return updatedCart;

    } catch (error) {
        console.error(`Error en CartManager.deleteProductFromCart(${cartId}, ${productId}):`, error);
         if (error.message.includes('no encontrado') || error.message.includes('no es válido') || error.message.includes('finalizado')) {
            throw error;
         }
        throw new Error(`Error al eliminar producto del carrito: ${error.message}`);
    }
  }

  // PUT /api/carts/:cid
  async updateCartProducts(cartId, newProductsArray) {
    try {
        // Validar ID de carrito
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
             throw new Error(`El ID de carrito '${cartId}' no es válido.`);
        }

        // Validar que newProductsArray sea un array
        if (!Array.isArray(newProductsArray)) {
            throw new Error("El formato de los productos proporcionados es inválido (se esperaba un array).");
        }

        // Validar cada elemento del array
        const validatedProducts = [];
        for (const item of newProductsArray) {
            if (!item || !item.product || !item.quantity) {
                throw new Error("Cada elemento del array de productos debe tener 'product' (ID) y 'quantity'.");
            }
            if (!mongoose.Types.ObjectId.isValid(item.product)) {
                 throw new Error(`El ID de producto '${item.product}' en el array no es válido.`);
            }
             if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
                 throw new Error(`La cantidad para el producto '${item.product}' debe ser un número entero positivo.`);
            }
            validatedProducts.push({
                product: item.product,
                quantity: item.quantity
            });
        }

        const cart = await Cart.findById(cartId);
        if (!cart) throw new Error(`Carrito con ID '${cartId}' no encontrado.`);
        if (cart.finalized) {
             throw new Error(`El carrito '${cartId}' ya está finalizado y no se puede modificar.`);
        }

        // Reemplazar completamente el array de productos
        cart.products = validatedProducts;
        await cart.save();
        console.log(`Productos del carrito ${cartId} actualizados masivamente.`);

        // Devolver el carrito actualizado, poblado y como objeto plano
        const updatedCart = await Cart.findById(cartId).populate('products.product').lean();
        return updatedCart;

    } catch (error) {
        console.error(`Error en CartManager.updateCartProducts(${cartId}):`, error);
         if (error.message.includes('no encontrado') || error.message.includes('no es válido') || error.message.includes('finalizado') || error.message.includes('formato') || error.message.includes('cantidad') || error.message.includes('elemento')) {
            throw error;
         }
        throw new Error(`Error al actualizar productos del carrito: ${error.message}`);
    }
  }

  // PUT /api/carts/:cid/products/:pid
  async updateProductQuantity(cartId, productId, newQuantity) {
    try {
         // Validar IDs
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
             throw new Error(`El ID de carrito '${cartId}' no es válido.`);
        }
         if (!mongoose.Types.ObjectId.isValid(productId)) {
             throw new Error(`El ID de producto '${productId}' no es válido.`);
        }
         // Validar cantidad
         const quantity = Number(newQuantity); // Asegurar que sea número
         if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
             throw new Error(`La cantidad proporcionada ('${newQuantity}') debe ser un número entero positivo.`);
         }

        const cart = await Cart.findById(cartId);
        if (!cart) throw new Error(`Carrito con ID '${cartId}' no encontrado.`);
         if (cart.finalized) {
             throw new Error(`El carrito '${cartId}' ya está finalizado y no se puede modificar.`);
        }

        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);
        if (productIndex === -1) throw new Error(`Producto con ID '${productId}' no encontrado en el carrito '${cartId}' para actualizar cantidad.`);

        // Actualizar la cantidad
        cart.products[productIndex].quantity = quantity;
        await cart.save();
        console.log(`Cantidad actualizada a ${quantity} para producto ${productId} en carrito ${cartId}`);

        // Devolver el carrito actualizado, poblado y como objeto plano
        const updatedCart = await Cart.findById(cartId).populate('products.product').lean();
        return updatedCart;

    } catch (error) {
        console.error(`Error en CartManager.updateProductQuantity(${cartId}, ${productId}, ${newQuantity}):`, error);
         if (error.message.includes('no encontrado') || error.message.includes('no es válido') || error.message.includes('finalizado') || error.message.includes('cantidad')) {
            throw error;
         }
        throw new Error(`Error al actualizar cantidad del producto: ${error.message}`);
    }
  }

  // DELETE /api/carts/:cid
  async clearCart(cartId) {
    try {
        // Validar ID
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
             throw new Error(`El ID de carrito '${cartId}' no es válido.`);
        }
        const cart = await Cart.findById(cartId);
        if (!cart) throw new Error(`Carrito con ID '${cartId}' no encontrado.`);
         if (cart.finalized) {
             throw new Error(`El carrito '${cartId}' ya está finalizado y no se puede modificar.`);
        }

        // Vaciar el array de productos
        cart.products = [];
        await cart.save();
        console.log(`Todos los productos eliminados del carrito ${cartId}`);

        // Devolver el carrito vacío (ya es un objeto plano por el 'findById')
        // No es necesario poblar un array vacío, pero usamos lean() para consistencia
        return cart.toObject(); // Convertimos a objeto plano

    } catch (error) {
        console.error(`Error en CartManager.clearCart(${cartId}):`, error);
         if (error.message.includes('no encontrado') || error.message.includes('no es válido') || error.message.includes('finalizado')) {
            throw error;
         }
        throw new Error(`Error al vaciar el carrito: ${error.message}`);
    }
  }
}

// Exportar una INSTANCIA ÚNICA (Singleton) de la clase
module.exports = new CartManager();

