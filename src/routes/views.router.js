// src/routes/views.router.js

const express = require('express');
const router = express.Router();
const productManager = require('../managers/ProductManager');
const cartManager = require('../managers/CartManager');

const buildQueryString = (params) => {
    const q = new URLSearchParams(params);
    for (let [key, value] of q.entries()) {
        if (!value && value !== 0) { // Eliminar parámetros vacíos o nulos
            q.delete(key);
        }
    }
    return q.toString();
};

// GET /products - Lista de productos con paginación
router.get('/products', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query } = req.query;
    let filter = {};
    if (query) {
      filter.category = query; // Asumiendo filtro simple por categoría
    }

    // Usar el ProductManager Singleton
    const result = await productManager.getProducts({ limit, page, query: filter, sort });

    // Construir enlaces de paginación
    const baseUrl = req.originalUrl.split('?')[0];
    const commonParams = { limit: result.limit, sort, query }; // Usar el limit real aplicado
    const prevLink = result.hasPrevPage ? `${baseUrl}?${buildQueryString({ ...commonParams, page: result.prevPage })}` : null;
    const nextLink = result.hasNextPage ? `${baseUrl}?${buildQueryString({ ...commonParams, page: result.nextPage })}` : null;

    res.render('index', { // Renderiza views/index.handlebars
        layout: 'main',
        title: 'Lista de Productos',
        products: result.products,
        totalPages: result.totalPages,
        page: result.page,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevPage: result.prevPage,
        nextPage: result.nextPage,
        prevLink: prevLink,
        nextLink: nextLink,
        currentLimit: result.limit,
        currentSort: sort,
        currentQuery: query,
        user: req.user
     });

  } catch (error) {
    console.error("Error en views.router GET /products:", error);
    res.status(500).render('error', {
        layout: 'main', title: 'Error',
        message: `Error al cargar la lista de productos: ${error.message}`
    });
  }
});

// GET /products/:pid - Detalle de un producto
router.get('/products/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    // Usar el ProductManager Singleton (lanza error si no válido/encontrado)
    const product = await productManager.getProductById(pid);

    res.render('productDetails', { // Renderiza views/productDetails.handlebars
        layout: 'main',
        title: `Detalle: ${product.title}`,
        product: product,
        user: req.user // Pasar usuario si existe
    });

  } catch (error) {
    console.error(`Error en views.router GET /products/${req.params.pid}:`, error);
    if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).render('error', {
            layout: 'main', title: 'Producto No Encontrado', message: error.message
        });
    }
    res.status(500).render('error', {
        layout: 'main', title: 'Error',
        message: `Error al cargar el detalle del producto: ${error.message}`
    });
  }
});

// GET /carts/:cid - Detalle de un carrito
router.get('/carts/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const cart = await cartManager.getCartById(cid);

     // Calcular total
     let totalAmount = 0;
     if (cart.products && cart.products.length > 0) {
         totalAmount = cart.products.reduce((sum, item) => {
            if (item.product && typeof item.product.price === 'number' && typeof item.quantity === 'number') {
                return sum + (item.product.price * item.quantity);
            }
            return sum;
         }, 0);
     }

    res.render('cartDetails', { // Renderiza views/cartDetails.handlebars
        layout: 'main',
        title: `Detalle del Carrito ${cid}`,
        cart: cart,
        cartId: cid, // Pasar ID explícito
        totalAmount: totalAmount.toFixed(2),
        user: req.user // Pasar usuario si existe
    });

  } catch (error) {
    console.error(`Error en views.router GET /carts/${req.params.cid}:`, error);
    if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).render('error', {
             layout: 'main', title: 'Carrito No Encontrado', message: error.message
        });
    }
    res.status(500).render('error', {
        layout: 'main', title: 'Error',
        message: `Error al cargar el detalle del carrito: ${error.message}`
    });
  }
});

// GET / - Redirige a la vista principal de productos
router.get('/', (req, res) => {
    res.redirect('/products');
});


module.exports = router;
