// config/db.js — MySQL connection pool using mysql2
const mysql = require('mysql2/promise');
const logger = require('./logger');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'hms_user',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'hms_db',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  // Prevent SQL injection — use prepared statements throughout
  namedPlaceholders:  true,
  charset:            'utf8mb4',
});

// Verify connection on startup
pool.getConnection()
  .then(conn => {
    logger.info('✅  MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    logger.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
