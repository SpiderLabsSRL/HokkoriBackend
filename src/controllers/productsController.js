const productsService = require("../services/productsService");

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
      const newProduct = await productsService.createProduct({
        nombre,
        descripcion,
        categoria_id: parseInt(categoria_id),
        precio: parseFloat(precio),
        imagen
      });
      res.status(201).json(newProduct);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, categoria_id, precio, imagen } = req.body;
      const updatedProduct = await productsService.updateProduct(parseInt(id), {
        nombre,
        descripcion,
        categoria_id: parseInt(categoria_id),
        precio: parseFloat(precio),
        imagen
      });
      res.json(updatedProduct);
    } catch (error) {
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
  }
};

module.exports = productsController;