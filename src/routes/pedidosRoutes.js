const express = require("express");
const router = express.Router();
const pedidosController = require("../controllers/pedidosController");

// Rutas para pedidos
router.get("/pedidos", pedidosController.getPedidos);
router.get("/pedidos/:id", pedidosController.getPedidoById);
router.post("/pedidos", pedidosController.createPedido);
router.put("/pedidos/:id", pedidosController.updatePedido);
router.delete("/pedidos/:id", pedidosController.deletePedido);

// Rutas para items de pedidos
router.get("/pedidos/:id/items", pedidosController.getPedidoItems);
router.post("/pedidos/:id/items", pedidosController.createPedidoItems);
router.put("/pedidos/:id/items", pedidosController.updatePedidoItems);

// Rutas para acciones específicas
router.post("/pedidos/:id/pay", pedidosController.processPayment);
router.patch("/pedidos/:id/deliver", pedidosController.markAsDelivered);

// Rutas para cupones (añadidas aquí)
router.get("/cupones", pedidosController.getCupones);
router.get("/cupones/:id", pedidosController.getCuponById);

module.exports = router;