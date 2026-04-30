const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('../utils/NewHelpers');

// ─── Auth Middleware ──────────────────────────────────────────────────────────

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError('Authentication required', 401));
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return next(new AppError('Token expired', 401));
      return next(new AppError('Invalid token', 401));
    }

    const user = await User.findByPk(decoded.id, { attributes: ['id', 'role', 'is_verified', 'deletedAt'] });
    if (!user) return next(new AppError('User no longer exists', 401));

    req.user = { id: user.id, role: user.role, is_verified: user.is_verified };
    next();
  } catch (err) {
    next(err);
  }
};

// Optional auth — attach user if token present, don't fail if not
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, { attributes: ['id', 'role', 'is_verified'] });
        if (user) req.user = { id: user.id, role: user.role, is_verified: user.is_verified };
      } catch {}
    }
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Role Middleware ──────────────────────────────────────────────────────────

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};

// Shorthand role checks
exports.isAdmin = exports.restrictTo('content_admin', 'series_admin', 'super_admin');
exports.isSuperAdmin = exports.restrictTo('super_admin');
exports.isEvaluator = exports.restrictTo('evaluator', 'super_admin');
exports.isAnyAdmin = exports.restrictTo('content_admin', 'series_admin', 'super_admin', 'evaluator');

// ─── Validation Middleware (Joi) ──────────────────────────────────────────────

const Joi = require('joi');

const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], { abortEarly: false, stripUnknown: true });
  if (error) {
    const message = error.details.map(d => d.message).join(', ');
    return next(new AppError(message, 400));
  }
  req[target] = value;
  next();
};

// Schemas
exports.validateRegister = validate(Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
  password: Joi.string().min(8).required(),
  upsc_year: Joi.number().integer().min(2024).max(2035).optional(),
  attempt_number: Joi.number().integer().min(1).max(10).optional(),
  referral_code: Joi.string().optional(),
}));

exports.validateLogin = validate(Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}));

exports.validateCreateSeries = validate(Joi.object({
  title: Joi.string().min(3).max(255).required(),
  type: Joi.string().valid('prelims', 'mains').required(),
  description: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  discount_price: Joi.number().min(0).optional(),
  is_free: Joi.boolean().optional(),
  total_tests: Joi.number().integer().optional(),
}));

exports.validateCreateTest = validate(Joi.object({
  series_id: Joi.string().uuid().required(),
  title: Joi.string().min(3).max(255).required(),
  test_number: Joi.number().integer().min(1).required(),
  type: Joi.string().valid('prelims', 'mains').optional(),
  scheduled_start: Joi.date().required(),
  scheduled_end: Joi.date().greater(Joi.ref('scheduled_start')).required(),
  duration_minutes: Joi.number().integer().min(1).max(360).required(),
  total_marks: Joi.number().integer().min(1).required(),
  negative_marking: Joi.number().min(0).max(1).optional(),
  is_free: Joi.boolean().optional(),
  instructions: Joi.string().optional(),
}));

exports.validateCreateQuestion = validate(Joi.object({
  test_id: Joi.string().uuid().required(),
  question_text: Joi.string().min(5).required(),
  subject: Joi.string().max(100).required(),
  topic: Joi.string().max(100).optional(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
  correct_option: Joi.number().integer().min(1).max(4).required(),
  marks: Joi.number().min(0.5).optional(),
  explanation: Joi.string().optional(),
  explanation_html: Joi.string().optional(),
  source: Joi.string().uri().optional().allow(''),
  video_url: Joi.string().uri().optional().allow(''),
  article_url: Joi.string().uri().optional().allow(''),
  order_index: Joi.number().integer().optional(),
  options: Joi.array().items(Joi.object({
    text: Joi.string().required(),
    image: Joi.string().optional(),
  })).min(2).max(4).required(),
}));

exports.validatePurchase = validate(Joi.object({
  purchase_type: Joi.string().valid('series', 'single_test').required(),
  series_id: Joi.string().uuid().optional(),
  test_id: Joi.string().uuid().optional(),
  coupon_code: Joi.string().optional(),
}));

exports.validateCreateCoupon = validate(Joi.object({
  code: Joi.string().alphanum().min(4).max(20).required(),
  discount_type: Joi.string().valid('flat', 'percent').required(),
  discount_value: Joi.number().min(1).required(),
  max_uses: Joi.number().integer().optional(),
  valid_from: Joi.date().required(),
  valid_until: Joi.date().greater(Joi.ref('valid_from')).required(),
  applicable_series: Joi.array().items(Joi.string().uuid()).optional(),
  min_amount: Joi.number().min(0).optional(),
}));

// ─── Global Error Handler ─────────────────────────────────────────────────────

exports.globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path;
    err.statusCode = 409;
    err.message = `${field} already exists`;
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    err.statusCode = 400;
    err.message = err.errors.map(e => e.message).join(', ');
  }

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production: hide internal errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({ status: err.status, message: err.message });
  }

  console.error('UNEXPECTED ERROR:', err);
  return res.status(500).json({ status: 'error', message: 'Something went wrong' });
};

// ─── Rate Limit ───────────────────────────────────────────────────────────────
const rateLimit = require('express-rate-limit');

exports.defaultLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { status: 'error', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many auth attempts, try again in 15 minutes' },
});

exports.submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { status: 'error', message: 'Too many submission attempts' },
});