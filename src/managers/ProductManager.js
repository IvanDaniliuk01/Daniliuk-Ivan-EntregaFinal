// managers/ProductManager.js
const Product = require('../models/product.model'); // Correcto: Importa el modelo Mongoose

class ProductManager {
  // Obtiene todos los productos con posibilidad de aplicar filtros, paginación y ordenamiento
  async getProducts({ limit = 10, page = 1, query = {}, sort } = {}) {
    // Convierte limit y page a números enteros
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    // Validación básica de limit y page
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
        // Podríamos lanzar un error o usar un valor por defecto seguro
        console.warn(`Valor de 'limit' inválido (${limit}), usando 10 por defecto.`);
        parsedLimit = 10;
    }
     if (isNaN(parsedPage) || parsedPage <= 0) {
        console.warn(`Valor de 'page' inválido (${page}), usando 1 por defecto.`);
        parsedPage = 1;
    }

    const options = {
      limit: parsedLimit,
      page: parsedPage,
      lean: true // Correcto: Devuelve objetos JS planos en lugar de documentos Mongoose
    };

    // Configuración del ordenamiento
    if (sort) {
      if (sort === 'asc' || sort === 'desc') {
          options.sort = { price: sort === 'asc' ? 1 : -1 };
      } else {
          console.warn(`Valor de 'sort' inválido (${sort}). Debe ser 'asc' o 'desc'. No se aplicará ordenamiento.`);
          // No se añade options.sort si el valor es inválido
      }
    }

    // Construcción del filtro (query)
    // El 'query' original ya es un objeto { category: 'valor' } o {}
    const filter = query;

