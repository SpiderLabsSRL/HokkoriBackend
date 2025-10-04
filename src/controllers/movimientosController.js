const movimientosService = require("../services/movimientosService");

const getEstadoCaja = async (req, res) => {
  try {
    const empleadoId = 1; // Cambiar esto según tu lógica de sesión
    const caja = await movimientosService.getEstadoCaja(empleadoId);
    res.json(caja);
  } catch (error) {
    console.error("Error en getEstadoCaja:", error);
    res.status(500).json({ error: error.message });
  }
};

const getSaldoCaja = async (req, res) => {
  try {
    const empleadoId = 1; // Cambiar esto según tu lógica de sesión
    const saldo = await movimientosService.getSaldoCaja(empleadoId);
    res.json({ saldo: saldo.toString() });
  } catch (error) {
    console.error("Error en getSaldoCaja:", error);
    res.status(500).json({ error: error.message });
  }
};

const getHistorialDelDia = async (req, res) => {
  try {
    const empleadoId = 1; // Cambiar esto según tu lógica de sesión
    const historial = await movimientosService.getHistorialDelDia(empleadoId);
    res.json(historial);
  } catch (error) {
    console.error("Error en getHistorialDelDia:", error);
    res.status(500).json({ error: error.message });
  }
};

const registrarMovimiento = async (req, res) => {
  try {
    const { tipo, monto, descripcion } = req.body;
    const empleadoId = 1; // Cambiar esto según tu lógica de sesión

    if (!tipo || !monto || !descripcion) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    if (parseFloat(monto) <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a 0" });
    }

    const movimiento = await movimientosService.registrarMovimiento(
      tipo,
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
    const { monto, descripcion } = req.body;
    const empleadoId = 1; // Cambiar esto según tu lógica de sesión

    if (!monto || !descripcion) {
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
    const { monto, descripcion } = req.body;
    const empleadoId = 1; // Cambiar esto según tu lógica de sesión

    if (!monto || !descripcion) {
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

module.exports = {
  getEstadoCaja,
  getSaldoCaja,
  getHistorialDelDia,
  registrarMovimiento,
  aperturaCaja,
  cierreCaja,
};