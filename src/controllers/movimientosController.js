const movimientosService = require("../services/movimientosService");

// Middleware para obtener el empleadoId del body de la petición
const getEmpleadoId = (req) => {
  return req.body.empleadoId || req.query.empleadoId;
};

const getEstadoCaja = async (req, res) => {
  try {
    const empleadoId = getEmpleadoId(req);
    if (!empleadoId) {
      return res.status(400).json({ error: "EmpleadoId es requerido" });
    }
    const caja = await movimientosService.getEstadoCaja();
    res.json(caja);
  } catch (error) {
    console.error("Error en getEstadoCaja:", error);
    res.status(500).json({ error: error.message });
  }
};

const getSaldoCaja = async (req, res) => {
  try {
    const empleadoId = getEmpleadoId(req);
    if (!empleadoId) {
      return res.status(400).json({ error: "EmpleadoId es requerido" });
    }
    const saldo = await movimientosService.getSaldoCaja();
    res.json({ saldo: saldo.toString() });
  } catch (error) {
    console.error("Error en getSaldoCaja:", error);
    res.status(500).json({ error: error.message });
  }
};

const getHistorialDelDia = async (req, res) => {
  try {
    const empleadoId = getEmpleadoId(req);
    if (!empleadoId) {
      return res.status(400).json({ error: "EmpleadoId es requerido" });
    }
    
    // Verificar si el usuario es administrador
    const esAdministrador = await movimientosService.esAdministrador(empleadoId);
    
    const historial = await movimientosService.getHistorialDelDia(empleadoId, esAdministrador);
    res.json(historial);
  } catch (error) {
    console.error("Error en getHistorialDelDia:", error);
    res.status(500).json({ error: error.message });
  }
};

const registrarMovimiento = async (req, res) => {
  try {
    const { tipo, monto, descripcion, empleadoId } = req.body;

    if (!tipo || !monto || !descripcion || !empleadoId) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    if (parseFloat(monto) <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a 0" });
    }

    // Validar tipos permitidos
    const tiposPermitidos = ['ingreso', 'egreso'];
    if (!tiposPermitidos.includes(tipo.toLowerCase())) {
      return res.status(400).json({ error: "Tipo de movimiento no válido" });
    }

    const movimiento = await movimientosService.registrarMovimiento(
      tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase(),
      parseFloat(monto),
      descripcion,
      empleadoId
    );

    res.status(201).json(movimiento);
  } catch (error) {
    console.error("Error en registrarMovimiento:", error);
    res.status(500).json({ error: error.message });
  }
};

const aperturaCaja = async (req, res) => {
  try {
    const { monto, descripcion, empleadoId } = req.body;

    if (!monto || !descripcion || !empleadoId) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    if (parseFloat(monto) <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a 0" });
    }

    const movimiento = await movimientosService.abrirCaja(
      parseFloat(monto),
      descripcion,
      empleadoId
    );

    res.status(201).json(movimiento);
  } catch (error) {
    console.error("Error en aperturaCaja:", error);
    res.status(500).json({ error: error.message });
  }
};

const cierreCaja = async (req, res) => {
  try {
    const { monto, descripcion, empleadoId } = req.body;

    if (!monto || !descripcion || !empleadoId) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    if (parseFloat(monto) <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a 0" });
    }

    const movimiento = await movimientosService.cerrarCaja(
      parseFloat(monto),
      descripcion,
      empleadoId
    );

    res.status(201).json(movimiento);
  } catch (error) {
    console.error("Error en cierreCaja:", error);
    res.status(500).json({ error: error.message });
  }
};

const getMontoAperturaSugerido = async (req, res) => {
  try {
    const empleadoId = getEmpleadoId(req);
    if (!empleadoId) {
      return res.status(400).json({ error: "EmpleadoId es requerido" });
    }
    const montoSugerido = await movimientosService.getMontoAperturaSugerido();
    res.json({ montoSugerido });
  } catch (error) {
    console.error("Error en getMontoAperturaSugerido:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getEstadoCaja,
  getSaldoCaja,
  getHistorialDelDia,
  registrarMovimiento,
  aperturaCaja,
  cierreCaja,
  getMontoAperturaSugerido
};