// controllers/appointmentController.js
const db = require('../config/db');
const logger = require('../config/logger');

const genApptNo = async () => {
  const d = new Date();
  const prefix = 'APT' + d.getFullYear().toString().slice(-2) + String(d.getMonth()+1).padStart(2,'0');
  const [[{ cnt }]] = await db.execute("SELECT COUNT(*) as cnt FROM appointments WHERE DATE_FORMAT(created_at,'%Y%m') = DATE_FORMAT(NOW(),'%Y%m')");
  return prefix + String(cnt + 1).padStart(4,'0');
};

// GET /api/appointments
exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, +req.query.limit || 20);
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';
    if (req.query.date)       { where += ' AND a.appointment_date = ?'; params.push(req.query.date); }
    if (req.query.status)     { where += ' AND a.status = ?';           params.push(req.query.status); }
    if (req.query.doctor_id)  { where += ' AND a.doctor_id = ?';        params.push(req.query.doctor_id); }
    if (req.query.patient_id) { where += ' AND a.patient_id = ?';       params.push(req.query.patient_id); }
    if (req.user.role === 'doctor') {
      const [[doc]] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
      if (doc) { where += ' AND a.doctor_id = ?'; params.push(doc.id); }
    }
    const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM appointments a ' + where, params);
    const [rows] = await db.execute(
      `SELECT a.*, p.full_name AS patient_name, p.patient_id AS patient_code,
              du.full_name AS doctor_name, d.specialization
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users du ON d.user_id = du.id
       ${where} ORDER BY a.appointment_date DESC, a.appointment_time ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
};

// GET /api/appointments/:id
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.*, p.full_name AS patient_name, p.patient_id AS patient_code, p.phone AS patient_phone,
              du.full_name AS doctor_name, d.specialization, d.consultation_fee,
              bu.full_name AS booked_by_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users du ON d.user_id = du.id
       JOIN users bu ON a.booked_by = bu.id
       WHERE a.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/appointments
exports.create = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, type, duration_minutes, reason } = req.body;
    // Conflict check
    const [conflict] = await db.execute(
      `SELECT id FROM appointments WHERE doctor_id=? AND appointment_date=? AND appointment_time=? AND status NOT IN ('cancelled','no-show')`,
      [doctor_id, appointment_date, appointment_time]
    );
    if (conflict.length) return res.status(409).json({ success: false, message: 'Doctor already has an appointment at this time' });

    const apptNo = await genApptNo();
    const [result] = await db.execute(
      'INSERT INTO appointments (appointment_no, patient_id, doctor_id, appointment_date, appointment_time, type, duration_minutes, reason, booked_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [apptNo, patient_id, doctor_id, appointment_date, appointment_time, type||'consultation', duration_minutes||30, reason, req.user.id]
    );
    logger.info('Appointment created: ' + apptNo);
    res.status(201).json({ success: true, message: 'Appointment booked', data: { id: result.insertId, appointment_no: apptNo } });
  } catch (err) { next(err); }
};

// PUT /api/appointments/:id
exports.update = async (req, res, next) => {
  try {
    const { appointment_date, appointment_time, type, duration_minutes, status, notes, reason } = req.body;
    const [result] = await db.execute(
      'UPDATE appointments SET appointment_date=?, appointment_time=?, type=?, duration_minutes=?, status=?, notes=?, reason=? WHERE id=?',
      [appointment_date, appointment_time, type, duration_minutes, status, notes, reason, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, message: 'Appointment updated' });
  } catch (err) { next(err); }
};

// PATCH /api/appointments/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['scheduled','confirmed','in-progress','completed','cancelled','no-show'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    await db.execute('UPDATE appointments SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true, message: 'Status updated to ' + status });
  } catch (err) { next(err); }
};

// DELETE /api/appointments/:id (cancel)
exports.cancel = async (req, res, next) => {
  try {
    await db.execute("UPDATE appointments SET status='cancelled' WHERE id=?", [req.params.id]);
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) { next(err); }
};
