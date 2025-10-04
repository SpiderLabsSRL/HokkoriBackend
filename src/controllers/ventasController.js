const ventasService = require("../services/ventasService");

const getVentas = async (req, res) => {
  try {
    const { fecha, fechaInicio, fechaFin } = req.query;
    
    let ventas;
    
    if (fecha) {
      // Filtrar por día específico
      ventas = await ventasService.getVentasPorFecha(fecha);
    } else if (fechaInicio && fechaFin) {
      // Filtrar por rango de fechas
      ventas = await ventasService.getVentasPorRango(fechaInicio, fechaFin);
    } else {
      // Obtener todas las ventas
      ventas = await ventasService.getAllVentas();
    }
    
    res.json(ventas);
  } catch (error) {
    console.error("Error en getVentas:", error);
    res.status(500).json({ 
      error: "Error al obtener las ventas",
      detalles: error.message 
    });
  }
};

const getVentasHoy = async (req, res) => {
  try {
    const { empleadoId } = req.query;
    
    let ventas;
    if (empleadoId) {
      ventas = await ventasService.getVentasHoyPorEmpleado(parseInt(empleadoId));
    } else {
      ventas = await ventasService.getVentasHoy();
    }
    
    res.json(ventas);
  } catch (error) {
    console.error("Error en getVentasHoy:", error);
    res.status(500).json({ 
      error: "Error al obtener las ventas del día",
      detalles: error.message 
    });
  }
};

const getTotalesVentas = async (req, res) => {
  try {
    const { fecha, fechaInicio, fechaFin } = req.query;
    
    let totales;
    
    if (fecha) {
      totales = await ventasService.getTotalesPorFecha(fecha);
    } else if (fechaInicio && fechaFin) {
      totales = await ventasService.getTotalesPorRango(fechaInicio, fechaFin);
    } else {
      totales = await ventasService.getTotalesGenerales();
    }
    
    res.json(totales);
  } catch (error) {
    console.error("Error en getTotalesVentas:", error);
    res.status(500).json({ 
      error: "Error al obtener los totales de ventas",
      detalles: error.message 
    });
  }
};

module.exports = {
  getVentas,
  getVentasHoy,
  getTotalesVentas
};