// src/controllers/usersController.js
const usersService = require("../services/usersService");

const getUsers = async (req, res) => {
  try {
    const users = await usersService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error en getUsers:", error);
    res.status(500).json({ 
      error: "Error al obtener los usuarios",
      details: error.message 
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { nombres, apellidos, rol, usuario, contraseña } = req.body;
    
    if (!nombres || !apellidos || !rol || !usuario) {
      return res.status(400).json({ 
        error: "Todos los campos son requeridos" 
      });
    }

    const newUser = await usersService.createUser({
      nombres,
      apellidos,
      rol,
      usuario,
      contraseña,
    });
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error en createUser:", error);
    
    if (error.message.includes("ya existe")) {
      return res.status(409).json({ 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      error: "Error al crear el usuario",
      details: error.message 
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, rol, usuario, contraseña } = req.body;
    
    if (!nombres || !apellidos || !rol || !usuario) {
      return res.status(400).json({ 
        error: "Todos los campos son requeridos" 
      });
    }

    const updatedUser = await usersService.updateUser(parseInt(id), {
      nombres,
      apellidos,
      rol,
      usuario,
      contraseña,
    });
    
    res.json(updatedUser);
  } catch (error) {
    console.error("Error en updateUser:", error);
    
    if (error.message.includes("No encontrado")) {
      return res.status(404).json({ 
        error: error.message 
      });
    }
    
    if (error.message.includes("ya existe")) {
      return res.status(409).json({ 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      error: "Error al actualizar el usuario",
      details: error.message 
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await usersService.deleteUser(parseInt(id));
    res.status(204).send();
  } catch (error) {
    console.error("Error en deleteUser:", error);
    
    if (error.message.includes("No encontrado")) {
      return res.status(404).json({ 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      error: "Error al eliminar el usuario",
      details: error.message 
    });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await usersService.toggleUserStatus(parseInt(id));
    res.json(updatedUser);
  } catch (error) {
    console.error("Error en toggleUserStatus:", error);
    
    if (error.message.includes("No encontrado")) {
      return res.status(404).json({ 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      error: "Error al cambiar el estado del usuario",
      details: error.message 
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
};