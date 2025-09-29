const express = require("express");
const router = express.Router();
const cajaController = require("../controllers/cajaController");

// Ruta para obtener la caja actual
router.get("/caja/actual", cajaController.getCajaActual);

// Ruta para obtener movimientos de caja
router.get("/caja/movimientos", cajaController.getMovimientosCaja);

// Ruta para obtener el total en caja
router.get("/caja/total", cajaController.getTotalEnCaja);

// Ruta para obtener totales por tipo
router.get("/caja/totales", cajaController.getTotalesPorTipo);

module.exports = router;