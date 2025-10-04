// src/routes/usersRoutes.js
const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");

// Rutas para usuarios
router.get("/users", usersController.getUsers);
router.post("/users", usersController.createUser);
router.put("/users/:id", usersController.updateUser);
router.delete("/users/:id", usersController.deleteUser);
router.patch("/users/:id/update-status", usersController.toggleUserStatus);

module.exports = router;