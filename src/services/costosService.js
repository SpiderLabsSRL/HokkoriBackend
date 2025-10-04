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
        c.nombre as nombre_categoria,
        p.estado
      FROM productos p
      INNER JOIN categorias c ON p.categoria_id = c.idcategoria
      WHERE p.estado IN (0, 1)  -- Activos e inactivos (no eliminados)
      ORDER BY c.nombre, p.nombre
    `;
    
    const result = await query(sql);
    return result.rows;
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
    // Convertir las fechas al formato correcto para PostgreSQL
    const startDate = new Date(dateFrom).toISOString();
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999); // Hasta el final del día
    const endDateISO = endDate.toISOString();
    
    const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
    const params = [...productIds, startDate, endDateISO];
    
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
        AND ped.fecha_hora >= $${productIds.length + 1}
        AND ped.fecha_hora <= $${productIds.length + 2}
        AND ped.estado IN (1, 2)  -- Pagados y entregados
        AND v.idventa IS NOT NULL  -- Solo ventas confirmadas
      GROUP BY p.idproducto, p.nombre, p.precio, c.nombre
      ORDER BY c.nombre, p.nombre
    `;
    
    console.log("SQL Query:", sql);
    console.log("Params:", params);
    
    const result = await query(sql, params);
    console.log("Query result:", result.rows);
    
    return result.rows;
  } catch (error) {
    console.error("Error en getSalesAnalysis:", error);
    console.error("Error details:", error.message);
    throw error;
  }
};

module.exports = {
  getActiveProducts,
  getProductCategories,
  getSalesAnalysis
};