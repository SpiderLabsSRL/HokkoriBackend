const { query, pool } = require("../../db");

const getEstadoCaja = async (empleadoId) => {
  try {
    const result = await query(
      `SELECT c.* 
       FROM caja c 
       WHERE c.empleado_id = $1 
       ORDER BY c.idcaja DESC 
       LIMIT 1`,
      [empleadoId]
    );

    if (result.rows.length === 0) {
      return {
        idcaja: 0,
        estado: "Cerrado",
        monto_apertura: "0.00",
        monto_cierre: null,
        empleado_id: empleadoId
      };
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error en getEstadoCaja:", error);
    throw new Error("Error al obtener el estado de la caja");
  }
};

const getSaldoCaja = async (empleadoId) => {
  try {
    const cajaResult = await query(
      `SELECT idcaja, monto_apertura 
       FROM caja 
       WHERE empleado_id = $1 AND estado = 'Abierto' 
       ORDER BY idcaja DESC 
       LIMIT 1`,
      [empleadoId]
    );

    if (cajaResult.rows.length === 0) {
      // Si no hay caja abierta, retornar el último monto_cierre o 0
      const ultimaCajaResult = await query(
        `SELECT monto_cierre FROM caja 
         WHERE empleado_id = $1 AND estado = 'Cerrado' 
         ORDER BY idcaja DESC LIMIT 1`,
        [empleadoId]
      );
      
      if (ultimaCajaResult.rows.length > 0 && ultimaCajaResult.rows[0].monto_cierre) {
        return parseFloat(ultimaCajaResult.rows[0].monto_cierre);
      }
      return 0;
    }

    const cajaId = cajaResult.rows[0].idcaja;
    const montoApertura = parseFloat(cajaResult.rows[0].monto_apertura);

    const movimientosResult = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
         COALESCE(SUM(CASE WHEN tipo = 'Egreso' THEN monto ELSE 0 END), 0) as total_egresos
       FROM movimiento_caja 
       WHERE caja_id = $1 AND tipo IN ('Ingreso', 'Egreso')`,
      [cajaId]
    );

    const totalIngresos = parseFloat(movimientosResult.rows[0].total_ingresos) || 0;
    const totalEgresos = parseFloat(movimientosResult.rows[0].total_egresos) || 0;

    return montoApertura + totalIngresos - totalEgresos;
  } catch (error) {
    console.error("Error en getSaldoCaja:", error);
    throw new Error("Error al calcular el saldo de la caja");
  }
};

const getHistorialDelDia = async (empleadoId, esAdministrador = false) => {
  try {
    let queryText, queryParams;

    if (esAdministrador) {
      // Administrador ve todos los movimientos del día
      queryText = `
        SELECT 
          mc.idmovimiento,
          mc.fecha_hora,
          mc.tipo,
          mc.descripcion,
          mc.monto,
          mc.empleado_id,
          mc.caja_id,
          e.nombres || ' ' || e.apellidos as usuario
        FROM movimiento_caja mc
        INNER JOIN empleados e ON mc.empleado_id = e.idempleado
        WHERE DATE(mc.fecha_hora) = CURRENT_DATE
        ORDER BY mc.fecha_hora DESC
      `;
      queryParams = [];
    } else {
      // Empleado solo ve sus movimientos del día
      queryText = `
        SELECT 
          mc.idmovimiento,
          mc.fecha_hora,
          mc.tipo,
          mc.descripcion,
          mc.monto,
          mc.empleado_id,
          mc.caja_id,
          e.nombres || ' ' || e.apellidos as usuario
        FROM movimiento_caja mc
        INNER JOIN empleados e ON mc.empleado_id = e.idempleado
        WHERE mc.empleado_id = $1 
          AND DATE(mc.fecha_hora) = CURRENT_DATE
        ORDER BY mc.fecha_hora DESC
      `;
      queryParams = [empleadoId];
    }

    const result = await query(queryText, queryParams);
    return result.rows;
  } catch (error) {
    console.error("Error en getHistorialDelDia:", error);
    throw new Error("Error al obtener el historial del día");
  }
};

const registrarMovimiento = async (tipo, monto, descripcion, empleadoId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verificar que haya caja abierta
    const cajaResult = await client.query(
      `SELECT idcaja 
       FROM caja 
       WHERE empleado_id = $1 AND estado = 'Abierto' 
       ORDER BY idcaja DESC 
       LIMIT 1`,
      [empleadoId]
    );

    if (cajaResult.rows.length === 0) {
      throw new Error("No hay caja abierta. Debe abrir caja primero.");
    }

    const cajaId = cajaResult.rows[0].idcaja;

    // Para egresos, verificar saldo suficiente
    if (tipo.toLowerCase() === 'egreso') {
      const cajaInfo = await client.query(
        `SELECT monto_apertura FROM caja WHERE idcaja = $1`,
        [cajaId]
      );
      const montoAperturaActual = parseFloat(cajaInfo.rows[0].monto_apertura);

      const movimientosActuales = await client.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
           COALESCE(SUM(CASE WHEN tipo = 'Egreso' THEN monto ELSE 0 END), 0) as total_egresos
         FROM movimiento_caja 
         WHERE caja_id = $1 AND tipo IN ('Ingreso', 'Egreso')`,
        [cajaId]
      );

      const ingresosActuales = parseFloat(movimientosActuales.rows[0].total_ingresos) || 0;
      const egresosActuales = parseFloat(movimientosActuales.rows[0].total_egresos) || 0;
      const saldoDisponible = montoAperturaActual + ingresosActuales - egresosActuales;

      if (monto > saldoDisponible) {
        throw new Error(`Saldo insuficiente. Saldo actual: Bs. ${saldoDisponible.toFixed(2)}`);
      }
    }

    // Registrar movimiento
    const movimientoResult = await client.query(
      `INSERT INTO movimiento_caja (caja_id, tipo, descripcion, monto, empleado_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [cajaId, tipo, descripcion, monto, empleadoId]
    );
    const movimiento = movimientoResult.rows[0];

    await client.query('COMMIT');
    return movimiento;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error en registrarMovimiento:", error);
    throw new Error(error.message || "Error al registrar el movimiento");
  } finally {
    client.release();
  }
};

const abrirCaja = async (monto, descripcion, empleadoId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verificar si ya hay una caja ABIERTA para este empleado
    const cajaAbiertaResult = await client.query(
      `SELECT idcaja FROM caja WHERE empleado_id = $1 AND estado = 'Abierto'`,
      [empleadoId]
    );

    if (cajaAbiertaResult.rows.length > 0) {
      throw new Error("Ya existe una caja abierta para este empleado");
    }

    // Obtener el monto_cierre de la última caja cerrada (si existe)
    let montoApertura = monto;
    
    const ultimaCajaResult = await client.query(
      `SELECT monto_cierre FROM caja 
       WHERE empleado_id = $1 AND estado = 'Cerrado' 
       ORDER BY idcaja DESC LIMIT 1`,
      [empleadoId]
    );

    if (ultimaCajaResult.rows.length > 0 && ultimaCajaResult.rows[0].monto_cierre) {
      montoApertura = parseFloat(ultimaCajaResult.rows[0].monto_cierre);
    }

    // Crear NUEVA caja
    const cajaResult = await client.query(
      `INSERT INTO caja (estado, monto_apertura, empleado_id) 
       VALUES ('Abierto', $1, $2) 
       RETURNING idcaja`,
      [montoApertura, empleadoId]
    );
    const cajaId = cajaResult.rows[0].idcaja;

    // Registrar movimiento de apertura
    const movimientoResult = await client.query(
      `INSERT INTO movimiento_caja (caja_id, tipo, descripcion, monto, empleado_id) 
       VALUES ($1, 'Apertura', $2, $3, $4) 
       RETURNING *`,
      [cajaId, descripcion, montoApertura, empleadoId]
    );
    const movimiento = movimientoResult.rows[0];

    await client.query('COMMIT');
    return movimiento;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error en abrirCaja:", error);
    throw new Error(error.message || "Error al abrir la caja");
  } finally {
    client.release();
  }
};

const cerrarCaja = async (monto, descripcion, empleadoId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Obtener caja activa
    const cajaResult = await client.query(
      `SELECT idcaja, monto_apertura 
       FROM caja 
       WHERE empleado_id = $1 AND estado = 'Abierto' 
       ORDER BY idcaja DESC 
       LIMIT 1`,
      [empleadoId]
    );

    if (cajaResult.rows.length === 0) {
      throw new Error("No hay caja abierta para cerrar");
    }

    const cajaId = cajaResult.rows[0].idcaja;
    const montoApertura = parseFloat(cajaResult.rows[0].monto_apertura);

    // Calcular saldo actual
    const saldoResult = await client.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
         COALESCE(SUM(CASE WHEN tipo = 'Egreso' THEN monto ELSE 0 END), 0) as total_egresos
       FROM movimiento_caja 
       WHERE caja_id = $1 AND tipo IN ('Ingreso', 'Egreso')`,
      [cajaId]
    );

    const totalIngresos = parseFloat(saldoResult.rows[0].total_ingresos) || 0;
    const totalEgresos = parseFloat(saldoResult.rows[0].total_egresos) || 0;
    const saldoActual = montoApertura + totalIngresos - totalEgresos;

    // Verificar que el monto de cierre coincida
    if (parseFloat(monto) !== saldoActual) {
      throw new Error(`El monto de cierre (Bs. ${monto}) no coincide con el saldo actual (Bs. ${saldoActual.toFixed(2)})`);
    }

    // Actualizar caja a estado Cerrado
    await client.query(
      `UPDATE caja 
       SET estado = 'Cerrado', monto_cierre = $1 
       WHERE idcaja = $2`,
      [saldoActual, cajaId]
    );

    // Registrar movimiento de cierre
    const movimientoResult = await client.query(
      `INSERT INTO movimiento_caja (caja_id, tipo, descripcion, monto, empleado_id) 
       VALUES ($1, 'Cierre', $2, $3, $4) 
       RETURNING *`,
      [cajaId, descripcion, saldoActual, empleadoId]
    );
    const movimiento = movimientoResult.rows[0];

    await client.query('COMMIT');
    return movimiento;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error en cerrarCaja:", error);
    throw new Error(error.message || "Error al cerrar la caja");
  } finally {
    client.release();
  }
};

// Función para verificar si el usuario es administrador
const esAdministrador = async (empleadoId) => {
  try {
    const result = await query(
      `SELECT rol FROM empleados WHERE idempleado = $1`,
      [empleadoId]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return result.rows[0].rol === 'Administrador';
  } catch (error) {
    console.error("Error en esAdministrador:", error);
    return false;
  }
};

module.exports = {
  getEstadoCaja,
  getSaldoCaja,
  getHistorialDelDia,
  registrarMovimiento,
  abrirCaja,
  cerrarCaja,
  esAdministrador
};