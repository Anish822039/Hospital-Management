// controllers/complaintController.js
const db = require('../config/db');

const genTicket = async () => {
  const [[{ cnt }]] = await db.execute("SELECT COUNT(*) as cnt FROM complaints WHERE YEAR(created_at)=YEAR(NOW())");
  return 'TKT' + new Date().getFullYear() + String(cnt + 1).padStart(4,'0');
};

// GET /api/complaints
exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, +req.query.limit || 20);
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';
    if (req.query.status)   { where += ' AND c.status = ?';   params.push(req.query.status); }
    if (req.query.priority) { where += ' AND c.priority = ?'; params.push(req.query.priority); }
    if (req.query.category) { where += ' AND c.category = ?'; params.push(req.query.category); }
    // Non-admins only see their own unless they are admin
    if (req.user.role !== 'admin') { where += ' AND c.reported_by = ?'; params.push(req.user.id); }

    const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM complaints c ' + where, params);
    const [rows] = await db.execute(
      `SELECT c.*, u.full_name AS reported_by_name, au.full_name AS assigned_to_name
       FROM complaints c
       JOIN users u ON c.reported_by = u.id
       LEFT JOIN users au ON c.assigned_to = au.id
       ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
};

// GET /api/complaints/:id
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT c.*, u.full_name AS reported_by_name, au.full_name AS assigned_to_name
       FROM complaints c JOIN users u ON c.reported_by = u.id LEFT JOIN users au ON c.assigned_to = au.id
       WHERE c.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/complaints
exports.create = async (req, res, next) => {
  try {
    const { category, priority, title, description, location } = req.body;
    const ticket = await genTicket();
    const [result] = await db.execute(
      'INSERT INTO complaints (ticket_no, reported_by, category, priority, title, description, location) VALUES (?,?,?,?,?,?,?)',
      [ticket, req.user.id, category, priority || 'medium', title, description, location]
    );
    res.status(201).json({ success: true, message: 'Complaint submitted', data: { id: result.insertId, ticket_no: ticket } });
  } catch (err) { next(err); }
};

// PUT /api/complaints/:id  (Admin: assign, update status, resolve)
exports.update = async (req, res, next) => {
  try {
    const { status, assigned_to, resolution_note } = req.body;
    const resolved_at = status === 'resolved' ? new Date() : null;
    await db.execute(
      'UPDATE complaints SET status=?, assigned_to=?, resolution_note=?, resolved_at=? WHERE id=?',
      [status, assigned_to || null, resolution_note || null, resolved_at, req.params.id]
    );
    res.json({ success: true, message: 'Complaint updated' });
  } catch (err) { next(err); }
};
