const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');

function optionalAuth(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (authHeader) return res.status(401).json({ error: 'Invalid authorization header' });
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  next();
}

module.exports = optionalAuth;
