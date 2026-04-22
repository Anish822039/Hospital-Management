// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const logger = require('../config/logger');

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.execute(
      `SELECT u.id, u.employee_id, u.full_name, u.email, u.password_hash,
              u.is_active, u.department, r.name AS role, r.id AS role_id
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      logger.warn('Failed login attempt for email: ' + email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last_login
    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    logger.info('Login: ' + user.email + ' (' + user.role + ')');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) { next(err); }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.employee_id, u.full_name, u.email, u.phone,
              u.department, u.last_login, u.created_at, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(400).json({ success: false, message: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    logger.info('Password changed for user: ' + req.user.email);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) { next(err); }
};
