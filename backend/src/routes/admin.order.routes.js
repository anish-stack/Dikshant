
const router = require("express").Router();
const AdminOrderController = require("../controllers/AdminOrderController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

// router.use(auth)
// router.use(role(["admin"]))

router.get("/orders", AdminOrderController.getAllOrders);
router.get("/orders/stats", AdminOrderController.getOrderStats);
router.post("/orders/:orderId/cancel", AdminOrderController.cancelOrder);
router.get("/orders/export", AdminOrderController.exportOrders);


module.exports = router