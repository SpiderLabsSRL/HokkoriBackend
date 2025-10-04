const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/ventasController");

// Rutas para ventas
router.get("/ventas/ventas", ventasController.getVentas);
router.get("/ventas/ventas/hoy", ventasController.getVentasHoy);
router.get("/ventas/ventas/hoy-empleado", ventasController.getVentasHoyEmpleado);
router.get("/ventas/ventas/totales", ventasController.getTotalesVentas);

module.exports = router;