// controllers/userController.js — Employee management (Admin only)
const bcrypt = require('bcryptjs');
const db     = require('../config/db');
const logger = require('../config/logger');

// Pagination helper
const paginate = (total, page, limit) => ({
  total, page: +page, limit: +limit,
  pages: Math.ceil(total / limit)
});

// GET /api/users
exports.getAll = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search ? '%' + req.query.search + '%' : null;

    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)'; params.push(search, search, search); }
    if (req.query.role) { where += ' AND r.name = ?'; params.push(req.query.role); }

    const [[{ total }]] = await db.execute(
      'SELECT COUNT(*) as total FROM users u JOIN roles r ON u.role_id = r.id ' + where,
      params
    );
    const [rows] = await db.execute(
      `SELECT u.id, u.employee_id, u.full_name, u.email, u.phone, u.department, u.is_active, u.last_login, u.created_at, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: rows, pagination: paginate(total, page, limit) });
  } catch (err) { next(err); }
};

// GET /api/users/:id
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.employee_id, u.full_name, u.email, u.phone, u.department, u.is_active, u.last_login, u.created_at, r.name AS role, r.id AS role_id
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/users
exports.create = async (req, res, next) => {
  try {
    const { employee_id, full_name, email, phone, password, role_id, department } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (employee_id, full_name, email, phone, password_hash, role_id, department) VALUES (?,?,?,?,?,?,?)',
      [employee_id, full_name, email.toLowerCase().trim(), phone, hash, role_id, department]
    );
    logger.info('Employee created: ' + email + ' by ' + req.user.email);
    res.status(201).json({ success: true, message: 'Employee created', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

// PUT /api/users/:id
exports.update = async (req, res, next) => {
  try {
    const { full_name, email, phone, role_id, department, is_active } = req.body;
    const [result] = await db.execute(
      'UPDATE users SET full_name=?, email=?, phone=?, role_id=?, department=?, is_active=? WHERE id=?',
      [full_name, email.toLowerCase().trim(), phone, role_id, department, is_active, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee updated' });
  } catch (err) { next(err); }
};

// DELETE /api/users/:id  (soft-delete: deactivate)
exports.remove = async (req, res, next) => {
  try {
    if (req.params.id == req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }
    const [result] = await db.execute('UPDATE users SET is_active = FALSE WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Employee not found' });
    logger.info('Employee deactivated: id=' + req.params.id + ' by ' + req.user.email);
    res.json({ success: true, message: 'Employee deactivated' });
  } catch (err) { next(err); }
};

// PUT /api/users/:id/reset-password  (Admin)
exports.resetPassword = async (req, res, next) => {
  try {
    const { new_password } = req.body;
    const hash = await bcrypt.hash(new_password, 12);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
    logger.info('Password reset for user id=' + req.params.id + ' by ' + req.user.email);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
};
