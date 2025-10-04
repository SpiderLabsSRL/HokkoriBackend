// src/services/costosService.js
const { query } = require("../../db");

const getActiveProducts = async () => {
  try {
    const sql = `
      SELECT 
        p.idproducto,
        p.nombre,
        p.precio,
        p.categoria_id,
        p.imagen,
        c.nombre as nombre_categoria,
        p.estado
      FROM productos p
      INNER JOIN categorias c ON p.categoria_id = c.idcategoria
      WHERE p.estado IN (0, 1)
      ORDER BY c.nombre, p.nombre
    `;
    
    const result = await query(sql);
    
    // Convertir imágenes a base64 como en el ejemplo que funciona
    const productsWithBase64 = result.rows.map(product => {
      if (product.imagen) {
        const base64Image = product.imagen.toString('base64');
        return {
          ...product,
          imagen: base64Image
        };
      }
      return product;
    });

    return productsWithBase64;
  } catch (error) {
    console.error("Error en getActiveProducts:", error);
    throw error;
  }
};

const getProductCategories = async () => {
  try {
    const sql = `
      SELECT DISTINCT c.nombre
      FROM categorias c
      INNER JOIN productos p ON c.idcategoria = p.categoria_id
      WHERE p.estado IN (0, 1)
      ORDER BY c.nombre
    `;
    
    const result = await query(sql);
    return result.rows.map(row => row.nombre);
  } catch (error) {
    console.error("Error en getProductCategories:", error);
    throw error;
  }
};

const getSalesAnalysis = async (productIds, dateFrom, dateTo) => {
  try {
    const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
    const params = [...productIds, dateFrom, dateTo];
    
    const sql = `
      SELECT 
        p.idproducto,
        p.nombre,
        p.precio,
        c.nombre as categoria,
        COALESCE(SUM(dp.cantidad), 0) as cantidad_vendida,
        COALESCE(SUM(dp.subtotal_linea), 0) as total_ventas
      FROM productos p
      INNER JOIN categorias c ON p.categoria_id = c.idcategoria
      LEFT JOIN detalle_pedido dp ON p.idproducto = dp.producto_id
      LEFT JOIN pedidos ped ON dp.pedido_id = ped.idpedido
      LEFT JOIN ventas v ON ped.idpedido = v.pedido_id
      WHERE p.idproducto IN (${placeholders})
        AND DATE(ped.fecha_hora) >= $${productIds.length + 1}::DATE
        AND DATE(ped.fecha_hora) <= $${productIds.length + 2}::DATE
        AND ped.estado IN (1, 2)
        AND v.idventa IS NOT NULL
      GROUP BY p.idproducto, p.nombre, p.precio, c.nombre
      ORDER BY c.nombre, p.nombre
    `;
    
    console.log("SQL Query para análisis de ventas:", sql);
    console.log("Parámetros:", params);
    
    const result = await query(sql, params);
    console.log("Resultado del análisis:", result.rows);
    
    return result.rows;
  } catch (error) {
    console.error("Error en getSalesAnalysis:", error);
    console.error("Detalles del error:", error.message);
    throw error;
  }
};

const getProductImage = async (productId) => {
  try {
    const sql = `
      SELECT imagen 
      FROM productos 
      WHERE idproducto = $1 AND estado IN (0, 1)
    `;
    
    const result = await query(sql, [productId]);
    
    if (result.rows.length === 0 || !result.rows[0].imagen) {
      return null;
    }
    
    // Convertir a base64 para consistencia
    const base64Image = result.rows[0].imagen.toString('base64');
    return base64Image;
  } catch (error) {
    console.error("Error en getProductImage:", error);
    throw error;
  }
};

module.exports = {
  getActiveProducts,
  getProductCategories,
  getSalesAnalysis,
  getProductImage
};