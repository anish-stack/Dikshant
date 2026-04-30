// ─── AppError ─────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── asyncHandler ─────────────────────────────────────────────────────────────

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─── Pagination ───────────────────────────────────────────────────────────────

const paginate = (page = 1, limit = 20) => ({
  limit: Math.min(parseInt(limit), 200),
  offset: (Math.max(parseInt(page), 1) - 1) * Math.min(parseInt(limit), 200),
});

// ─── Slug ─────────────────────────────────────────────────────────────────────

const generateSlug = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ─── Date Helpers ─────────────────────────────────────────────────────────────

const isToday = (date) => {
  const d = new Date(date);
  const now = new Date();
  return d.getDate() === now.getDate()
    && d.getMonth() === now.getMonth()
    && d.getFullYear() === now.getFullYear();
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// ─── String Helpers ───────────────────────────────────────────────────────────

const maskEmail = (email) => {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
};

// ─── Response Helpers ─────────────────────────────────────────────────────────

const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ status: 'success', data });
};

module.exports = { AppError, asyncHandler, paginate, generateSlug, isToday, addDays, maskEmail, sendSuccess };