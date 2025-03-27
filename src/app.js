const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const exphbs = require('express-handlebars');
const path = require('path');
const connectDB = require('./db');

// Routers
const productsRouter = require('./routes/products.routes');
const cartsRouter = require('./routes/carts.routes');
const viewsRouter = require('./routes/views.router');

// Importar las INSTANCIAS singleton de los managers
const productManager = require('./managers/ProductManager');
const cartManager = require('./managers/CartManager');

// Conectar a la base de datos
connectDB();

const app = express();
// Usar variable de entorno para el puerto, con fallback a 8080
const PORT = process.env.PORT || 8080;

// Configurar middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar Handlebars
const handlebarsConfig = {
  defaultLayout: 'main', // El nombre de tu archivo de layout principal (sin extensión)
  layoutsDir: path.join(__dirname, 'views/layouts'), // Ruta a tu carpeta de layouts
  extname: '.handlebars'
};

// Si usabas exphbs.engine():
app.engine('handlebars', exphbs.engine(handlebarsConfig));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views')); // Esto sigue igual

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Crear el servidor HTTP y configurar Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer);

// --- Lógica de Socket.IO ---
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Enviar lista inicial de productos al cliente que se conecta
    (async () => {
        try {
            const { products } = await productManager.getProducts({ limit: 100 }); // Usar instancia singleton
            socket.emit('updateProducts', products);
        } catch (error) {
            console.error("Error enviando productos iniciales:", error);
            socket.emit('error', { message: `Error cargando productos: ${error.message}` });
        }
    })();

    // --- Manejadores de eventos de Productos ---
    socket.on('addProduct', async (productData) => {
        try {
            // Validación básica (mejorar con Joi o express-validator si es necesario)
            if (!productData || !productData.title || !productData.price || !productData.code || !productData.stock || !productData.category) {
               throw new Error("Faltan datos obligatorios del producto");
            }
            await productManager.addProduct(productData); // Usar instancia singleton
            const { products } = await productManager.getProducts({ limit: 100 });
            io.emit('updateProducts', products); // Notificar a todos
            console.log(`Producto agregado vía socket: ${productData.title}`);
        } catch (error) {
            console.error("Error socket 'addProduct':", error);
            socket.emit('error', { message: `Error agregando producto: ${error.message}` });
        }
    });

    socket.on('deleteProduct', async (productId) => {
        try {
            if (!productId) throw new Error("Se requiere ID de producto");
            await productManager.deleteProduct(productId); // Usar instancia singleton
            const { products } = await productManager.getProducts({ limit: 100 });
            io.emit('updateProducts', products); // Notificar a todos
             console.log(`Producto eliminado vía socket: ${productId}`);
        } catch (error) {
            console.error("Error socket 'deleteProduct':", error);
            socket.emit('error', { message: `Error eliminando producto: ${error.message}` });
        }
    });

     socket.on('updateProduct', async (updateData) => {
      try {
        const { id, ...fields } = updateData;
        if (!id) throw new Error("Se requiere ID para actualizar producto");
        await productManager.updateProduct(id, fields); // Usar instancia singleton
        const { products } = await productManager.getProducts({ limit: 100 });
        io.emit('updateProducts', products);
        console.log(`Producto actualizado vía socket: ${id}`);
      } catch (error) {
        console.error("Error socket 'updateProduct':", error);
        socket.emit('error', { message: `Error actualizando producto: ${error.message}` });
      }
    });


    // --- Manejadores de eventos de Carrito ---
    socket.on('createCart', async () => {
        try {
            const newCart = await cartManager.createCart(); // Usar instancia singleton
            socket.emit('cartCreated', newCart); // Enviar solo al creador
            console.log(`Carrito creado vía socket: ${newCart._id}`);
        } catch (error) {
            console.error("Error socket 'createCart':", error);
            socket.emit('error', { message: `Error creando carrito: ${error.message}` });
        }
    });

    socket.on('addToCart', async (data) => {
        try {
            const { cartId, productId } = data;
            if (!cartId || !productId) throw new Error("Se requiere cartId y productId");

            // Unir al socket a la sala del carrito para futuras actualizaciones
            socket.join(cartId);
            console.log(`Socket ${socket.id} unido a la sala ${cartId}`);

            await cartManager.addProductToCart(cartId, productId); // Usar instancia singleton
            const updatedCart = await cartManager.getCartById(cartId);

            io.to(cartId).emit('cartUpdated', updatedCart); // Emitir solo a la sala del carrito
            console.log(`Producto ${productId} agregado a carrito ${cartId} vía socket`);

        } catch (error) {
            console.error("Error socket 'addToCart':", error);
            socket.emit('error', { message: `Error agregando al carrito: ${error.message}` });
        }
    });

    socket.on('decrementFromCart', async (data) => {
      try {
        const { cartId, productId } = data;
        if (!cartId || !productId) throw new Error("Se requiere cartId y productId");
        const updatedCart = await cartManager.decrementProductQuantity(cartId, productId); // Usar instancia singleton
        io.to(cartId).emit('cartUpdated', updatedCart); // Emitir a la sala del carrito
        console.log(`Producto ${productId} decrementado del carrito ${cartId} vía socket`);
      } catch (error) {
        console.error("Error socket 'decrementFromCart':", error);
        socket.emit('error', { message: `Error decrementando del carrito: ${error.message}` });
      }
    });

    socket.on('finalizeCart', async (data) => {
      try {
        const { cartId } = data;
        if (!cartId) throw new Error("Se requiere cartId");
        const updatedCart = await cartManager.finalizeCart(cartId); // Usar instancia singleton
        io.to(cartId).emit('cartUpdated', updatedCart); // Emitir a la sala del carrito
        io.to(cartId).emit('cartFinalized', { cartId: updatedCart._id });
        console.log(`Carrito ${cartId} finalizado vía socket`);
      } catch (error) {
        console.error("Error socket 'finalizeCart':", error);
        socket.emit('error', { message: `Error finalizando carrito: ${error.message}` });
      }
    });


    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// --- FIN Lógica de Socket.IO ---


app.use((req, res, next) => {
    req.io = io;
    next();
});

// Montar routers
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use('/', viewsRouter);


// Iniciar el servidor
httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});