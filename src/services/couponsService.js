const { query } = require("../../db");

const getCoupons = async () => {
  const result = await query(
    `SELECT idcupon, nombre, monto, veces_usado, estado, tipo 
     FROM cupones 
     WHERE estado != 2 
     ORDER BY idcupon DESC`
  );
  return result.rows;
};

const createCoupon = async (couponData) => {
  const { nombre, monto, tipo } = couponData;
  
  // Verificar si ya existe un cupón con el mismo nombre
  const existingCoupon = await query(
    "SELECT idcupon FROM cupones WHERE nombre = $1 AND estado != 2",
    [nombre]
  );
  
  if (existingCoupon.rows.length > 0) {
    throw new Error("Ya existe un cupón con este nombre");
  }
  
  const result = await query(
    `INSERT INTO cupones (nombre, monto, tipo, estado, veces_usado) 
     VALUES ($1, $2, $3, 0, 0) 
     RETURNING idcupon, nombre, monto, veces_usado, estado, tipo`,
    [nombre, monto, tipo]
  );
  
  return result.rows[0];
};

const updateCoupon = async (id, couponData) => {
  const { nombre, monto } = couponData;
  
  // Verificar si el cupón existe
  const existingCoupon = await query(
    "SELECT idcupon FROM cupones WHERE idcupon = $1 AND estado != 2",
    [id]
  );
  
  if (existingCoupon.rows.length === 0) {
    throw new Error("Cupón no encontrado");
  }
  
  // Verificar si ya existe otro cupón con el mismo nombre
  const duplicateCoupon = await query(
    "SELECT idcupon FROM cupones WHERE nombre = $1 AND idcupon != $2 AND estado != 2",
    [nombre, id]
  );
  
  if (duplicateCoupon.rows.length > 0) {
    throw new Error("Ya existe otro cupón con este nombre");
  }
  
  const result = await query(
    `UPDATE cupones 
     SET nombre = $1, monto = $2 
     WHERE idcupon = $3 
     RETURNING idcupon, nombre, monto, veces_usado, estado, tipo`,
    [nombre, monto, id]
  );
  
  return result.rows[0];
};

const toggleCouponStatus = async (id) => {
  // Verificar si el cupón existe
  const existingCoupon = await query(
    "SELECT estado FROM cupones WHERE idcupon = $1 AND estado != 2",
    [id]
  );
  
  if (existingCoupon.rows.length === 0) {
    throw new Error("Cupón no encontrado");
  }
  
  const currentStatus = existingCoupon.rows[0].estado;
  const newStatus = currentStatus === 0 ? 1 : 0;
  
  const result = await query(
    `UPDATE cupones 
     SET estado = $1 
     WHERE idcupon = $2 
     RETURNING idcupon, nombre, monto, veces_usado, estado, tipo`,
    [newStatus, id]
  );
  
  return result.rows[0];
};

module.exports = {
  getCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus
};