const couponsService = require("../services/couponsService");

const getCoupons = async (req, res) => {
  try {
    const coupons = await couponsService.getCoupons();
    res.json(coupons);
  } catch (error) {
    console.error("Error en getCoupons:", error);
    res.status(500).json({ 
      error: "Error al obtener los cupones",
      message: error.message 
    });
  }
};

const createCoupon = async (req, res) => {
  try {
    const { nombre, monto, tipo } = req.body;
    
    if (!nombre || !monto || !tipo) {
      return res.status(400).json({ 
        error: "Todos los campos son requeridos" 
      });
    }

    const newCoupon = await couponsService.createCoupon({
      nombre,
      monto: parseFloat(monto),
      tipo
    });
    
    res.status(201).json(newCoupon);
  } catch (error) {
    console.error("Error en createCoupon:", error);
    res.status(500).json({ 
      error: "Error al crear el cupón",
      message: error.message 
    });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, monto } = req.body;
    
    if (!nombre || !monto) {
      return res.status(400).json({ 
        error: "Nombre y monto son requeridos" 
      });
    }

    const updatedCoupon = await couponsService.updateCoupon(id, {
      nombre,
      monto: parseFloat(monto)
    });
    
    res.json(updatedCoupon);
  } catch (error) {
    console.error("Error en updateCoupon:", error);
    res.status(500).json({ 
      error: "Error al actualizar el cupón",
      message: error.message 
    });
  }
};

const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCoupon = await couponsService.toggleCouponStatus(id);
    res.json(updatedCoupon);
  } catch (error) {
    console.error("Error en toggleCouponStatus:", error);
    res.status(500).json({ 
      error: "Error al cambiar el estado del cupón",
      message: error.message 
    });
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus
};