// middleware/auditLog.js — write to audit_logs table
const db = require('../config/db');
const logger = require('../config/logger');

const audit = (action, module) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    if (body && body.success !== false) {
      try {
        await db.execute(
          'INSERT INTO audit_logs (user_id, action, module, record_id, details, ip_address) VALUES (?,?,?,?,?,?)',
          [
            req.user ? req.user.id : null,
            action, module,
            body.data ? (body.data.id || null) : null,
            JSON.stringify({ method: req.method, url: req.originalUrl, body: req.body }),
            req.ip
          ]
        );
      } catch (err) {
        logger.error('Audit log error:', err.message);
      }
    }
    return originalJson(body);
  };
  next();
};

module.exports = audit;
