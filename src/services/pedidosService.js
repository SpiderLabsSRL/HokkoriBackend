const { query } = require("../../db");

const getPedidos = async () => {
  const result = await query(
    `SELECT p.* 
     FROM pedidos p 
     WHERE p.estado != 3 
     ORDER BY p.fecha_hora DESC`
  );
  return result.rows;
};

const getPedidoById = async (id) => {
  const result = await query(
    `SELECT p.* 
     FROM pedidos p 
     WHERE p.idpedido = $1 AND p.estado != 3`,
    [id]
  );
  return result.rows[0];
};

const createPedido = async (pedidoData) => {
  const { nombre_cliente, tipo, notas, subtotal, descuento, total, cupon_id, empleado_id } = pedidoData;
  
  const result = await query(
    `INSERT INTO pedidos (nombre_cliente, tipo, notas, subtotal, descuento, total, cupon_id, empleado_id) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
     RETURNING *`,
    [nombre_cliente, tipo, notas, subtotal, descuento, total, cupon_id, empleado_id]
  );
  
  return result.rows[0];
};

const updatePedido = async (id, pedidoData) => {
  const { nombre_cliente, tipo, notas, subtotal, descuento, total, cupon_id, empleado_id } = pedidoData;
  
  const result = await query(
    `UPDATE pedidos 
     SET nombre_cliente = $1, tipo = $2, notas = $3, subtotal = $4, descuento = $5, total = $6, cupon_id = $7, empleado_id = $8 
     WHERE idpedido = $9 AND estado != 3 
     RETURNING *`,
    [nombre_cliente, tipo, notas, subtotal, descuento, total, cupon_id, empleado_id, id]
  );
  
  return result.rows[0];
};

const deletePedido = async (id) => {
  await query(
    "UPDATE pedidos SET estado = 3 WHERE idpedido = $1",
    [id]
  );
};

const getPedidoItems = async (pedidoId) => {
  const result = await query(
    `SELECT dp.*, pr.nombre 
     FROM detalle_pedido dp 
     LEFT JOIN productos pr ON dp.producto_id = pr.idproducto 
     WHERE dp.pedido_id = $1`,
    [pedidoId]
  );
  return result.rows;
};

const createPedidoItems = async (pedidoId, items) => {
  // Eliminar items existentes primero
  await query("DELETE FROM detalle_pedido WHERE pedido_id = $1", [pedidoId]);
  
  // Insertar nuevos items
  for (const item of items) {
    await query(
      `INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal_linea) 
       VALUES ($1, $2, $3, $4, $5)`,
      [pedidoId, item.productId, item.quantity, item.price, (item.price * item.quantity)]
    );
  }
};

const updatePedidoItems = async (pedidoId, items) => {
  // Usamos la misma lógica que createPedidoItems ya que reemplaza todos los items
  await createPedidoItems(pedidoId, items);
};

