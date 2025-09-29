const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

// Rutas de autenticación
router.post("/auth/login", authController.login);
router.post("/auth/logout", authController.logout);
router.get("/auth/verify", authenticate, authController.verify);

module.exports = router;