const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');

function optionalAuth(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    req.user = user || null;
  } catch (e) {
    req.user = null;
  }
  next();
}

module.exports = optionalAuth;
