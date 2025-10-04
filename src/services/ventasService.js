const { query } = require("../../db");

const getAllVentas = async () => {
  const sql = `
    SELECT 
      v.idventa,
      v.fecha_hora,
      v.empleado_id,
      e.nombres,
      e.apellidos,
      v.pedido_id,
      v.subtotal,
      v.descuento,
      v.total,
      v.forma_pago,
      STRING_AGG(
        CONCAT(dv.cantidad, 'x ', p.nombre, ' (', dv.precio_unitario, ' Bs)'), 
        ', '
      ) as detalle_productos
    FROM ventas v
    INNER JOIN empleados e ON v.empleado_id = e.idempleado
    INNER JOIN detalle_venta dv ON v.idventa = dv.venta_id
    INNER JOIN productos p ON dv.producto_id = p.idproducto
    WHERE e.estado = 0
    GROUP BY 
      v.idventa, 
      v.fecha_hora, 
      v.empleado_id, 
      e.nombres, 
      e.apellidos, 
      v.pedido_id, 
      v.subtotal, 
      v.descuento, 
      v.total, 
      v.forma_pago
    ORDER BY v.fecha_hora DESC
  `;
  
  const result = await query(sql);
  return result.rows;
};

const getVentasPorFecha = async (fecha) => {
  const sql = `
    SELECT 
      v.idventa,
      v.fecha_hora,
      v.empleado_id,
      e.nombres,
      e.apellidos,
      v.pedido_id,
      v.subtotal,
      v.descuento,
      v.total,
      v.forma_pago,
      STRING_AGG(
        CONCAT(dv.cantidad, 'x ', p.nombre, ' (', dv.precio_unitario, ' Bs)'), 
        ', '
      ) as detalle_productos
    FROM ventas v
    INNER JOIN empleados e ON v.empleado_id = e.idempleado
    INNER JOIN detalle_venta dv ON v.idventa = dv.venta_id
    INNER JOIN productos p ON dv.producto_id = p.idproducto
    WHERE DATE(v.fecha_hora) = $1 
      AND e.estado = 0
    GROUP BY 
      v.idventa, 
      v.fecha_hora, 
      v.empleado_id, 
      e.nombres, 
      e.apellidos, 
      v.pedido_id, 
      v.subtotal, 
      v.descuento, 
      v.total, 
      v.forma_pago
    ORDER BY v.fecha_hora DESC
  `;
  
  const result = await query(sql, [fecha]);
  return result.rows;
};

const getVentasPorRango = async (fechaInicio, fechaFin) => {
  const sql = `
    SELECT 
      v.idventa,
      v.fecha_hora,
      v.empleado_id,
      e.nombres,
      e.apellidos,
      v.pedido_id,
      v.subtotal,
      v.descuento,
      v.total,
      v.forma_pago,
      STRING_AGG(
        CONCAT(dv.cantidad, 'x ', p.nombre, ' (', dv.precio_unitario, ' Bs)'), 
        ', '
      ) as detalle_productos
    FROM ventas v
    INNER JOIN empleados e ON v.empleado_id = e.idempleado
    INNER JOIN detalle_venta dv ON v.idventa = dv.venta_id
    INNER JOIN productos p ON dv.producto_id = p.idproducto
    WHERE DATE(v.fecha_hora) BETWEEN $1 AND $2
      AND e.estado = 0
    GROUP BY 
      v.idventa, 
      v.fecha_hora, 
      v.empleado_id, 
      e.nombres, 
      e.apellidos, 
      v.pedido_id, 
      v.subtotal, 
      v.descuento, 
      v.total, 
      v.forma_pago
    ORDER BY v.fecha_hora DESC
  `;
  
  const result = await query(sql, [fechaInicio, fechaFin]);
  return result.rows;
};

