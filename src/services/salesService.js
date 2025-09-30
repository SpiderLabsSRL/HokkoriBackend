const { query } = require("../../db");
const bcrypt = require("bcrypt");

const salesService = {
  // Transacciones
  async beginTransaction() {
    const client = await require("../../db").pool.connect();
    await client.query('BEGIN');
    return client;
  },

  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  },

  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  },

  // Obtener productos activos
  async getActiveProducts() {
    const result = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.precio, p.categoria_id, p.imagen, p.estado,
              c.nombre as categoria_nombre
       FROM productos p
       INNER JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.estado = 0 AND c.estado = 0
       ORDER BY c.nombre, p.nombre`
    );
    
    // Convertir imágenes bytea a base64
    const productsWithBase64 = result.rows.map(product => {
      if (product.imagen) {
        // Convertir Buffer a base64
        const base64Image = product.imagen.toString('base64');
        return {
          ...product,
          imagen: base64Image
        };
      }
      return product;
    });

    return productsWithBase64;
  },

  // Obtener categorías activas
  async getActiveCategories() {
    const result = await query(
      "SELECT idcategoria, nombre FROM categorias WHERE estado = 0 ORDER BY nombre"
    );
    return result.rows;
  },

  // Obtener cupones activos
  async getActiveCoupons() {
    const result = await query(
      "SELECT idcupon, nombre, monto, veces_usado, estado, tipo FROM cupones WHERE estado = 0 ORDER BY nombre"
    );
    return result.rows;
  },

  // Obtener el último registro de caja del empleado
  async getLastCashRegister(employeeId) {
    if (!employeeId) {
      throw new Error("Employee ID is required");
    }

    const result = await query(
      `SELECT idcaja, estado, monto_apertura, monto_cierre, empleado_id
       FROM caja 
       WHERE empleado_id = $1 
       ORDER BY idcaja DESC 
       LIMIT 1`,
      [employeeId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  },

  // Obtener el último monto de cierre registrado (consulta independiente)
  async getLastCloseAmount() {
    const result = await query(
      `SELECT monto_cierre 
       FROM caja 
       WHERE estado = 'Cerrado' 
       ORDER BY idcaja DESC 
       LIMIT 1`
    );
    return result.rows.length > 0 ? parseFloat(result.rows[0].monto_cierre) : 0;
  },

  // Obtener el último registro de caja (abierta o cerrada)
  async getLastCashRegisterAny() {
    const result = await query(
      `SELECT idcaja, estado, monto_apertura, monto_cierre, empleado_id
       FROM caja 
       ORDER BY idcaja DESC 
       LIMIT 1`
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  },

  // Obtener información del cupón
  async getCouponInfo(couponCode) {
    const result = await query(
      "SELECT idcupon, monto, tipo FROM cupones WHERE nombre = $1 AND estado = 0",
      [couponCode]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  },

  // Actualizar uso del cupón
  async updateCouponUsage(couponId, transaction) {
    await transaction.query(
      "UPDATE cupones SET veces_usado = veces_usado + 1 WHERE idcupon = $1",
      [couponId]
    );
  },

  // Abrir nueva caja (sin movimiento de apertura)
  async openCashRegister(employeeId, lastCloseAmount, transaction) {
    const cashRegisterInsert = await transaction.query(
      `INSERT INTO caja (estado, monto_apertura, monto_cierre, empleado_id) 
       VALUES ('Abierto', $1, $1, $2) RETURNING idcaja`,
      [lastCloseAmount, employeeId]
    );
    
    return cashRegisterInsert.rows[0].idcaja;
  },

  // Procesar venta completa
  async processCompleteSale(saleData, transaction) {
    const {
      customerName,
      orderType,
      paymentMethod,
      couponCode,
      orderNotes,
      cashAmount,
      cartItems,
      subtotal,
      discount,
      total,
      employeeId
    } = saleData;

    // Validar empleado
    if (!employeeId) {
      throw new Error("ID de empleado no válido");
    }

    // 1. Manejar cupón
    let couponId = null;
    if (couponCode && couponCode !== "none") {
      const coupon = await this.getCouponInfo(couponCode);
      if (coupon) {
        couponId = coupon.idcupon;
        await this.updateCouponUsage(couponId, transaction);
      }
    }

    // 2. Determinar estado del pedido según método de pago
    let orderStatus = 0; // por pagar por defecto
    if (paymentMethod === "efectivo" || paymentMethod === "qr") {
      orderStatus = 1; // pagado
    }

    // 3. Insertar pedido
    const orderResult = await transaction.query(
      `INSERT INTO pedidos (
        nombre_cliente, tipo, estado, notas, subtotal, descuento, total, cupon_id, empleado_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING idpedido`,
      [
        customerName,
        orderType,
        orderStatus,
        orderNotes || null,
        subtotal,
        discount,
        total,
        couponId,
        employeeId
      ]
    );

    const orderId = orderResult.rows[0].idpedido;

    // 4. Insertar detalles del pedido
    for (const item of cartItems) {
      await transaction.query(
        `INSERT INTO detalle_pedido (
          pedido_id, producto_id, cantidad, precio_unitario, subtotal_linea
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          orderId,
          parseInt(item.id),
          item.quantity,
          item.price,
          item.price * item.quantity
        ]
      );
    }

    let saleId = null;

    // 5. Si no es "cobrar al finalizar", procesar venta y caja
    if (paymentMethod !== "pagar-entregar") {
      // 5.1. Insertar venta
      const saleResult = await transaction.query(
        `INSERT INTO ventas (
          empleado_id, pedido_id, subtotal, descuento, total, forma_pago
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING idventa`,
        [
          employeeId,
          orderId,
          subtotal,
          discount,
          total,
          paymentMethod === "efectivo" ? "Efectivo" : "Qr"
        ]
      );

      saleId = saleResult.rows[0].idventa;

      // 5.2. Insertar detalles de venta
      for (const item of cartItems) {
        await transaction.query(
          `INSERT INTO detalle_venta (
            venta_id, producto_id, cantidad, precio_unitario, subtotal_linea
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            saleId,
            parseInt(item.id),
            item.quantity,
            item.price,
            item.price * item.quantity
          ]
        );
      }

      // 5.3. Para pagos en efectivo: procesar caja
      if (paymentMethod === "efectivo") {
        // Obtener el último registro de caja (cualquier estado)
        const lastCashRegister = await this.getLastCashRegisterAny();
        let openingAmount = 0;
        
        if (lastCashRegister) {
          // Usar el monto_cierre del último registro como monto_apertura del nuevo
          openingAmount = parseFloat(lastCashRegister.monto_cierre);
        }
        
        // Abrir nueva caja con el monto_cierre anterior como monto_apertura
        const cashRegisterId = await this.openCashRegister(employeeId, openingAmount, transaction);

        // Registrar movimiento de ingreso por venta (solo este movimiento)
        await transaction.query(
          `INSERT INTO movimiento_caja (caja_id, tipo, descripcion, monto, empleado_id)
           VALUES ($1, 'Ingreso', 'Venta en efectivo', $2, $3)`,
          [cashRegisterId, total, employeeId]
        );

        // Actualizar monto de cierre de la caja (monto apertura + total de venta)
        await transaction.query(
          `UPDATE caja 
           SET monto_cierre = monto_apertura + $1 
           WHERE idcaja = $2`,
          [total, cashRegisterId]
        );
      }
    }

    return {
      saleId,
      orderId
    };
  }
};

module.exports = salesService;