    try {
        // --- Manteniendo Paginación Manual (como en el original, pero más limpio) ---
        const skip = (options.page - 1) * options.limit;
        const productsQuery = Product.find(filter)
                                     .sort(options.sort || {}) // Aplica sort si existe
                                     .skip(skip)
                                     .limit(options.limit);

        if (options.lean) {
            productsQuery.lean(); // Aplica lean si está en las opciones
        }

        const products = await productsQuery.exec(); // Ejecuta la consulta
        const totalDocs = await Product.countDocuments(filter); // Cuenta el total que coincide con el filtro

        const totalPages = Math.ceil(totalDocs / options.limit);
        const hasPrevPage = options.page > 1;
        const hasNextPage = options.page < totalPages;
        const prevPage = hasPrevPage ? options.page - 1 : null;
        const nextPage = hasNextPage ? options.page + 1 : null;

        // Devuelve la estructura completa esperada por el controlador
        return {
            products: products, // Cambiado de 'payload' a 'products' para consistencia interna, el controlador lo mapea a 'payload'
            totalDocs: totalDocs,
            limit: options.limit,
            totalPages: totalPages,
            page: options.page,
            hasPrevPage: hasPrevPage,
            hasNextPage: hasNextPage,
            prevPage: prevPage,
            nextPage: nextPage,
        };

    } catch (error) {
        console.error("Error en ProductManager.getProducts:", error);
        // Re-lanzar el error para que sea manejado por el llamador (controlador/socket handler)
        throw new Error(`Error al obtener productos: ${error.message}`);
    }
  }

  async getProductById(id) {
    try {
        // Validar que el ID sea un ObjectId válido de Mongoose (opcional pero bueno)
        if (!mongoose.Types.ObjectId.isValid(id)) {
             throw new Error(`El ID '${id}' no es válido.`);
        }
        const product = await Product.findById({_id: id}).lean(); // Usar lean para consistencia
        if (!product) {
            // En lugar de devolver null/undefined, es más explícito lanzar un error
            throw new Error(`Producto con ID '${id}' no encontrado.`);
        }
        return product;
    } catch(error) {
        console.error(`Error en ProductManager.getProductById(${id}):`, error);
        // Si el error es por ID no encontrado, lo relanzamos, sino, envolvemos el error original
        if (error.message.includes('no encontrado') || error.message.includes('no es válido')) {
            throw error;
        }
        throw new Error(`Error al obtener producto por ID: ${error.message}`);
    }
  }

  async addProduct(productData) {
    // Validación básica de campos obligatorios (se puede expandir)
    if (!productData.title || !productData.description || !productData.code || !productData.price || productData.stock == null || !productData.category) {
        throw new Error("Faltan campos obligatorios para crear el producto.");
    }
    // Asegurarse que status tenga un valor booleano (default es true en el schema, pero por si acaso)
    productData.status = productData.status !== undefined ? Boolean(productData.status) : true;
    // Validar tipos (price y stock deben ser números)
    if (typeof productData.price !== 'number' || typeof productData.stock !== 'number') {
        throw new Error("El precio y el stock deben ser valores numéricos.");
    }
     if (!Array.isArray(productData.thumbnails)) {
        // Si no es un array, o está vacío, asignar un array vacío o manejar como error
        console.warn("Thumbnails no es un array, se asignará un array vacío.");
        productData.thumbnails = [];
     }


    try {
        // Verificar si ya existe un producto con el mismo código
        const existingProduct = await Product.findOne({ code: productData.code });
        if (existingProduct) {
            throw new Error(`Ya existe un producto con el código '${productData.code}'.`);
        }

        const newProduct = new Product(productData);
        await newProduct.save();
        return newProduct.toObject(); // Devolver un objeto plano
    } catch (error) {
         console.error("Error en ProductManager.addProduct:", error);
         // Si el error es de duplicidad o validación, lo relanzamos, sino, envolvemos
         if (error.message.includes('Ya existe') || error.message.includes('obligatorios') || error.message.includes('numéricos')) {
            throw error;
         }
         // Manejo específico de errores de validación de Mongoose
         if (error.name === 'ValidationError') {
             // Extraer mensajes de error de validación
             const messages = Object.values(error.errors).map(val => val.message);
             throw new Error(`Error de validación: ${messages.join(', ')}`);
         }
         throw new Error(`Error al agregar producto: ${error.message}`);
    }
  }

  async updateProduct(id, updatedFields) {
     try {
        // Validar ID
         if (!mongoose.Types.ObjectId.isValid(id)) {
             throw new Error(`El ID '${id}' no es válido.`);
        }
        // No permitir actualizar el ID
        if (updatedFields._id) {
            delete updatedFields._id;
        }
         // Si se intenta actualizar el código, verificar que no exista ya en otro producto
         if (updatedFields.code) {
            const existingProduct = await Product.findOne({ code: updatedFields.code, _id: { $ne: id } }); // Buscar código en OTROS productos
            if (existingProduct) {
                throw new Error(`El código '${updatedFields.code}' ya está en uso por otro producto.`);
            }
         }

        const updatedProduct = await Product.findByIdAndUpdate(id, updatedFields, { new: true, runValidators: true });

        if (!updatedProduct) {
            throw new Error(`Producto con ID '${id}' no encontrado para actualizar.`);
        }
        return updatedProduct.toObject(); // Devolver objeto plano
     } catch (error) {
         console.error(`Error en ProductManager.updateProduct(${id}):`, error);
          // Relanzar errores específicos o envolver
         if (error.message.includes('no encontrado') || error.message.includes('no es válido') || error.message.includes('ya está en uso')) {
            throw error;
         }
         if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             throw new Error(`Error de validación al actualizar: ${messages.join(', ')}`);
         }
         throw new Error(`Error al actualizar producto: ${error.message}`);
     }
  }

  async deleteProduct(id) {
    try {
        // Validar ID
         if (!mongoose.Types.ObjectId.isValid(id)) {
             throw new Error(`El ID '${id}' no es válido.`);
        }
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
             throw new Error(`Producto con ID '${id}' no encontrado para eliminar.`);
        }
        // No es necesario devolver el producto eliminado, pero sí confirmar la operación.
        // Podemos devolver un objeto simple o true.
        return { message: `Producto con ID '${id}' eliminado correctamente.` };
    } catch (error) {
        console.error(`Error en ProductManager.deleteProduct(${id}):`, error);
        // Relanzar errores específicos o envolver
         if (error.message.includes('no encontrado') || error.message.includes('no es válido')) {
            throw error;
         }
        throw new Error(`Error al eliminar producto: ${error.message}`);
    }
  }
}

// Exportar una INSTANCIA ÚNICA (Singleton) de la clase
module.exports = new ProductManager();