const getVentasHoy = async () => {
  const sql = `
    SELECT 
      v.idventa,
      v.fecha_hora,
      v.empleado_id,
      e.nombres,
      e.apellidos,
      v.pedido_id,
      v.subtotal,
      v.descuento,
      v.total,
      v.forma_pago,
      STRING_AGG(
        CONCAT(dv.cantidad, 'x ', p.nombre, ' (', dv.precio_unitario, ' Bs)'), 
        ', '
      ) as detalle_productos
    FROM ventas v
    INNER JOIN empleados e ON v.empleado_id = e.idempleado
    INNER JOIN detalle_venta dv ON v.idventa = dv.venta_id
    INNER JOIN productos p ON dv.producto_id = p.idproducto
    WHERE DATE(v.fecha_hora) = CURRENT_DATE
      AND e.estado = 0
    GROUP BY 
      v.idventa, 
      v.fecha_hora, 
      v.empleado_id, 
      e.nombres, 
      e.apellidos, 
      v.pedido_id, 
      v.subtotal, 
      v.descuento, 
      v.total, 
      v.forma_pago
    ORDER BY v.fecha_hora DESC
  `;
  
  const result = await query(sql);
  return result.rows;
};

const getVentasHoyPorEmpleado = async (empleadoId) => {
  const sql = `
    SELECT 
      v.idventa,
      v.fecha_hora,
      v.empleado_id,
      e.nombres,
      e.apellidos,
      v.pedido_id,
      v.subtotal,
      v.descuento,
      v.total,
      v.forma_pago,
      STRING_AGG(
        CONCAT(dv.cantidad, 'x ', p.nombre, ' (', dv.precio_unitario, ' Bs)'), 
        ', '
      ) as detalle_productos
    FROM ventas v
    INNER JOIN empleados e ON v.empleado_id = e.idempleado
    INNER JOIN detalle_venta dv ON v.idventa = dv.venta_id
    INNER JOIN productos p ON dv.producto_id = p.idproducto
    WHERE DATE(v.fecha_hora) = CURRENT_DATE
      AND v.empleado_id = $1
      AND e.estado = 0
    GROUP BY 
      v.idventa, 
      v.fecha_hora, 
      v.empleado_id, 
      e.nombres, 
      e.apellidos, 
      v.pedido_id, 
      v.subtotal, 
      v.descuento, 
      v.total, 
      v.forma_pago
    ORDER BY v.fecha_hora DESC
  `;
  
  const result = await query(sql, [empleadoId]);
  return result.rows;
};

const getTotalesGenerales = async () => {
  const sql = `
    SELECT 
      COALESCE(SUM(total), 0) as total_general,
      COALESCE(SUM(CASE WHEN forma_pago = 'Efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
      COALESCE(SUM(CASE WHEN forma_pago = 'QR' THEN total ELSE 0 END), 0) as total_qr
    FROM ventas v
    INNER JOIN empleados e ON v.empleado_id = e.idempleado
    WHERE e.estado = 0
  `;
  
  const result = await query(sql);
  return result.rows[0];
};

const getTotalesPorFecha = async (fecha) => {
  const sql = `
    SELECT 
      COALESCE(SUM(total), 0) as total_general,
      COALESCE(SUM(CASE WHEN forma_pago = 'Efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
      COALESCE(SUM(CASE WHEN forma_pago = 'QR' THEN total ELSE 0 END), 0) as total_qr
    FROM ventas v
    INNER JOIN empleados e ON v.empleado_id = e.idempleado
    WHERE DATE(v.fecha_hora) = $1
      AND e.estado = 0
  `;
  
  const result = await query(sql, [fecha]);
  return result.rows[0];
};

const getTotalesPorRango = async (fechaInicio, fechaFin) => {
  const sql = `
    SELECT 
      COALESCE(SUM(total), 0) as total_general,
      COALESCE(SUM(CASE WHEN forma_pago = 'Efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
      COALESCE(SUM(CASE WHEN forma_pago = 'QR' THEN total ELSE 0 END), 0) as total_qr
    FROM ventas v
    INNER JOIN empleados e ON v.empleado_id = e.idempleado
    WHERE DATE(v.fecha_hora) BETWEEN $1 AND $2
      AND e.estado = 0
  `;
  
  const result = await query(sql, [fechaInicio, fechaFin]);
  return result.rows[0];
};

module.exports = {
  getAllVentas,
  getVentasPorFecha,
  getVentasPorRango,
  getVentasHoy,
  getVentasHoyPorEmpleado,
  getTotalesGenerales,
  getTotalesPorFecha,
  getTotalesPorRango
};