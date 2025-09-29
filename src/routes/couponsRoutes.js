const express = require("express");
const router = express.Router();
const couponsController = require("../controllers/couponsController");

// Rutas para cupones
router.get("/coupons", couponsController.getCoupons);
router.post("/coupons", couponsController.createCoupon);
router.put("/coupons/:id", couponsController.updateCoupon);
router.patch("/coupons/:id/update-status", couponsController.toggleCouponStatus);

module.exports = router;