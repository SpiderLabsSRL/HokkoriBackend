const express = require("express");
const router = express.Router();
const movimientosController = require("../controllers/movimientosController");

// Rutas para movimientos de caja
router.get("/movimientos/caja/estado", movimientosController.getEstadoCaja);
router.get("/movimientos/caja/saldo", movimientosController.getSaldoCaja);
router.get("/movimientos/historial/dia", movimientosController.getHistorialDelDia);
router.post("/movimientos/registrar", movimientosController.registrarMovimiento);

module.exports = router;