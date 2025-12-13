const jwt = require('jsonwebtoken');
require('dotenv').config();

function sign(payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn });
}

function verify(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'secret');
}

module.exports = { sign, verify };
