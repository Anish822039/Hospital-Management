// controllers/patientController.js
const db     = require('../config/db');
const logger = require('../config/logger');

const genPatientId = async () => {
  const year = new Date().getFullYear().toString().slice(-2);
  const [[{ cnt }]] = await db.execute("SELECT COUNT(*) as cnt FROM patients WHERE YEAR(created_at) = YEAR(NOW())");
  return 'PAT' + year + String(cnt + 1).padStart(5, '0');
};

// GET /api/patients
exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, +req.query.limit || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search ? '%' + req.query.search + '%' : null;

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (p.full_name LIKE ? OR p.patient_id LIKE ? OR p.phone LIKE ?)';
      params.push(search, search, search);
    }

    const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM patients p ' + where, params);
    const [rows] = await db.execute(
      `SELECT p.*, u.full_name AS registered_by_name
       FROM patients p LEFT JOIN users u ON p.registered_by = u.id
       ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// GET /api/patients/:id
exports.getOne = async (req, res, next) => {
  try {
    const [patients] = await db.execute(
      'SELECT p.*, u.full_name AS registered_by_name FROM patients p LEFT JOIN users u ON p.registered_by = u.id WHERE p.id = ?',
      [req.params.id]
    );
    if (!patients.length) return res.status(404).json({ success: false, message: 'Patient not found' });

    const [records] = await db.execute(
      `SELECT mr.*, CONCAT(u.full_name) AS doctor_name
       FROM medical_records mr JOIN doctors d ON mr.doctor_id = d.id JOIN users u ON d.user_id = u.id
       WHERE mr.patient_id = ? ORDER BY mr.visit_date DESC LIMIT 20`,
      [req.params.id]
    );
    const [appointments] = await db.execute(
      `SELECT a.*, u.full_name AS doctor_name FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id JOIN users u ON d.user_id = u.id
       WHERE a.patient_id = ? ORDER BY a.appointment_date DESC LIMIT 10`,
      [req.params.id]
    );
    const [bills] = await db.execute(
      'SELECT * FROM bills WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.params.id]
    );

    res.json({ success: true, data: { ...patients[0], medical_records: records, appointments, bills } });
  } catch (err) { next(err); }
};

// POST /api/patients
exports.create = async (req, res, next) => {
  try {
    const pid = await genPatientId();
    const { full_name, date_of_birth, gender, blood_group, phone, email, address,
            emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions,
            insurance_provider, insurance_number } = req.body;

    const [result] = await db.execute(
      `INSERT INTO patients (patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address,
        emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions,
        insurance_provider, insurance_number, registered_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [pid, full_name, date_of_birth, gender, blood_group, phone, email, address,
       emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions,
       insurance_provider, insurance_number, req.user.id]
    );
    logger.info('Patient created: ' + pid + ' by ' + req.user.email);
    res.status(201).json({ success: true, message: 'Patient registered', data: { id: result.insertId, patient_id: pid } });
  } catch (err) { next(err); }
};

// PUT /api/patients/:id
exports.update = async (req, res, next) => {
  try {
    const { full_name, date_of_birth, gender, blood_group, phone, email, address,
            emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions,
            insurance_provider, insurance_number } = req.body;
    const [result] = await db.execute(
      `UPDATE patients SET full_name=?, date_of_birth=?, gender=?, blood_group=?, phone=?, email=?, address=?,
        emergency_contact_name=?, emergency_contact_phone=?, allergies=?, chronic_conditions=?,
        insurance_provider=?, insurance_number=? WHERE id=?`,
      [full_name, date_of_birth, gender, blood_group, phone, email, address,
       emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions,
       insurance_provider, insurance_number, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, message: 'Patient updated' });
  } catch (err) { next(err); }
};

// POST /api/patients/:id/records  — add medical record (doctor)
exports.addRecord = async (req, res, next) => {
  try {
    const { doctor_id, visit_date, chief_complaint, diagnosis, prescription, notes, follow_up_date } = req.body;
    const [result] = await db.execute(
      'INSERT INTO medical_records (patient_id, doctor_id, visit_date, chief_complaint, diagnosis, prescription, notes, follow_up_date) VALUES (?,?,?,?,?,?,?,?)',
      [req.params.id, doctor_id, visit_date, chief_complaint, diagnosis, prescription, notes, follow_up_date || null]
    );
    res.status(201).json({ success: true, message: 'Medical record added', data: { id: result.insertId } });
  } catch (err) { next(err); }
};
