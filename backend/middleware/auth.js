// middleware/auth.js — JWT verification & RBAC
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.execute(
      'SELECT u.id, u.employee_id, u.full_name, u.email, u.role_id, u.is_active, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [decoded.userId]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' });
    logger.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    logger.warn('Unauthorized: ' + req.user.email + ' on ' + req.originalUrl);
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, authorize };
