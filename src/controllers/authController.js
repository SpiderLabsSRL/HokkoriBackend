const authService = require("../services/authService");

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar campos requeridos
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Usuario y contraseña son requeridos",
      });
    }

    const result = await authService.authenticateUser(username, password);

    if (result.success) {
      // Asegurar que el rol sea uno de los valores permitidos
      const validRole = result.user.rol === 'Administrador' ? 'Administrador' : 'Ayudante';
      
      res.json({
        success: true,
        message: "Inicio de sesión exitoso",
        user: {
          ...result.user,
          rol: validRole
        },
        token: result.token,
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Error en login controller:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

const logout = async (req, res) => {
  try {
    // En una implementación más avanzada, podrías invalidar el token
    res.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    console.error("Error en logout controller:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

const verify = async (req, res) => {
  try {
    // Asegurar que el rol sea uno de los valores permitidos
    const validRole = req.user.rol === 'Administrador' ? 'Administrador' : 'Ayudante';
    
    res.json({
      success: true,
      user: {
        idempleado: req.user.idempleado,
        nombres: req.user.nombres,
        apellidos: req.user.apellidos,
        usuario: req.user.usuario,
        rol: validRole,
      },
    });
  } catch (error) {
    console.error("Error en verify controller:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

module.exports = {
  login,
  logout,
  verify,
};