const { query } = require("../../db");

const getCajaActual = async () => {
  const result = await query(
    `SELECT idcaja, estado, monto_apertura, monto_cierre, empleado_id 
     FROM caja 
     WHERE estado = 'Abierto' 
     ORDER BY idcaja DESC 
     LIMIT 1`
  );
  return result.rows[0] || null;
};

const getMovimientosCaja = async (filtros = {}) => {
  let sql = `
    SELECT 
      mc.idmovimiento,
      mc.fecha_hora,
      mc.caja_id,
      mc.tipo,
      mc.descripcion,
      mc.monto,
      mc.empleado_id,
      e.nombres,
      e.apellidos
    FROM movimiento_caja mc
    INNER JOIN empleados e ON mc.empleado_id = e.idempleado
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 0;

  // Si no hay filtros de fecha, mostrar solo movimientos del día actual en Bolivia
  if (!filtros.fechaInicio && !filtros.fechaFin) {
    sql += ` AND DATE(mc.fecha_hora AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz') = CURRENT_DATE`;
  } else {
    if (filtros.fechaInicio) {
      paramCount++;
      sql += ` AND mc.fecha_hora >= $${paramCount}`;
      params.push(filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      paramCount++;
      sql += ` AND mc.fecha_hora <= $${paramCount}`;
      params.push(filtros.fechaFin);
    }
  }

  if (filtros.tipo) {
    paramCount++;
    sql += ` AND mc.tipo = $${paramCount}`;
    params.push(filtros.tipo);
  }

  sql += ` ORDER BY mc.fecha_hora DESC`;

  const result = await query(sql, params);
  return result.rows;
};

const getTotalEnCaja = async () => {
  const result = await query(`
    SELECT monto_cierre 
    FROM caja 
    WHERE monto_cierre IS NOT NULL
    ORDER BY idcaja DESC 
    LIMIT 1
  `);
  
  if (result.rows.length > 0 && result.rows[0].monto_cierre !== null) {
    return parseFloat(result.rows[0].monto_cierre);
  }
  
  const cajaAbierta = await getCajaActual();
  if (cajaAbierta) {
    return parseFloat(cajaAbierta.monto_apertura);
  }
  
  return 0;
};

const getTotalesPorTipo = async (filtros = {}) => {
  let sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END), 0) as ingresos,
      COALESCE(SUM(CASE WHEN tipo = 'Egreso' THEN monto ELSE 0 END), 0) as egresos
    FROM movimiento_caja
    WHERE tipo IN ('Ingreso', 'Egreso')
  `;
  
  const params = [];
  let paramCount = 0;

  // Si no hay filtros de fecha, mostrar solo totales del día actual en Bolivia
  if (!filtros.fechaInicio && !filtros.fechaFin) {
    sql += ` AND DATE(fecha_hora AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz') = CURRENT_DATE`;
  } else {
    if (filtros.fechaInicio) {
      paramCount++;
      sql += ` AND fecha_hora >= $${paramCount}`;
      params.push(filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      paramCount++;
      sql += ` AND fecha_hora <= $${paramCount}`;
      params.push(filtros.fechaFin);
    }
  }

  const result = await query(sql, params);
  return {
    ingresos: parseFloat(result.rows[0].ingresos) || 0,
    egresos: parseFloat(result.rows[0].egresos) || 0
  };
};

module.exports = {
  getCajaActual,
  getMovimientosCaja,
  getTotalEnCaja,
  getTotalesPorTipo
};