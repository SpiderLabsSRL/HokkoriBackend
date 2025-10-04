// src/services/usersService.js
const { query } = require("../../db");
const bcrypt = require("bcrypt");

const getAllUsers = async () => {
  try {
    const result = await query(`
      SELECT 
        idempleado,
        nombres,
        apellidos,
        rol,
        usuario,
        estado
      FROM empleados 
      WHERE estado IN (0, 1)
      ORDER BY idempleado DESC
    `);
    
    return result.rows;
  } catch (error) {
    console.error("Error en getAllUsers:", error);
    throw new Error("Error al obtener los usuarios de la base de datos");
  }
};

const createUser = async (userData) => {
  const { nombres, apellidos, rol, usuario, contraseña } = userData;
  
  try {
    // Verificar si el usuario ya existe
    const existingUser = await query(
      "SELECT idempleado FROM empleados WHERE usuario = $1 AND estado IN (0, 1)",
      [usuario]
    );
    
    if (existingUser.rows.length > 0) {
      throw new Error("Ya existe un usuario con ese nombre de usuario");
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contraseña || usuario, 10);

    const result = await query(
      `INSERT INTO empleados 
       (nombres, apellidos, rol, usuario, contraseña, estado) 
       VALUES ($1, $2, $3, $4, $5, 0) 
       RETURNING idempleado, nombres, apellidos, rol, usuario, estado`,
      [nombres, apellidos, rol, usuario, hashedPassword]
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error en createUser:", error);
    throw error;
  }
};

const updateUser = async (id, userData) => {
  const { nombres, apellidos, rol, usuario, contraseña } = userData;
  
  try {
    // Verificar si el usuario existe
    const existingUser = await query(
      "SELECT idempleado FROM empleados WHERE idempleado = $1 AND estado IN (0, 1)",
      [id]
    );
    
    if (existingUser.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    // Verificar si el nuevo username ya existe (excluyendo el usuario actual)
    const duplicateUser = await query(
      "SELECT idempleado FROM empleados WHERE usuario = $1 AND idempleado != $2 AND estado IN (0, 1)",
      [usuario, id]
    );
    
    if (duplicateUser.rows.length > 0) {
      throw new Error("Ya existe un usuario con ese nombre de usuario");
    }

    let updateQuery;
    let queryParams;

    if (contraseña) {
      // Si se proporciona una nueva contraseña, hashearla y actualizar
      const hashedPassword = await bcrypt.hash(contraseña, 10);
      updateQuery = `
        UPDATE empleados 
        SET nombres = $1, apellidos = $2, rol = $3, usuario = $4, contraseña = $5
        WHERE idempleado = $6
        RETURNING idempleado, nombres, apellidos, rol, usuario, estado
      `;
      queryParams = [nombres, apellidos, rol, usuario, hashedPassword, id];
    } else {
      // Si no se proporciona contraseña, no actualizarla
      updateQuery = `
        UPDATE empleados 
        SET nombres = $1, apellidos = $2, rol = $3, usuario = $4
        WHERE idempleado = $5
        RETURNING idempleado, nombres, apellidos, rol, usuario, estado
      `;
      queryParams = [nombres, apellidos, rol, usuario, id];
    }

    const result = await query(updateQuery, queryParams);
    
    if (result.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error en updateUser:", error);
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    // Verificar si el usuario existe
    const existingUser = await query(
      "SELECT idempleado FROM empleados WHERE idempleado = $1 AND estado IN (0, 1)",
      [id]
    );
    
    if (existingUser.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    // Soft delete - marcar como eliminado (estado = 2)
    const result = await query(
      "UPDATE empleados SET estado = 2 WHERE idempleado = $1 RETURNING idempleado",
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error("No se pudo eliminar el usuario");
    }
  } catch (error) {
    console.error("Error en deleteUser:", error);
    throw error;
  }
};

const toggleUserStatus = async (id) => {
  try {
    // Verificar si el usuario existe
    const existingUser = await query(
      "SELECT idempleado, estado FROM empleados WHERE idempleado = $1 AND estado IN (0, 1)",
      [id]
    );
    
    if (existingUser.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    const currentState = existingUser.rows[0].estado;
    const newState = currentState === 0 ? 1 : 0;

    const result = await query(
      "UPDATE empleados SET estado = $1 WHERE idempleado = $2 RETURNING idempleado, nombres, apellidos, rol, usuario, estado",
      [newState, id]
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error en toggleUserStatus:", error);
    throw error;
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
};