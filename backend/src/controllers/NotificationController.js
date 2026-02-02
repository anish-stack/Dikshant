// controllers/NotificationController.js
const { Notification, User } = require("../models");
const { notificationQueue } = require("../queues/notificationQueue");
const sendNotification = require("../utils/sendNotifications");

class NotificationController {
  // Create notification (internal use)
  static async createNotification({
    userId,
    title,
    message,
    type = "general",
    relatedId = null,
  }) {
    try {
      // Save notification in DB
      const notification = await Notification.create({
        userId,
        title,
        message,
        type,
        relatedId,
      });

      // Fetch user's FCM token
      const user = await User.findByPk(userId, { attributes: ["fcm_token"] });

      if (user?.fcm_token) {
        // Send push notification
        await sendNotification.sendNotification(
          user.fcm_token,
          title,
          message,
          type
        );
      }

      return notification;
    } catch (error) {
      console.error("Notification create error:", error);
    }
  }

 static async adminCreateNotificationForAll(req, res) {
    const { title, message, channel, personalized } = req.body;

    try {
 
      const users = await User.findAll({ attributes: ['fcm_token'] });
      const tokens = users.map(u => u.fcm_token).filter(Boolean);

      if (!tokens.length) {
        return res.status(400).json({ message: 'No users with FCM tokens found' });
      }
      await notificationQueue.add({ tokens, title, message, channel });

      return res.status(200).json({ message: 'Notification job queued successfully' });
    } catch (error) {
      console.error('Notification create error:', error);
      return res.status(500).json({ message: 'Failed to send notifications' });
    }
  }


  // Get user's notifications
  static async getMyNotifications(req, res) {
    try {
      const userId = req.user?.id || req.params.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const { count, rows } = await Notification.findAndCountAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      // Mark as read (optional)
      await Notification.update(
        { isRead: true },
        { where: { userId, isRead: false } }
      );

      return res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
          hasMore: page * limit < count,
        },
      });
    } catch (error) {
      console.error("getMyNotifications error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Mark all as read
  static async markAllRead(req, res) {
    try {
      const userId = req.user?.id;

      await Notification.update(
        { isRead: true },
        { where: { userId, isRead: false } }
      );

      return res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Get unread count
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user?.id;

      const count = await Notification.count({
        where: { userId, isRead: false },
      });

      return res.json({ success: true, unreadCount: count });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Admin: Send broadcast notification to all users
  static async sendBroadcast(req, res) {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res
          .status(400)
          .json({ success: false, message: "title and message required" });
      }

      // Get all users with FCM tokens
      const users = await User.findAll({
        attributes: ["id", "fcm_token"],
        where: { fcm_token: { [require("sequelize").Op.ne]: null } },
      });

      const notifications = users.map((u) => ({
        userId: u.id,
        title,
        message,
        type: "admin_broadcast",
      }));

      await Notification.bulkCreate(notifications);

      // Send push notifications to all users with token
      await Promise.all(
        users.map((u) =>
          sendNotification.sendNotification(
            u.fcm_token,
            title,
            message,
            "admin_broadcast"
          )
        )
      );

      return res.json({
        success: true,
        message: "Broadcast sent to all users",
      });
    } catch (error) {
      console.error("sendBroadcast error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

module.exports = NotificationController;
