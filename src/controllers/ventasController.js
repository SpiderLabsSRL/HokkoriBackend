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
      // Por defecto: obtener ventas del día de hoy
      ventas = await ventasService.getVentasHoy();
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
    const ventas = await ventasService.getVentasHoy();
    res.json(ventas);
  } catch (error) {
    console.error("Error en getVentasHoy:", error);
    res.status(500).json({ 
      error: "Error al obtener las ventas del día",
      detalles: error.message 
    });
  }
};

const getVentasHoyEmpleado = async (req, res) => {
  try {
    const { empleadoId } = req.query;
    
    if (!empleadoId) {
      return res.status(400).json({ 
        error: "Se requiere el ID del empleado" 
      });
    }
    
    const ventas = await ventasService.getVentasHoyPorEmpleado(parseInt(empleadoId));
    res.json(ventas);
  } catch (error) {
    console.error("Error en getVentasHoyEmpleado:", error);
    res.status(500).json({ 
      error: "Error al obtener las ventas del día del empleado",
      detalles: error.message 
    });
  }
};

const getTotalesVentas = async (req, res) => {
  try {
    const { fecha, fechaInicio, fechaFin, empleadoId } = req.query;
    
    let totales;
    let totalesHoy;
    
    if (empleadoId) {
      // Para empleados: obtener totales específicos del empleado
      if (fecha) {
        totales = await ventasService.getTotalesPorFechaYEmpleado(fecha, parseInt(empleadoId));
      } else if (fechaInicio && fechaFin) {
        totales = await ventasService.getTotalesPorRangoYEmpleado(fechaInicio, fechaFin, parseInt(empleadoId));
      } else {
        totalesHoy = await ventasService.getTotalesHoyPorEmpleado(parseInt(empleadoId));
        totales = {
          total_general: totalesHoy.total_general_hoy,
          total_efectivo: totalesHoy.total_efectivo_hoy,
          total_qr: totalesHoy.total_qr_hoy,
          total_general_hoy: totalesHoy.total_general_hoy
        };
      }
    } else {
      // Para admin: obtener totales generales
      if (fecha) {
        totales = await ventasService.getTotalesPorFecha(fecha);
      } else if (fechaInicio && fechaFin) {
        totales = await ventasService.getTotalesPorRango(fechaInicio, fechaFin);
      } else {
        // Por defecto: totales del día de hoy
        totalesHoy = await ventasService.getTotalesHoy();
        totales = {
          total_general: totalesHoy.total_general_hoy,
          total_efectivo: totalesHoy.total_efectivo_hoy,
          total_qr: totalesHoy.total_qr_hoy,
          total_general_hoy: totalesHoy.total_general_hoy
        };
      }
    }
    
    // Combinar los resultados
    const resultado = {
      totalGeneral: parseFloat(totales.total_general) || 0,
      totalEfectivo: parseFloat(totales.total_efectivo) || 0,
      totalQR: parseFloat(totales.total_qr) || 0,
      totalGeneralHoy: parseFloat(totales.total_general_hoy) || 0
    };
    
    res.json(resultado);
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
  getVentasHoyEmpleado,
  getTotalesVentas
};