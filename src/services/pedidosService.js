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
  try {
    console.log(`Iniciando processPayment: pedidoId=${pedidoId}, forma_pago=${forma_pago}, empleado_id=${empleado_id}`);
    
    // 1. Verificar que el pedido existe y está pendiente
    const pedidoResult = await query(
      "SELECT idpedido, subtotal, descuento, total, estado FROM pedidos WHERE idpedido = $1 AND estado != 3",
      [pedidoId]
    );
    
    if (pedidoResult.rows.length === 0) {
      throw new Error(`Pedido con ID ${pedidoId} no encontrado`);
    }
    
    const pedido = pedidoResult.rows[0];
    
    if (pedido.estado !== 0) {
      throw new Error(`El pedido ya tiene estado ${pedido.estado} (debe ser 0 para pagar)`);
    }

    // 2. Verificar que el empleado existe
    const empleadoResult = await query(
      "SELECT idempleado FROM empleados WHERE idempleado = $1 AND estado = 0",
      [empleado_id]
    );
    
    if (empleadoResult.rows.length === 0) {
      throw new Error(`Empleado con ID ${empleado_id} no encontrado o inactivo`);
    }

    // 3. Verificar que no existe ya una venta para este pedido
    const ventaExistente = await query(
      "SELECT idventa FROM ventas WHERE pedido_id = $1",
      [pedidoId]
    );
    
    if (ventaExistente.rows.length > 0) {
      throw new Error("Ya existe una venta para este pedido");
    }

    // 4. Iniciar transacción manualmente
    await query('BEGIN');

    try {
      // 5. Actualizar estado del pedido a pagado
      await query(
        "UPDATE pedidos SET estado = 1 WHERE idpedido = $1",
        [pedidoId]
      );
      
      console.log(`Pedido ${pedidoId} actualizado a estado 1 (pagado)`);

      // 6. Crear registro en ventas
      const ventaResult = await query(
        `INSERT INTO ventas (empleado_id, pedido_id, subtotal, descuento, total, forma_pago) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING idventa`,
        [empleado_id, pedidoId, pedido.subtotal, pedido.descuento, pedido.total, forma_pago]
      );
      
      const ventaId = ventaResult.rows[0].idventa;
      console.log(`Venta creada con ID: ${ventaId}`);

      // 7. Obtener items del pedido para crear detalle_venta
      const itemsResult = await query(
        `SELECT producto_id, cantidad, precio_unitario, subtotal_linea 
         FROM detalle_pedido 
         WHERE pedido_id = $1`,
        [pedidoId]
      );
      
      console.log(`Encontrados ${itemsResult.rows.length} items para el pedido`);

      // 8. Crear registros en detalle_venta
      for (const item of itemsResult.rows) {
        await query(
          `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal_linea) 
           VALUES ($1, $2, $3, $4, $5)`,
          [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal_linea]
        );
      }
      
      console.log(`Detalles de venta creados para venta ${ventaId}`);

      // 9. Registrar movimiento en caja si hay caja abierta
      const cajaResult = await query(
        "SELECT idcaja FROM caja WHERE estado = 'Abierto' ORDER BY idcaja DESC LIMIT 1"
      );
      
      if (cajaResult.rows.length > 0) {
        const cajaId = cajaResult.rows[0].idcaja;
        
        await query(
          `INSERT INTO movimiento_caja (caja_id, tipo, descripcion, monto, empleado_id) 
           VALUES ($1, 'Ingreso', 'Venta pedido #${pedidoId}', $2, $3)`,
          [cajaId, pedido.total, empleado_id]
        );
        
        console.log(`Movimiento de caja registrado para caja ${cajaId}`);
      } else {
        console.log("No hay caja abierta, omitiendo registro de movimiento de caja");
      }

      // 10. Confirmar transacción
      await query('COMMIT');
      console.log("Transacción completada exitosamente");
      
    } catch (error) {
      // Revertir transacción en caso de error
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error("Error en processPayment:", error);
    throw error;
  }
};

// Versión SIMPLIFICADA si la anterior no funciona
const processPaymentSimple = async (pedidoId, forma_pago, empleado_id) => {
  try {
    console.log(`ProcessPaymentSimple: pedidoId=${pedidoId}, forma_pago=${forma_pago}, empleado_id=${empleado_id}`);
    
    // 1. Verificar que el pedido existe y está pendiente
    const pedidoResult = await query(
      "SELECT idpedido, subtotal, descuento, total, estado FROM pedidos WHERE idpedido = $1 AND estado != 3",
      [pedidoId]
    );
    
    if (pedidoResult.rows.length === 0) {
      throw new Error(`Pedido con ID ${pedidoId} no encontrado`);
    }
    
    const pedido = pedidoResult.rows[0];
    
    if (pedido.estado !== 0) {
      throw new Error(`El pedido ya tiene estado ${pedido.estado} (debe ser 0 para pagar)`);
    }

    // 2. Solo actualizar el estado del pedido (sin transacción compleja)
    await query(
      "UPDATE pedidos SET estado = 1 WHERE idpedido = $1",
      [pedidoId]
    );
    
    console.log(`Pedido ${pedidoId} marcado como pagado exitosamente`);
    
    // 3. Crear venta básica (sin detalle_venta)
    await query(
      `INSERT INTO ventas (empleado_id, pedido_id, subtotal, descuento, total, forma_pago) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [empleado_id, pedidoId, pedido.subtotal, pedido.descuento, pedido.total, forma_pago]
    );
    
    console.log("Venta básica creada exitosamente");
    
  } catch (error) {
    console.error("Error en processPaymentSimple:", error);
    throw error;
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
  processPaymentSimple, // Versión simplificada
  markAsDelivered
};