const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/NotificationController");
const auth = require('../middleware/auth');

// User routes
router.post("/send-notification", NotificationController.adminCreateNotificationForAll);

router.get("/my", auth, NotificationController.getMyNotifications);
router.get("/unread-count", auth, NotificationController.getUnreadCount);
router.post("/mark-all-read", auth, NotificationController.markAllRead);

// Admin routes
router.post("/broadcast", auth, /* adminMiddleware, */ NotificationController.sendBroadcast);

module.exports = router;