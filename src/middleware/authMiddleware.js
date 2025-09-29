const jwt = require("jsonwebtoken");
const db = require("../../db");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const authenticate = async (req, res, next) => {
  try {
    // 1. Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is missing",
      });
    }

    // 2. Verificar formato del header
    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Authorization header format should be: Bearer <token>",
      });
    }

    const token = tokenParts[1];

    // 3. Verificar que el token no esté vacío
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing",
      });
    }

    // 4. Verificar y decodificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // 5. Buscar usuario en la base de datos
    const userQuery = `
      SELECT 
        idempleado,
        nombres,
        apellidos,
        usuario,
        rol,
        estado
      FROM empleados 
      WHERE idempleado = $1 AND estado = 0
    `;
    
    const userResult = await db.query(userQuery, [decoded.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado o inactivo",
      });
    }

    const user = userResult.rows[0];

    // 6. Adjuntar información del usuario al request
    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    let errorMessage = "Authentication failed";
    if (error.name === "TokenExpiredError") {
      errorMessage = "Token expired";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid token format";
    }

    return res.status(401).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const authorize = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!requiredRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};