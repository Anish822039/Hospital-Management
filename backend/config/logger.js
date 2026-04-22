// config/logger.js — Structured logging with Winston
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    // Console (colourised in dev)
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message}${extra}`;
        })
      ),
    }),
    // Rotating file logs
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level:    'error',
      maxsize:  10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize:  20 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
});

module.exports = logger;
