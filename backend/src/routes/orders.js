'use strict';
const router = require('express').Router();
const ctrl = require("../controllers/OrderController");
const auth = require("../middleware/auth");

router.get("/allOrderss", auth, ctrl.allOrders);
router.post("/", auth, ctrl.createOrder);
router.post("/verify",  ctrl.verifyPayment);
router.get("/user/:userId",  ctrl.userOrders);
router.get("/:orderId", auth, ctrl.getOrderById);
router.delete("/:orderId", auth, ctrl.deleteOrder);


module.exports = router;
