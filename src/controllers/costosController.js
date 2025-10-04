// src/controllers/costosController.js
const costosService = require("../services/costosService");

const getProducts = async (req, res) => {
  try {
    console.log("Obteniendo productos para análisis de costos...");
    const products = await costosService.getActiveProducts();
    
    console.log(`Se obtuvieron ${products.length} productos`);
    
    // Los productos ya vienen con las imágenes en base64 desde el service
    const productsWithImageUrls = products.map(product => ({
      ...product,
      // Mantener la imagen en base64 para el frontend
      imagen_base64: product.imagen ? `data:image/jpeg;base64,${product.imagen}` : null
    }));
    
    res.json(productsWithImageUrls);
  } catch (error) {
    console.error("Error en getProducts:", error);
    res.status(500).json({ 
      error: "Error al obtener los productos",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const getProductCategories = async (req, res) => {
  try {
    console.log("Obteniendo categorías de productos...");
    const categories = await costosService.getProductCategories();
    
    console.log(`Se obtuvieron ${categories.length} categorías:`, categories);
    
    res.json(categories);
  } catch (error) {
    console.error("Error en getProductCategories:", error);
    res.status(500).json({ 
      error: "Error al obtener las categorías",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const getSalesAnalysis = async (req, res) => {
  try {
    const { productIds, dateFrom, dateTo } = req.body;
    
    console.log("Solicitud de análisis de ventas recibida:", {
      productIds,
      dateFrom,
      dateTo
    });
    
    // Validaciones completas
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      console.error("Error: No se seleccionaron productos");
      return res.status(400).json({ 
        error: "Se deben seleccionar productos para el análisis",
        code: "NO_PRODUCTS_SELECTED"
      });
    }
    
    if (!dateFrom || !dateTo) {
      console.error("Error: Fechas no proporcionadas");
      return res.status(400).json({ 
        error: "Se debe especificar un rango de fechas válido",
        code: "INVALID_DATE_RANGE"
      });
    }
    
    // Validar que las fechas sean válidas
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("Error: Fechas inválidas");
      return res.status(400).json({ 
        error: "Las fechas proporcionadas no son válidas",
        code: "INVALID_DATES"
      });
    }
    
    if (startDate > endDate) {
      console.error("Error: Fecha inicio mayor que fecha fin");
      return res.status(400).json({ 
        error: "La fecha de inicio no puede ser mayor a la fecha fin",
        code: "DATE_RANGE_INVALID"
      });
    }
    
    console.log("Generando análisis de ventas...");
    const salesData = await costosService.getSalesAnalysis(
      productIds,
      dateFrom,
      dateTo
    );
    
    console.log(`Análisis completado. ${salesData.length} productos con datos de ventas`);
    
    res.json(salesData);
  } catch (error) {
    console.error("Error en getSalesAnalysis:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ 
      error: "Error al generar el análisis de ventas",
      details: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const getProductImage = async (req, res) => {
  try {
    const { productId } = req.params;
    
    console.log(`Solicitando imagen para producto ID: ${productId}`);
    
    if (!productId || isNaN(parseInt(productId))) {
      return res.status(400).json({ 
        error: "ID de producto requerido y debe ser un número válido",
        code: "INVALID_PRODUCT_ID"
      });
    }
    
    const imageBase64 = await costosService.getProductImage(parseInt(productId));
    
    if (!imageBase64) {
      console.log(`Imagen no encontrada para producto ${productId}`);
      return res.status(404).json({ 
        error: "Imagen no encontrada para el producto especificado",
        code: "IMAGE_NOT_FOUND"
      });
    }
    
    console.log(`Imagen encontrada para producto ${productId}, tamaño: ${imageBase64.length} bytes en base64`);
    
    // Devolver como JSON con la imagen en base64
    res.json({
      productId: parseInt(productId),
      image: `data:image/jpeg;base64,${imageBase64}`,
      format: 'base64',
      size: imageBase64.length
    });
    
  } catch (error) {
    console.error("Error en getProductImage:", error);
    res.status(500).json({ 
      error: "Error al obtener la imagen del producto",
      details: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getProducts,
  getProductCategories,
  getSalesAnalysis,
  getProductImage
};