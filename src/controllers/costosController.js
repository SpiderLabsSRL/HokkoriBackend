// src/controllers/costosController.js
const costosService = require("../services/costosService");

const getProducts = async (req, res) => {
  try {
    const products = await costosService.getActiveProducts();
    res.json(products);
  } catch (error) {
    console.error("Error en getProducts:", error);
    res.status(500).json({ 
      error: "Error al obtener los productos",
      details: error.message 
    });
  }
};

const getProductCategories = async (req, res) => {
  try {
    const categories = await costosService.getProductCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error en getProductCategories:", error);
    res.status(500).json({ 
      error: "Error al obtener las categorías",
      details: error.message 
    });
  }
};

const getSalesAnalysis = async (req, res) => {
  try {
    const { productIds, dateFrom, dateTo } = req.body;
    
    console.log("Received request:", { productIds, dateFrom, dateTo });
    
    // Validaciones
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "Se deben seleccionar productos" });
    }
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: "Se debe especificar un rango de fechas" });
    }
    
    // Validar que las fechas sean válidas
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Las fechas proporcionadas no son válidas" });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({ error: "La fecha de inicio no puede ser mayor a la fecha fin" });
    }
    
    const salesData = await costosService.getSalesAnalysis(
      productIds,
      dateFrom,
      dateTo
    );
    
    console.log("Sales data retrieved:", salesData);
    
    res.json(salesData);
  } catch (error) {
    console.error("Error en getSalesAnalysis:", error);
    res.status(500).json({ 
      error: "Error al generar el análisis de ventas",
      details: error.message,
      sqlError: error.code
    });
  }
};

module.exports = {
  getProducts,
  getProductCategories,
  getSalesAnalysis
};