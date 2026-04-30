const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { User, TestAttemptDikshant:TestAttempt, StudentPurchaseDikshant:StudentPurchase, RankingDikshant:Ranking, sequelize } = require('../models');
const { AppError, asyncHandler, paginate } = require('../utils/NewHelpers');

// ─── User Management [admin] ──────────────────────────────────────────────────

// GET /admin/users
exports.listUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 50, sort = 'createdAt', order = 'DESC' } = req.query;
  const where = {};
  if (role) where.role = role;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }

  const validSorts = ['createdAt', 'name', 'last_login_at', 'streak_count'];
  const sortCol = validSorts.includes(sort) ? sort : 'createdAt';

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password_hash'] },
    order: [[sortCol, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
    ...paginate(page, limit),
  });

  res.json({ status: 'success', data: { users: rows, total: count, page: +page, limit: +limit } });
});

// GET /admin/users/:id
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password_hash'] },
    include: [
      {
        model: StudentPurchase,
        where: { payment_status: 'success' },
        required: false,
        attributes: ['id', 'purchase_type', 'amount_paid', 'createdAt'],
      },
    ],
  });
  if (!user) throw new AppError('User not found', 404);

  const [attemptCount, totalSpend] = await Promise.all([
    TestAttempt.count({ where: { user_id: user.id } }),
    StudentPurchase.sum('amount_paid', { where: { user_id: user.id, payment_status: 'success' } }),
  ]);

  res.json({ status: 'success', data: { user, stats: { attempts: attemptCount, total_spend: totalSpend || 0 } } });
});

// POST /admin/users  [super_admin]
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError('Email already exists', 409);

  const password_hash = await bcrypt.hash(password, 12);

  const user = await User.create({ name, email, phone, password_hash, role: role || 'student', is_verified: true });

  res.status(201).json({
    status: 'success',
    data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
  });
});

// PUT /admin/users/:id  [admin]
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, phone, role, is_verified, upsc_year, attempt_number } = req.body;

  // Super admin only can change role
  if (role && req.user.role !== 'super_admin') {
    throw new AppError('Only super admin can change roles', 403);
  }

  const user = await User.findByPk(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  await user.update({ name, phone, role, is_verified, upsc_year, attempt_number });

  res.json({ status: 'success', data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
});

// DELETE /admin/users/:id  [super_admin]
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.id === req.user.id) throw new AppError('Cannot delete yourself', 400);

  await user.destroy();
  res.json({ status: 'success', message: 'User deleted' });
});

// PUT /admin/users/:id/reset-password  [admin]
exports.adminResetPassword = asyncHandler(async (req, res) => {
  const { new_password } = req.body;
  const user = await User.findByPk(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  const password_hash = await bcrypt.hash(new_password, 12);
  await user.update({ password_hash });

  res.json({ status: 'success', message: 'Password reset' });
});

// GET /admin/users/:id/attempts
exports.getUserAttempts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const { count, rows } = await TestAttempt.findAndCountAll({
    where: { user_id: req.params.id },
    include: [{ model: require('../models').Test, attributes: ['id', 'title', 'type', 'total_marks'] }],
    order: [['createdAt', 'DESC']],
    ...paginate(page, limit),
  });

  res.json({ status: 'success', data: { attempts: rows, total: count } });
});

// POST /admin/users/bulk-email  [admin]
exports.bulkEmail = asyncHandler(async (req, res) => {
  const { user_ids, subject, body, filter } = req.body;
  const { sendEmail } = require('../services/email.service');

  let targets = [];
  if (user_ids?.length) {
    targets = await User.findAll({ where: { id: { [Op.in]: user_ids } }, attributes: ['id', 'name', 'email'] });
  } else if (filter) {
    const where = { role: 'student' };
    if (filter.purchased_series_id) {
      const purchases = await StudentPurchase.findAll({
        where: { series_id: filter.purchased_series_id, payment_status: 'success' },
        attributes: ['user_id'],
      });
      where.id = { [Op.in]: purchases.map(p => p.user_id) };
    }
    targets = await User.findAll({ where, attributes: ['id', 'name', 'email'] });
  }

  for (const user of targets) {
    await sendEmail({ to: user.email, subject, template: 'custom', data: { name: user.name, body } });
  }

  res.json({ status: 'success', message: `Email queued for ${targets.length} users` });
});

// ─── Rank Management [admin] ──────────────────────────────────────────────────

// POST /admin/ranks/recalculate  [admin]
exports.triggerRankRecalculation = asyncHandler(async (req, res) => {
  const { test_id } = req.body;
  const { rankCalculationQueue } = require('../jobs/queues');

  const job = await rankCalculationQueue.add('calculate-ranks', { test_id }, { jobId: `rank-${test_id}-${Date.now()}` });

  res.json({ status: 'success', message: 'Rank recalculation triggered', job_id: job.id });
});

// GET /admin/ranks/:test_id
exports.getTestRanks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  const { count, rows } = await Ranking.findAndCountAll({
    where: { test_id: req.params.test_id },
    include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    order: [['rank', 'ASC']],
    ...paginate(page, limit),
  });

  res.json({ status: 'success', data: { rankings: rows, total: count } });
});

// ─── System [super_admin] ─────────────────────────────────────────────────────

// GET /admin/system/health
exports.systemHealth = asyncHandler(async (req, res) => {
  const { redisClient } = require('../config/redis');

  let dbOk = false, redisOk = false;
  try {
    await sequelize.authenticate();
    dbOk = true;
  } catch {}
  try {
    await redisClient.ping();
    redisOk = true;
  } catch {}

  res.json({
    status: 'success',
    data: {
      db: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV,
    },
  });
});

// GET /admin/system/queue-stats  [super_admin]
exports.getQueueStats = asyncHandler(async (req, res) => {
  const { rankCalculationQueue, notificationQueue, linkCheckQueue } = require('../jobs/queues');

  const [rankCounts, notifCounts, linkCounts] = await Promise.all([
    rankCalculationQueue.getJobCounts(),
    notificationQueue.getJobCounts(),
    linkCheckQueue.getJobCounts(),
  ]);

  res.json({
    status: 'success',
    data: {
      rank_queue: rankCounts,
      notification_queue: notifCounts,
      link_check_queue: linkCounts,
    },
  });
});
