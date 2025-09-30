const express = require("express");
const router = express.Router();
const salesController = require("../controllers/salesController");

// Rutas de productos
router.get("/sales/products", salesController.getProducts);
router.get("/sales/categories", salesController.getCategories);
router.get("/sales/coupons", salesController.getCoupons);

// Ruta para procesar venta
router.post("/sales/process-sale", salesController.processSale);

// Ruta para verificar último registro de caja
router.get("/sales/cash-register/last/:employeeId", salesController.checkLastCashRegister);

module.exports = router;