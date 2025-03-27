// controllers/products.controller.js

const productManager = require('../managers/ProductManager');

// GET /api/products
// Permite recibir parámetros query para: limit, page, sort y query (filtro, por ejemplo, por categoría)
const getAllProducts = async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query } = req.query;
    let filter = {};
    // Podríamos hacerlo más flexible, ej: query=campo:valor
    if (query) {
        filter.category = query;
    }

    // Se consulta el ProductManager con las opciones indicadas
    // El manager ahora devuelve una estructura más completa
    const result = await productManager.getProducts({
      limit,
      page,
      query: filter,
      sort
    });

    // Construir los enlaces de paginación
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`; // Usa originalUrl para base
    // Función helper para construir query strings limpias
    const buildQueryString = (params) => {
        const q = new URLSearchParams(params);
        // Eliminar parámetros vacíos o nulos
        for (let [key, value] of q.entries()) {
             if (!value) {
                 q.delete(key);
            }
        }
        return q.toString();
    };

    const commonParams = { limit, sort, query };
    const prevLink = result.hasPrevPage
        ? `${baseUrl}?${buildQueryString({ ...commonParams, page: result.prevPage })}`
        : null;
    const nextLink = result.hasNextPage
        ? `${baseUrl}?${buildQueryString({ ...commonParams, page: result.nextPage })}`
        : null;


    // Construir la respuesta JSON exactamente como se pide
    return res.status(200).json({ // Usar 200 OK para éxito
      status: "success",
      payload: result.products, // El manager devuelve 'products', lo mapeamos a 'payload'
      totalPages: result.totalPages,
      prevPage: result.prevPage,
      nextPage: result.nextPage,
      page: result.page,
      hasPrevPage: result.hasPrevPage,
      hasNextPage: result.hasNextPage,
      prevLink: prevLink,
      nextLink: nextLink
    });
  } catch (error) {
     console.error("Error en products.controller.getAllProducts:", error);
    // Devolver un error 500 si falla la obtención
    return res.status(500).json({ status: "error", error: `Error interno al obtener productos: ${error.message}` });
  }
};

// GET /api/products/:pid
const getProductById = async (req, res) => {
  try {
    const { pid } = req.params;
    // El manager ahora lanza error si el ID es inválido o no se encuentra
    const product = await productManager.getProductById(pid);
    // No necesitamos chequear !product aquí porque el manager lanza error
    return res.status(200).json({ status: "success", payload: product }); // Usar payload para consistencia
  } catch (error) {
    console.error(`Error en products.controller.getProductById(${req.params.pid}):`, error);
    // Determinar el código de estado basado en el error del manager
    if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al obtener el producto: ${error.message}` });
  }
};

// POST /api/products
const addProduct = async (req, res) => {
  try {
    const productData = req.body;
    // El manager ahora realiza validaciones y lanza errores específicos
    const newProduct = await productManager.addProduct(productData);

    // Obtener la instancia de io inyectada por el middleware
    const io = req.io;
    if (io) {
        // Obtener la lista actualizada para emitir
        const { products } = await productManager.getProducts({ limit: 100 }); // Opciones adecuadas
        io.emit('updateProducts', products); // Emitir a todos los clientes
        console.log("Evento 'updateProducts' emitido tras agregar producto vía API.");
    } else {
        console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    // Devolver 201 Created con el nuevo producto
    return res.status(201).json({ status: "success", payload: newProduct });

  } catch (error) {
    console.error("Error en products.controller.addProduct:", error);
    // Determinar código de estado según el error de validación o duplicidad del manager
    if (error.message.includes('Ya existe') || error.message.includes('obligatorios') || error.message.includes('numéricos') || error.message.includes('validación')) {
        return res.status(400).json({ status: "error", error: error.message }); // 400 Bad Request
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al agregar producto: ${error.message}` });
  }
};

// PUT /api/products/:pid
const updateProduct = async (req, res) => {
  try {
    const { pid } = req.params;
    const updatedFields = req.body;

    // El manager maneja validación de ID, campos, código duplicado y "no encontrado"
    const updatedProduct = await productManager.updateProduct(pid, updatedFields);

    const io = req.io;
    if (io) {
        const { products } = await productManager.getProducts({ limit: 100 });
        io.emit('updateProducts', products);
        console.log("Evento 'updateProducts' emitido tras actualizar producto vía API.");
    } else {
         console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    // Devolver 200 OK con el producto actualizado
    return res.status(200).json({ status: "success", payload: updatedProduct });

  } catch (error) {
    console.error(`Error en products.controller.updateProduct(${req.params.pid}):`, error);
     // Determinar código de estado según el error
    if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
    if (error.message.includes('ya está en uso') || error.message.includes('validación')) {
        return res.status(400).json({ status: "error", error: error.message }); // 400 Bad Request
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al actualizar producto: ${error.message}` });
  }
};

// DELETE /api/products/:pid
const deleteProduct = async (req, res) => {
  try {
    const { pid } = req.params;
    // El manager maneja validación de ID y "no encontrado"
    const result = await productManager.deleteProduct(pid); // Devuelve { message: ... }

    const io = req.io;
    if (io) {
        const { products } = await productManager.getProducts({ limit: 100 });
        io.emit('updateProducts', products);
        console.log("Evento 'updateProducts' emitido tras eliminar producto vía API.");
    } else {
         console.warn("Instancia de io no encontrada en req. No se pudo emitir evento socket.");
    }

    // Devolver 200 OK con el mensaje del manager
    return res.status(200).json({ status: "success", payload: result.message }); // O simplemente status 204 No Content

  } catch (error) {
     console.error(`Error en products.controller.deleteProduct(${req.params.pid}):`, error);
     // Determinar código de estado según el error
     if (error.message.includes('no es válido') || error.message.includes('no encontrado')) {
        return res.status(404).json({ status: "error", error: error.message }); // 404 Not Found
    }
    // Error genérico
    return res.status(500).json({ status: "error", error: `Error interno al eliminar producto: ${error.message}` });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct
};

