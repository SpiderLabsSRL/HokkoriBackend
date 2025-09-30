const { query } = require("../../db");

const productsService = {
  // Categorías
  getCategories: async () => {
    const result = await query(
      `SELECT idcategoria, nombre, estado 
       FROM categorias 
       WHERE estado IN (0, 1)
       ORDER BY nombre`
    );
    return result.rows;
  },

  createCategory: async (nombre) => {
    const existingCategory = await query(
      `SELECT idcategoria FROM categorias WHERE nombre = $1 AND estado IN (0, 1)`,
      [nombre]
    );

    if (existingCategory.rows.length > 0) {
      throw new Error("Ya existe una categoría con ese nombre");
    }

    const deletedCategory = await query(
      `SELECT idcategoria FROM categorias WHERE nombre = $1 AND estado = 2`,
      [nombre]
    );

    if (deletedCategory.rows.length > 0) {
      const result = await query(
        `UPDATE categorias SET estado = 0 WHERE idcategoria = $1 RETURNING *`,
        [deletedCategory.rows[0].idcategoria]
      );
      return result.rows[0];
    }

    const result = await query(
      `INSERT INTO categorias (nombre, estado) 
       VALUES ($1, 0) 
       RETURNING *`,
      [nombre]
    );
    return result.rows[0];
  },

  updateCategory: async (id, nombre) => {
    const existingCategory = await query(
      `SELECT idcategoria FROM categorias 
       WHERE nombre = $1 AND idcategoria != $2 AND estado IN (0, 1)`,
      [nombre, id]
    );

    if (existingCategory.rows.length > 0) {
      throw new Error("Ya existe otra categoría con ese nombre");
    }

    const result = await query(
      `UPDATE categorias SET nombre = $1 WHERE idcategoria = $2 RETURNING *`,
      [nombre, id]
    );

    if (result.rows.length === 0) {
      throw new Error("Categoría no encontrada");
    }

    return result.rows[0];
  },

  toggleCategoryStatus: async (id) => {
    const result = await query(
      `UPDATE categorias 
       SET estado = CASE WHEN estado = 0 THEN 1 ELSE 0 END 
       WHERE idcategoria = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error("Categoría no encontrada");
    }

    return result.rows[0];
  },

  // Productos
  getProducts: async () => {
    const result = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.estado IN (0, 1)
       ORDER BY c.nombre, p.nombre`
    );
    
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
  },

  getActiveProducts: async () => {
    const result = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.estado = 0 AND c.estado = 0
       ORDER BY c.nombre, p.nombre`
    );
    
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
  },

  createProduct: async (productData) => {
    const { nombre, descripcion, categoria_id, precio, imagen } = productData;

    const category = await query(
      `SELECT idcategoria FROM categorias WHERE idcategoria = $1 AND estado = 0`,
      [categoria_id]
    );

    if (category.rows.length === 0) {
      throw new Error("La categoría seleccionada no existe o no está activa");
    }

    let imagenBuffer = null;
    if (imagen) {
      try {
        const base64Data = imagen.startsWith('data:') 
          ? imagen.split(',')[1] 
          : imagen;
        
        imagenBuffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error('Error convirtiendo imagen a Buffer:', error);
        throw new Error('Formato de imagen inválido');
      }
    }

    const result = await query(
      `INSERT INTO productos (nombre, descripcion, categoria_id, precio, imagen, estado) 
       VALUES ($1, $2, $3, $4, $5, 0) 
       RETURNING *`,
      [nombre, descripcion, categoria_id, precio, imagenBuffer]
    );

    const productWithCategory = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.idproducto = $1`,
      [result.rows[0].idproducto]
    );

    const product = productWithCategory.rows[0];
    if (product.imagen) {
      product.imagen = product.imagen.toString('base64');
    }

    return product;
  },

  updateProduct: async (id, productData) => {
    const { nombre, descripcion, categoria_id, precio, imagen } = productData;

    const category = await query(
      `SELECT idcategoria FROM categorias WHERE idcategoria = $1 AND estado = 0`,
      [categoria_id]
    );

    if (category.rows.length === 0) {
      throw new Error("La categoría seleccionada no existe o no está activa");
    }

    let imagenBuffer = null;
    if (imagen) {
      try {
        const base64Data = imagen.startsWith('data:') 
          ? imagen.split(',')[1] 
          : imagen;
        
        imagenBuffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error('Error convirtiendo imagen a Buffer:', error);
        throw new Error('Formato de imagen inválido');
      }
    }

    const result = await query(
      `UPDATE productos 
       SET nombre = $1, descripcion = $2, categoria_id = $3, precio = $4, imagen = $5 
       WHERE idproducto = $6 
       RETURNING *`,
      [nombre, descripcion, categoria_id, precio, imagenBuffer, id]
    );

    if (result.rows.length === 0) {
      throw new Error("Producto no encontrado");
    }

    const productWithCategory = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.idproducto = $1`,
      [id]
    );

    const product = productWithCategory.rows[0];
    if (product.imagen) {
      product.imagen = product.imagen.toString('base64');
    }

    return product;
  },

  toggleProductStatus: async (id) => {
    const result = await query(
      `UPDATE productos 
       SET estado = CASE WHEN estado = 0 THEN 1 ELSE 0 END 
       WHERE idproducto = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error("Producto no encontrado");
    }

    const productWithCategory = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.idproducto = $1`,
      [id]
    );

    const product = productWithCategory.rows[0];
    if (product.imagen) {
      product.imagen = product.imagen.toString('base64');
    }

    return product;
  },

  deleteProduct: async (id) => {
    const result = await query(
      `UPDATE productos SET estado = 2 WHERE idproducto = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error("Producto no encontrado");
    }

    return result.rows[0];
  },

  // Nuevo método para crear órdenes
  createOrder: async (orderData) => {
    const {
      customerName,
      phoneNumber,
      orderType,
      notes,
      items,
      total,
      status,
      paymentStatus,
      couponCode,
      discountAmount
    } = orderData;

    try {
      // Buscar el cupón si existe
      let cuponId = null;
      if (couponCode) {
        const couponResult = await query(
          'SELECT idcupon FROM cupones WHERE nombre = $1 AND estado = 0',
          [couponCode]
        );
        if (couponResult.rows.length > 0) {
          cuponId = couponResult.rows[0].idcupon;
        }
      }

      // Calcular subtotal (total + descuento)
      const subtotal = total + (discountAmount || 0);

      // Insertar la orden principal
      const orderResult = await query(
        `INSERT INTO pedidos (nombre_cliente, tipo, notas, subtotal, descuento, total, cupon_id, estado) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0) 
         RETURNING idpedido`,
        [
          customerName,
          orderType,
          notes || '',
          subtotal,
          discountAmount || 0,
          total,
          cuponId
        ]
      );

      const orderId = orderResult.rows[0].idpedido;

      // Insertar los items del pedido
      for (const item of items) {
        await query(
          `INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal_linea) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            orderId,
            item.productId,
            item.quantity,
            item.price,
            item.price * item.quantity
          ]
        );
      }

      return {
        idOrden: orderId,
        cliente: customerName,
        telefono: phoneNumber || '',
        tipo: orderType,
        notas: notes || '',
        total: total,
        estado: 'pendiente',
        estado_pago: 'pendiente',
        fecha_creacion: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(`Error al crear el pedido: ${error.message}`);
    }
  },

  // Nuevo método para validar cupones
  validateCoupon: async (couponCode) => {
    try {
      const result = await query(
        `SELECT idcupon, nombre, monto, tipo, estado, veces_usado 
         FROM cupones 
         WHERE nombre = $1 AND estado = 0`,
        [couponCode]
      );

      if (result.rows.length === 0) {
        return {
          isValid: false,
          discount: 0,
          message: "Cupón no válido o no encontrado",
          couponCode: couponCode
        };
      }

      const coupon = result.rows[0];
      
      return {
        isValid: true,
        discount: coupon.monto,
        message: `¡Cupón aplicado! ${coupon.monto}% de descuento`,
        couponCode: coupon.nombre
      };
    } catch (error) {
      console.error("Error validating coupon:", error);
      return {
        isValid: false,
        discount: 0,
        message: "Error validando cupón",
        couponCode: couponCode
      };
    }
  },
};

module.exports = productsService;