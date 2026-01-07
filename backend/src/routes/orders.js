'use strict';
const router = require('express').Router();
const ctrl = require("../controllers/OrderController");
const auth = require("../middleware/auth");
const role = require('../middleware/role');

router.get("/allOrderss", auth, ctrl.allOrders);
router.post("/", ctrl.createOrder);
router.post("/verify", ctrl.verifyPayment);
router.get("/user/:userId", ctrl.userOrders);
router.get("/:orderId", auth, ctrl.getOrderById);
router.delete("/:orderId", auth, ctrl.deleteOrder);
router.post('/admin/assign-course', auth, role(["admin"]), ctrl.adminAssignCourse);
module.exports = router;
