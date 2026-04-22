// controllers/doctorController.js
const db = require('../config/db');

// GET /api/doctors
exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.id, d.user_id, d.specialization, d.license_number, d.consultation_fee,
              d.available_days, d.available_from, d.available_to,
              u.full_name, u.email, u.phone, u.department, u.employee_id, u.is_active
       FROM doctors d JOIN users u ON d.user_id = u.id
       WHERE u.is_active = 1 ORDER BY u.full_name`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/doctors/:id
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*, u.full_name, u.email, u.phone, u.department, u.employee_id
       FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/doctors  (link existing doctor-role user)
exports.create = async (req, res, next) => {
  try {
    const { user_id, specialization, license_number, consultation_fee, available_days, available_from, available_to } = req.body;
    const [result] = await db.execute(
      'INSERT INTO doctors (user_id, specialization, license_number, consultation_fee, available_days, available_from, available_to) VALUES (?,?,?,?,?,?,?)',
      [user_id, specialization, license_number, consultation_fee||0, available_days||'Mon,Tue,Wed,Thu,Fri', available_from||'09:00', available_to||'17:00']
    );
    res.status(201).json({ success: true, message: 'Doctor profile created', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

// PUT /api/doctors/:id
exports.update = async (req, res, next) => {
  try {
    const { specialization, license_number, consultation_fee, available_days, available_from, available_to } = req.body;
    const [result] = await db.execute(
      'UPDATE doctors SET specialization=?, license_number=?, consultation_fee=?, available_days=?, available_from=?, available_to=? WHERE id=?',
      [specialization, license_number, consultation_fee, available_days, available_from, available_to, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, message: 'Doctor profile updated' });
  } catch (err) { next(err); }
};
