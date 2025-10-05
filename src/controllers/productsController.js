const productsService = require("../services/productsService");

// Constantes para validación
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const productsController = {
  // Categorías
  getCategories: async (req, res) => {
    try {
      const categories = await productsService.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createCategory: async (req, res) => {
    try {
      const { nombre } = req.body;
      const newCategory = await productsService.createCategory(nombre);
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre } = req.body;
      const updatedCategory = await productsService.updateCategory(parseInt(id), nombre);
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  toggleCategoryStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedCategory = await productsService.toggleCategoryStatus(parseInt(id));
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Productos
  getProducts: async (req, res) => {
    try {
      const products = await productsService.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getActiveProducts: async (req, res) => {
    try {
      const products = await productsService.getActiveProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createProduct: async (req, res) => {
    try {
      const { nombre, descripcion, categoria_id, precio, imagen } = req.body;
      
      // Validar tamaño de imagen en el backend
      if (imagen && imagen.length > MAX_IMAGE_SIZE) {
        return res.status(400).json({ 
          error: "La imagen es demasiado grande. Tamaño máximo permitido: 2MB" 
        });
      }

      const newProduct = await productsService.createProduct({
        nombre,
        descripcion,
        categoria_id: parseInt(categoria_id),
        precio: parseFloat(precio),
        imagen
      });
      res.status(201).json(newProduct);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: error.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, categoria_id, precio, imagen } = req.body;

      // Validar tamaño de imagen en el backend
      if (imagen && imagen.length > MAX_IMAGE_SIZE) {
        return res.status(400).json({ 
          error: "La imagen es demasiado grande. Tamaño máximo permitido: 2MB" 
        });
      }

      const updatedProduct = await productsService.updateProduct(parseInt(id), {
        nombre,
        descripcion,
        categoria_id: parseInt(categoria_id),
        precio: parseFloat(precio),
        imagen
      });
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: error.message });
    }
  },

  toggleProductStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedProduct = await productsService.toggleProductStatus(parseInt(id));
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;
      await productsService.deleteProduct(parseInt(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Nuevo método para crear órdenes
  createOrder: async (req, res) => {
    try {
      const {
        customerName,
        phoneNumber,
        orderType,
        notes,
        items,
        total,
        status,
        paymentStatus,
        couponCode,
        discountAmount
      } = req.body;

      // Validaciones básicas
      if (!customerName || !customerName.trim()) {
        return res.status(400).json({ error: "El nombre del cliente es requerido" });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ error: "El pedido debe contener al menos un producto" });
      }

      const newOrder = await productsService.createOrder({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber || '',
        orderType,
        notes: notes || '',
        items,
        total: parseFloat(total),
        status,
        paymentStatus,
        couponCode,
        discountAmount: discountAmount ? parseFloat(discountAmount) : 0
      });
      
      res.status(201).json(newOrder);
    } catch (error) {
      console.error("Error in createOrder controller:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Nuevo método para validar cupones
  validateCoupon: async (req, res) => {
    try {
      const { code } = req.params;
      const validation = await productsService.validateCoupon(code);
      res.json(validation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = productsController;