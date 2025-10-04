// src/routes/costosRoutes.js
const express = require("express");
const router = express.Router();
const costosController = require("../controllers/costosController");

// Ruta para obtener todos los productos activos
router.get("/costos/products", costosController.getProducts);

// Ruta para obtener las categorías de productos
router.get("/costos/products/categories", costosController.getProductCategories);

// Ruta para obtener el análisis de ventas
router.post("/costos/sales-analysis", costosController.getSalesAnalysis);

module.exports = router;