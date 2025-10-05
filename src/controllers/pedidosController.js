const pedidosService = require("../services/pedidosService");

const getPedidos = async (req, res) => {
  try {
    const pedidos = await pedidosService.getPedidos();
    res.json(pedidos);
  } catch (error) {
    console.error("Error en getPedidos:", error);
    res.status(500).json({ error: error.message });
  }
};

const getPedidoById = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await pedidosService.getPedidoById(parseInt(id));
    if (!pedido) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    res.json(pedido);
  } catch (error) {
    console.error("Error en getPedidoById:", error);
    res.status(500).json({ error: error.message });
  }
};

const createPedido = async (req, res) => {
  try {
    const { nombre_cliente, tipo, notas, subtotal, descuento, total, cupon_id, empleado_id } = req.body;
    
    const nuevoPedido = await pedidosService.createPedido({
      nombre_cliente,
      tipo,
      notas,
      subtotal,
      descuento,
      total,
      cupon_id,
      empleado_id
    });
    
    res.status(201).json(nuevoPedido);
  } catch (error) {
    console.error("Error en createPedido:", error);
    res.status(500).json({ error: error.message });
  }
};

const updatePedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_cliente, tipo, notas, subtotal, descuento, total, cupon_id, empleado_id } = req.body;
    
    const pedidoActualizado = await pedidosService.updatePedido(parseInt(id), {
      nombre_cliente,
      tipo,
      notas,
      subtotal,
      descuento,
      total,
      cupon_id,
      empleado_id
    });
    
    res.json(pedidoActualizado);
  } catch (error) {
    console.error("Error en updatePedido:", error);
    res.status(500).json({ error: error.message });
  }
};

const deletePedido = async (req, res) => {
  try {
    const { id } = req.params;
    await pedidosService.deletePedido(parseInt(id));
    res.json({ message: "Pedido eliminado correctamente" });
  } catch (error) {
    console.error("Error en deletePedido:", error);
    res.status(500).json({ error: error.message });
  }
};

const getPedidoItems = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await pedidosService.getPedidoItems(parseInt(id));
    res.json(items);
  } catch (error) {
    console.error("Error en getPedidoItems:", error);
    res.status(500).json({ error: error.message });
  }
};

const createPedidoItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    
    await pedidosService.createPedidoItems(parseInt(id), items);
    res.status(201).json({ message: "Items agregados correctamente" });
  } catch (error) {
    console.error("Error en createPedidoItems:", error);
    res.status(500).json({ error: error.message });
  }
};

const updatePedidoItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    
    await pedidosService.updatePedidoItems(parseInt(id), items);
    res.json({ message: "Items actualizados correctamente" });
  } catch (error) {
    console.error("Error en updatePedidoItems:", error);
    res.status(500).json({ error: error.message });
  }
};

const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { forma_pago, empleado_id } = req.body;
    
    console.log(`Process payment request: pedidoId=${id}, forma_pago=${forma_pago}, empleado_id=${empleado_id}`);
    
    // Validaciones básicas
    if (!forma_pago || !empleado_id) {
      return res.status(400).json({ 
        error: "Forma de pago y empleado_id son requeridos" 
      });
    }
    
    if (!['Efectivo', 'Qr'].includes(forma_pago)) {
      return res.status(400).json({ 
        error: "Forma de pago debe ser 'Efectivo' o 'Qr'" 
      });
    }
    
    await pedidosService.processPayment(parseInt(id), forma_pago, parseInt(empleado_id));
    res.json({ message: "Pago procesado correctamente" });
  } catch (error) {
    console.error("Error en processPayment:", error);
    res.status(500).json({ 
      error: "Error al procesar el pago",
      message: error.message 
    });
  }
};

const markAsDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const { empleado_id } = req.body;
    
    await pedidosService.markAsDelivered(parseInt(id), empleado_id);
    res.json({ message: "Pedido marcado como entregado" });
  } catch (error) {
    console.error("Error en markAsDelivered:", error);
    res.status(500).json({ error: error.message });
  }
};

// Funciones para cupones (añadidas aquí)
const getCupones = async (req, res) => {
  try {
    const cupones = await pedidosService.getCupones();
    res.json(cupones);
  } catch (error) {
    console.error("Error en getCupones:", error);
    res.status(500).json({ error: error.message });
  }
};

const getCuponById = async (req, res) => {
  try {
    const { id } = req.params;
    const cupon = await pedidosService.getCuponById(parseInt(id));
    if (!cupon) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }
    res.json(cupon);
  } catch (error) {
    console.error("Error en getCuponById:", error);
    res.status(500).json({ error: error.message });
  }
};

// Nueva función para obtener estado de caja
const getCajaEstado = async (req, res) => {
  try {
    const estadoCaja = await pedidosService.getCajaEstado();
    res.json(estadoCaja);
  } catch (error) {
    console.error("Error en getCajaEstado:", error);
    res.status(500).json({ error: error.message });
  }
};

// Funciones para productos
const searchProductos = async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search || search.trim() === '') {
      return res.json([]);
    }

    const productos = await pedidosService.searchProductos(search);
    res.json(productos);
  } catch (error) {
    console.error("Error en searchProductos:", error);
    res.status(500).json({ error: error.message });
  }
};

const getProductos = async (req, res) => {
  try {
    const productos = await pedidosService.getProductos();
    res.json(productos);
  } catch (error) {
    console.error("Error en getProductos:", error);
    res.status(500).json({ error: error.message });
  }
};

const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await pedidosService.getProductoById(parseInt(id));
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(producto);
  } catch (error) {
    console.error("Error en getProductoById:", error);
    res.status(500).json({ error: error.message });
  }
};

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
  markAsDelivered,
  getCupones,
  getCuponById,
  getCajaEstado,
  searchProductos,
  getProductos,
  getProductoById
};