const cajaService = require("../services/cajaService");

const getCajaActual = async (req, res) => {
  try {
    const caja = await cajaService.getCajaActual();
    if (!caja) {
      return res.status(404).json({ message: "No hay caja abierta" });
    }
    res.json(caja);
  } catch (error) {
    console.error("Error en getCajaActual:", error);
    res.status(500).json({ message: error.message });
  }
};

const getMovimientosCaja = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipo } = req.query;
    const movimientos = await cajaService.getMovimientosCaja({
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
      tipo
    });
    res.json(movimientos);
  } catch (error) {
    console.error("Error en getMovimientosCaja:", error);
    res.status(500).json({ message: error.message });
  }
};

const getTotalEnCaja = async (req, res) => {
  try {
    const total = await cajaService.getTotalEnCaja();
    res.json({ total: total.toString() });
  } catch (error) {
    console.error("Error en getTotalEnCaja:", error);
    res.status(500).json({ message: error.message });
  }
};

const getTotalesPorTipo = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const totales = await cajaService.getTotalesPorTipo({
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined
    });
    res.json({
      ingresos: totales.ingresos.toString(),
      egresos: totales.egresos.toString()
    });
  } catch (error) {
    console.error("Error en getTotalesPorTipo:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCajaActual,
  getMovimientosCaja,
  getTotalEnCaja,
  getTotalesPorTipo
};