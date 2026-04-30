const { Op } = require('sequelize');
const {NotificationDikshant:Notification, User, sequelize } = require('../models');
const { AppError, asyncHandler, paginate } = require('../utils/NewHelpers');
const { notificationQueue } = require('../queue');

// ─── Student ──────────────────────────────────────────────────────────────────

// GET /notifications
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread_only } = req.query;
  const where = {
    [Op.or]: [{ user_id: req.user.id }, { user_id: null }], // include broadcasts
  };
  if (unread_only === 'true') where.is_read = false;

  const { count, rows } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    ...paginate(page, limit),
  });

  res.json({ status: 'success', data: { notifications: rows, total: count, unread: count } });
});

// GET /notifications/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.count({
    where: {
      [Op.or]: [{ user_id: req.user.id }, { user_id: null }],
      is_read: false,
    },
  });
  res.json({ status: 'success', data: { count } });
});

// PUT /notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  await Notification.update(
    { is_read: true },
    { where: { id: req.params.id, user_id: req.user.id } }
  );
  res.json({ status: 'success', message: 'Marked as read' });
});

// PUT /notifications/mark-all-read
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.update(
    { is_read: true },
    { where: { user_id: req.user.id, is_read: false } }
  );
  res.json({ status: 'success', message: 'All notifications marked as read' });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// POST /notifications/send  [admin]
exports.sendNotification = asyncHandler(async (req, res) => {
  const { title, body, type, user_ids, broadcast, test_id, series_id, scheduled_at } = req.body;

  if (broadcast) {
    // Create single broadcast record
    const notification = await Notification.create({
      user_id: null,
      title,
      body,
      type: type || 'announcement',
      meta: { test_id, series_id },
      scheduled_at: scheduled_at || new Date(),
    });

    await notificationQueue.add('send-broadcast', {
      notification_id: notification.id,
      title,
      body,
    }, { delay: scheduled_at ? new Date(scheduled_at) - Date.now() : 0 });

    return res.json({ status: 'success', message: 'Broadcast queued', notification_id: notification.id });
  }

  if (!user_ids?.length) throw new AppError('user_ids or broadcast required', 400);

  // Bulk create per-user notifications
  const records = user_ids.map(uid => ({
    user_id: uid,
    title,
    body,
    type: type || 'announcement',
    meta: { test_id, series_id },
    scheduled_at: scheduled_at || new Date(),
  }));

  const notifications = await Notification.bulkCreate(records);

  // Queue push
  for (const notif of notifications) {
    await notificationQueue.add('send-push', {
      user_id: notif.user_id,
      title,
      body,
      notification_id: notif.id,
    }, { delay: scheduled_at ? new Date(scheduled_at) - Date.now() : 0 });
  }

  res.json({ status: 'success', message: `Sent to ${user_ids.length} users` });
});

// POST /notifications/send-test-reminder  [admin/auto]
exports.sendTestReminder = asyncHandler(async (req, res) => {
  const { test_id, hours_before } = req.body;

  const test = await require('../models').Test.findByPk(test_id, {
    include: [{ model: require('../models').TestSeries, attributes: ['id', 'title'] }],
  });
  if (!test) throw new AppError('Test not found', 404);

  // Get all purchased students for this series
  const purchases = await require('../models').StudentPurchase.findAll({
    where: { series_id: test.series_id, payment_status: 'success' },
    attributes: ['user_id'],
  });

  const userIds = [...new Set(purchases.map(p => p.user_id))];

  const reminderTime = hours_before === 1 ? '1 hour' : hours_before === 24 ? '1 day' : `${hours_before} hours`;

  const records = userIds.map(uid => ({
    user_id: uid,
    title: `Reminder: ${test.title} starts in ${reminderTime}`,
    body: `Don't miss ${test.TestSeries?.title} — ${test.title}. Click to prepare!`,
    type: 'reminder',
    meta: { test_id, series_id: test.series_id },
    scheduled_at: new Date(),
  }));

  await Notification.bulkCreate(records, { ignoreDuplicates: true });

  for (const uid of userIds) {
    await notificationQueue.add('send-push', {
      user_id: uid,
      title: `Test Reminder: ${test.title}`,
      body: `Starts in ${reminderTime}`,
    });
  }

  res.json({ status: 'success', message: `Reminders queued for ${userIds.length} students` });
});

// GET /notifications/admin/list  [admin]
exports.adminListNotifications = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 50 } = req.query;
  const where = {};
  if (type) where.type = type;

  const { count, rows } = await Notification.findAndCountAll({
    where,
    include: [{ model: User, attributes: ['id', 'name', 'email'], required: false }],
    order: [['createdAt', 'DESC']],
    ...paginate(page, limit),
  });

  res.json({ status: 'success', data: { notifications: rows, total: count } });
});

// DELETE /notifications/:id  [admin]
exports.deleteNotification = asyncHandler(async (req, res) => {
  await Notification.destroy({ where: { id: req.params.id } });
  res.json({ status: 'success', message: 'Deleted' });
});