const processPayment = async (pedidoId, forma_pago, empleado_id) => {
  let client;
  try {
    console.log(`Iniciando processPayment: pedidoId=${pedidoId}, forma_pago=${forma_pago}, empleado_id=${empleado_id}`);
    
    // Obtener cliente para transacción
    client = await require("../../db").pool.connect();
    await client.query('BEGIN');

    // 1. Verificar que el pedido existe y está pendiente, OBTENIENDO LOS VALORES ACTUALES
    const pedidoResult = await client.query(
      `SELECT p.idpedido, p.subtotal, p.descuento, p.total, p.estado, p.cupon_id
       FROM pedidos p 
       WHERE p.idpedido = $1 AND p.estado != 3`,
      [pedidoId]
    );
    
    if (pedidoResult.rows.length === 0) {
      throw new Error(`Pedido con ID ${pedidoId} no encontrado`);
    }
    
    const pedido = pedidoResult.rows[0];
    
    if (pedido.estado !== 0) {
      throw new Error(`El pedido ya tiene estado ${pedido.estado} (debe ser 0 para pagar)`);
    }

    console.log(`Datos del pedido a pagar - Subtotal: ${pedido.subtotal}, Descuento: ${pedido.descuento}, Total: ${pedido.total}`);

    // 2. Verificar que el empleado existe
    const empleadoResult = await client.query(
      "SELECT idempleado FROM empleados WHERE idempleado = $1 AND estado = 0",
      [empleado_id]
    );
    
    if (empleadoResult.rows.length === 0) {
      throw new Error(`Empleado con ID ${empleado_id} no encontrado o inactivo`);
    }

    // 3. Verificar que no existe ya una venta para este pedido
    const ventaExistente = await client.query(
      "SELECT idventa FROM ventas WHERE pedido_id = $1",
      [pedidoId]
    );
    
    if (ventaExistente.rows.length > 0) {
      throw new Error("Ya existe una venta para este pedido");
    }

    // 4. ACTUALIZAR USO DEL CUPÓN si existe
    if (pedido.cupon_id) {
      await client.query(
        "UPDATE cupones SET veces_usado = veces_usado + 1 WHERE idcupon = $1",
        [pedido.cupon_id]
      );
      console.log(`Cupón ${pedido.cupon_id} actualizado: veces_usado incrementado`);
    }

    // 5. Actualizar estado del pedido a pagado
    await client.query(
      "UPDATE pedidos SET estado = 1 WHERE idpedido = $1",
      [pedidoId]
    );
    
    console.log(`Pedido ${pedidoId} actualizado a estado 1 (pagado)`);

    // 6. Crear registro en ventas USANDO LOS VALORES ACTUALES DEL PEDIDO (CON DESCUENTO APLICADO)
    const ventaResult = await client.query(
      `INSERT INTO ventas (empleado_id, pedido_id, subtotal, descuento, total, forma_pago) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING idventa`,
      [
        empleado_id, 
        pedidoId, 
        pedido.subtotal,  // Subtotal original
        pedido.descuento, // Descuento aplicado
        pedido.total,     // Total con descuento aplicado
        forma_pago
      ]
    );
    
    const ventaId = ventaResult.rows[0].idventa;
    console.log(`Venta creada con ID: ${ventaId}`);
    console.log(`Montos registrados en venta - Subtotal: ${pedido.subtotal}, Descuento: ${pedido.descuento}, Total: ${pedido.total}`);

    // 7. Obtener items del pedido para crear detalle_venta
    const itemsResult = await client.query(
      `SELECT producto_id, cantidad, precio_unitario, subtotal_linea 
       FROM detalle_pedido 
       WHERE pedido_id = $1`,
      [pedidoId]
    );
    
    console.log(`Encontrados ${itemsResult.rows.length} items para el pedido`);

    // 8. Crear registros en detalle_venta
    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal_linea) 
         VALUES ($1, $2, $3, $4, $5)`,
        [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal_linea]
      );
    }
    
    console.log(`Detalles de venta creados para venta ${ventaId}`);

    // 9. Registrar movimiento en caja si hay caja abierta - USANDO EL TOTAL CON DESCUENTO
    const cajaResult = await client.query(
      "SELECT idcaja FROM caja WHERE estado = 'Abierto' ORDER BY idcaja DESC LIMIT 1"
    );
    
    if (cajaResult.rows.length > 0) {
      const cajaId = cajaResult.rows[0].idcaja;
      
      // Usar el TOTAL REAL del pedido (con descuento aplicado)
      await client.query(
        `INSERT INTO movimiento_caja (caja_id, tipo, descripcion, monto, empleado_id) 
         VALUES ($1, 'Ingreso', 'Venta pedido #${pedidoId}', $2, $3)`,
        [cajaId, pedido.total, empleado_id]
      );
      
      console.log(`Movimiento de caja registrado para caja ${cajaId} con monto: ${pedido.total} (total con descuento)`);
    } else {
      console.log("No hay caja abierta, omitiendo registro de movimiento de caja");
    }

    // 10. Confirmar transacción
    await client.query('COMMIT');
    console.log("Transacción completada exitosamente");
    
  } catch (error) {
    // Revertir transacción en caso de error
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    console.error("Error en processPayment:", error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Versión SIMPLIFICADA - ACTUALIZADA
const processPaymentSimple = async (pedidoId, forma_pago, empleado_id) => {
  let client;
  try {
    console.log(`ProcessPaymentSimple: pedidoId=${pedidoId}, forma_pago=${forma_pago}, empleado_id=${empleado_id}`);
    
    // Usar transacción también en la versión simple
    client = await require("../../db").pool.connect();
    await client.query('BEGIN');

    // 1. Verificar que el pedido existe y está pendiente
    const pedidoResult = await client.query(
      `SELECT p.idpedido, p.subtotal, p.descuento, p.total, p.estado, p.cupon_id
       FROM pedidos p 
       WHERE p.idpedido = $1 AND p.estado != 3`,
      [pedidoId]
    );
    
    if (pedidoResult.rows.length === 0) {
      throw new Error(`Pedido con ID ${pedidoId} no encontrado`);
    }
    
    const pedido = pedidoResult.rows[0];
    
    if (pedido.estado !== 0) {
      throw new Error(`El pedido ya tiene estado ${pedido.estado} (debe ser 0 para pagar)`);
    }

    console.log(`Datos del pedido (simple) - Subtotal: ${pedido.subtotal}, Descuento: ${pedido.descuento}, Total: ${pedido.total}`);

    // 2. ACTUALIZAR USO DEL CUPÓN si existe
    if (pedido.cupon_id) {
      await client.query(
        "UPDATE cupones SET veces_usado = veces_usado + 1 WHERE idcupon = $1",
        [pedido.cupon_id]
      );
      console.log(`Cupón ${pedido.cupon_id} actualizado: veces_usado incrementado`);
    }

    // 3. Actualizar estado del pedido a pagado
    await client.query(
      "UPDATE pedidos SET estado = 1 WHERE idpedido = $1",
      [pedidoId]
    );
    
    console.log(`Pedido ${pedidoId} marcado como pagado exitosamente`);
    
    // 4. Crear venta básica USANDO LOS VALORES ACTUALES DEL PEDIDO
    const ventaResult = await client.query(
      `INSERT INTO ventas (empleado_id, pedido_id, subtotal, descuento, total, forma_pago) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING idventa`,
      [
        empleado_id, 
        pedidoId, 
        pedido.subtotal,  // Subtotal original
        pedido.descuento, // Descuento aplicado  
        pedido.total,     // Total con descuento
        forma_pago
      ]
    );
    
    const ventaId = ventaResult.rows[0].idventa;
    console.log(`Venta básica creada exitosamente con ID: ${ventaId}`);
    console.log(`Montos en venta - Subtotal: ${pedido.subtotal}, Descuento: ${pedido.descuento}, Total: ${pedido.total}`);

    // 5. Crear detalles de venta
    const itemsResult = await client.query(
      `SELECT producto_id, cantidad, precio_unitario, subtotal_linea 
       FROM detalle_pedido 
       WHERE pedido_id = $1`,
      [pedidoId]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal_linea) 
         VALUES ($1, $2, $3, $4, $5)`,
        [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal_linea]
      );
    }

    // 6. Registrar movimiento en caja si existe caja abierta
    const cajaResult = await client.query(
      "SELECT idcaja FROM caja WHERE estado = 'Abierto' ORDER BY idcaja DESC LIMIT 1"
    );
    
    if (cajaResult.rows.length > 0) {
      const cajaId = cajaResult.rows[0].idcaja;
      
      await client.query(
        `INSERT INTO movimiento_caja (caja_id, tipo, descripcion, monto, empleado_id) 
         VALUES ($1, 'Ingreso', 'Venta pedido #${pedidoId}', $2, $3)`,
        [cajaId, pedido.total, empleado_id]
      );
      
      console.log(`Movimiento de caja registrado con monto: ${pedido.total}`);
    }

    await client.query('COMMIT');
    console.log("Transacción simple completada exitosamente");
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    console.error("Error en processPaymentSimple:", error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

const markAsDelivered = async (pedidoId, empleado_id) => {
  await query(
    "UPDATE pedidos SET estado = 2 WHERE idpedido = $1",
    [pedidoId]
  );
};

// Exportar ambas versiones
module.exports = {
  getPedidos,
  getPedidoById,
  createPedido,
  updatePedido,
  deletePedido,
  getPedidoItems,
  createPedidoItems,
  updatePedidoItems,
  processPayment,
  processPaymentSimple,
  markAsDelivered
};