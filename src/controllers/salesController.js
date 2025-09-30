const salesService = require("../services/salesService");

const salesController = {
  // Obtener productos activos
  async getProducts(req, res) {
    try {
      const products = await salesService.getActiveProducts();
      res.json(products);
    } catch (error) {
      console.error("Error in getProducts:", error);
      res.status(500).json({ 
        message: "Error al obtener los productos",
        error: error.message 
      });
    }
  },

  // Obtener categorías activas
  async getCategories(req, res) {
    try {
      const categories = await salesService.getActiveCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error in getCategories:", error);
      res.status(500).json({ 
        message: "Error al obtener las categorías",
        error: error.message 
      });
    }
  },

  // Obtener cupones activos
  async getCoupons(req, res) {
    try {
      const coupons = await salesService.getActiveCoupons();
      res.json(coupons);
    } catch (error) {
      console.error("Error in getCoupons:", error);
      res.status(500).json({ 
        message: "Error al obtener los cupones",
        error: error.message 
      });
    }
  },

  // Procesar venta
  async processSale(req, res) {
    let transaction;
    
    try {
      transaction = await salesService.beginTransaction();
      
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
      } = req.body;

      // Validaciones básicas
      if (!customerName || !orderType || !paymentMethod || !cartItems || cartItems.length === 0) {
        await salesService.rollbackTransaction(transaction);
        return res.status(400).json({ 
          message: "Datos incompletos para procesar la venta" 
        });
      }

      if (!employeeId) {
        await salesService.rollbackTransaction(transaction);
        return res.status(400).json({ 
          message: "Empleado no identificado" 
        });
      }

      // Verificar si la caja está abierta (último registro)
      const lastCashRegister = await salesService.getLastCashRegister(employeeId);
      if (!lastCashRegister || lastCashRegister.estado === 'Cerrado') {
        await salesService.rollbackTransaction(transaction);
        return res.status(400).json({ 
          message: "La caja está cerrada. Debe abrir la caja antes de procesar ventas." 
        });
      }

      // Procesar la venta
      const result = await salesService.processCompleteSale(
        {
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
        },
        transaction
      );

      await salesService.commitTransaction(transaction);
      
      res.json({
        idventa: result.saleId,
        idpedido: result.orderId,
        message: "Venta procesada exitosamente"
      });

    } catch (error) {
      if (transaction) {
        await salesService.rollbackTransaction(transaction);
      }
      console.error("Error in processSale:", error);
      res.status(500).json({ 
        message: "Error al procesar la venta",
        error: error.message 
      });
    }
  },

  // Verificar el último registro de caja
  async checkLastCashRegister(req, res) {
    try {
      const { employeeId } = req.params;
      
      if (!employeeId) {
        return res.status(400).json({ 
          message: "ID de empleado requerido" 
        });
      }

      const lastCashRegister = await salesService.getLastCashRegister(employeeId);
      const isOpen = lastCashRegister && lastCashRegister.estado === 'Abierto';
      
      res.json({ 
        isOpen,
        lastCashRegister
      });
    } catch (error) {
      console.error("Error in checkLastCashRegister:", error);
      res.status(500).json({ 
        message: "Error al verificar el estado de la caja",
        error: error.message 
      });
    }
  }
};

module.exports = salesController;