// controllers/billController.js
const db = require('../config/db');
const logger = require('../config/logger');

const genBillNo = async () => {
  const y = new Date().getFullYear();
  const [[{ cnt }]] = await db.execute("SELECT COUNT(*) as cnt FROM bills WHERE YEAR(created_at) = YEAR(NOW())");
  return 'BILL' + y + String(cnt + 1).padStart(5, '0');
};

// GET /api/bills
exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, +req.query.limit || 20);
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';
    if (req.query.patient_id)     { where += ' AND b.patient_id = ?';     params.push(req.query.patient_id); }
    if (req.query.payment_status) { where += ' AND b.payment_status = ?'; params.push(req.query.payment_status); }
    if (req.query.from_date)      { where += ' AND DATE(b.created_at) >= ?'; params.push(req.query.from_date); }
    if (req.query.to_date)        { where += ' AND DATE(b.created_at) <= ?'; params.push(req.query.to_date); }

    const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM bills b ' + where, params);
    const [rows] = await db.execute(
      `SELECT b.*, p.full_name AS patient_name, p.patient_id AS patient_code,
              u.full_name AS generated_by_name
       FROM bills b
       JOIN patients p ON b.patient_id = p.id
       JOIN users u ON b.generated_by = u.id
       ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
};

// GET /api/bills/:id
exports.getOne = async (req, res, next) => {
  try {
    const [bills] = await db.execute(
      `SELECT b.*, p.full_name AS patient_name, p.patient_id AS patient_code, p.phone AS patient_phone,
              p.address AS patient_address, u.full_name AS generated_by_name
       FROM bills b JOIN patients p ON b.patient_id = p.id JOIN users u ON b.generated_by = u.id
       WHERE b.id = ?`, [req.params.id]
    );
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found' });
    const [items] = await db.execute('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...bills[0], items } });
  } catch (err) { next(err); }
};

// POST /api/bills
exports.create = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { patient_id, appointment_id, items, tax_rate, discount, payment_method, notes } = req.body;

    const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
    const taxAmt   = subtotal * ((tax_rate || 18) / 100);
    const total    = subtotal + taxAmt - (discount || 0);
    const billNo   = await genBillNo();

    const [result] = await conn.execute(
      `INSERT INTO bills (bill_no, patient_id, appointment_id, subtotal, tax_rate, tax_amount, discount, total, payment_method, due_amount, notes, generated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [billNo, patient_id, appointment_id || null, subtotal, tax_rate || 18, taxAmt, discount || 0, total, payment_method || 'cash', total, notes, req.user.id]
    );
    const billId = result.insertId;

    for (const item of items) {
      await conn.execute(
        'INSERT INTO bill_items (bill_id, description, quantity, unit_price, total_price) VALUES (?,?,?,?,?)',
        [billId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }

    await conn.commit();
    logger.info('Bill created: ' + billNo + ' by ' + req.user.email);
    res.status(201).json({ success: true, message: 'Bill generated', data: { id: billId, bill_no: billNo, total } });
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
};

// PATCH /api/bills/:id/pay
exports.markPaid = async (req, res, next) => {
  try {
    const { paid_amount, payment_method } = req.body;
    const [bills] = await db.execute('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    if (!bills.length) return res.status(404).json({ success: false, message: 'Bill not found' });

    const bill = bills[0];
    const newPaid = +bill.paid_amount + +paid_amount;
    const due = Math.max(0, bill.total - newPaid);
    const status = due === 0 ? 'paid' : 'partial';

    await db.execute(
      'UPDATE bills SET paid_amount=?, due_amount=?, payment_status=?, payment_method=?, paid_at=IF(?="paid", NOW(), paid_at) WHERE id=?',
      [newPaid, due, status, payment_method || bill.payment_method, status, req.params.id]
    );
    res.json({ success: true, message: 'Payment recorded', data: { payment_status: status, paid_amount: newPaid, due_amount: due } });
  } catch (err) { next(err); }
};
