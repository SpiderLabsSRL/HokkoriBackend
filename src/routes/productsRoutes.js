const express = require("express");
const router = express.Router();
const productsController = require("../controllers/productsController");

// Rutas de Categorías
router.get("/products/categories", productsController.getCategories);
router.post("/products/categories", productsController.createCategory);
router.put("/products/categories/:id", productsController.updateCategory);
router.patch("/products/categories/:id/toggle-status", productsController.toggleCategoryStatus);

// Rutas de Productos
router.get("/products/products", productsController.getProducts);
router.get("/products/products/active", productsController.getActiveProducts);
router.post("/products/products", productsController.createProduct);
router.put("/products/products/:id", productsController.updateProduct);
router.patch("/products/products/:id/toggle-status", productsController.toggleProductStatus);
router.delete("/products/products/:id", productsController.deleteProduct);

// Nuevas rutas para órdenes y cupones
router.post("/orders", productsController.createOrder);
router.get("/coupons/validate/:code", productsController.validateCoupon);

module.exports = router;