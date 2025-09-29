const { query } = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

const authenticateUser = async (username, password) => {
  try {
    // Buscar empleado por usuario
    const userQuery = `
      SELECT 
        idempleado,
        nombres,
        apellidos,
        usuario,
        contraseña,
        rol,
        estado
      FROM empleados 
      WHERE usuario = $1
    `;
    
    const userResult = await query(userQuery, [username]);
    
    if (userResult.rows.length === 0) {
      return {
        success: false,
        message: "Usuario no encontrado",
      };
    }

    const user = userResult.rows[0];

    // Verificar si el usuario está inactivo
    if (user.estado !== 0) {
      return {
        success: false,
        message: "Usuario inactivo",
      };
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.contraseña);
    
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Contraseña incorrecta",
      };
    }

    // Asegurar que el rol sea uno de los valores permitidos
    const validRole = user.rol === 'Administrador' ? 'Administrador' : 'Ayudante';

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user.idempleado,
        username: user.usuario,
        role: validRole,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Preparar datos del usuario para la respuesta
    const userData = {
      idempleado: user.idempleado,
      nombres: user.nombres,
      apellidos: user.apellidos,
      usuario: user.usuario,
      rol: validRole,
    };

    return {
      success: true,
      user: userData,
      token: token,
    };
  } catch (error) {
    console.error("Error en authService:", error);
    throw new Error("Error al autenticar usuario");
  }
};

module.exports = {
  authenticateUser,
};