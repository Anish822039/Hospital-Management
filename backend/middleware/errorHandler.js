// middleware/errorHandler.js — global error handler
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, url: req.originalUrl, method: req.method });

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry: record already exists' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'Referenced record not found' });
  }

  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message;

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
