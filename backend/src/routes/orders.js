'use strict';
const router = require('express').Router();
const ctrl = require("../controllers/OrderController");
const auth = require("../middleware/auth");
const role = require('../middleware/role');

router.get("/allOrderss", auth, ctrl.allOrders);
router.post("/", ctrl.createOrder);
router.post("/verify", ctrl.verifyPayment);
router.get("/user/:userId", ctrl.userOrders);
router.get("/already-purchased", auth, ctrl.alreadyPurchased);

router.get("/:orderId", auth, ctrl.getOrderById);
router.delete("/:orderId", auth, ctrl.deleteOrder);
router.post('/admin/assign-course', auth, role(["admin"]), ctrl.adminAssignCourse);
router.post('/admin/reverse-assign-course', auth, role(["admin"]), ctrl.adminReverseAssignCourse);

router.get("/quiz-orders/:userId", ctrl.getUserQuizOrders);


router.post("/admin/assign-subject", ctrl.adminAssignSubject);
router.post("/admin/assign-quiz", ctrl.adminAssignQuiz);
router.post("/admin/assign-testseries", ctrl.adminAssignTestSeries);
router.post("/admin/revoke-subject", ctrl.adminRevokeSubject);
router.post("/admin/revoke-quiz", ctrl.adminRevokeQuiz);
router.post("/admin/revoke-testseries", ctrl.adminRevokeTestSeries);
router.post("/admin/update-access-validity-days", ctrl.updateAccessValidityDays);


router.get("/admin/user/:userId/quizzes", ctrl.getUserAssignedQuizzes);
router.get("/admin/user/:userId/subjets", ctrl.getAdminSubjectAssigned);

router.get("/admin/user/:userId/testseries", ctrl.getUserAssignedTestSeries);

module.exports = router;
