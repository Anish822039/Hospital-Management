// controllers/dashboardController.js — aggregated stats
const db = require('../config/db');

exports.getStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    const stats = {};

    if (role === 'admin') {
      const [[pats]] = await db.execute("SELECT COUNT(*) as c FROM patients");
      const [[appts]] = await db.execute("SELECT COUNT(*) as c FROM appointments WHERE appointment_date = CURDATE()");
      const [[pending]] = await db.execute("SELECT COUNT(*) as c FROM bills WHERE payment_status='pending'");
      const [[revenue]] = await db.execute("SELECT COALESCE(SUM(paid_amount),0) as c FROM bills WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())");
      const [[complaints]] = await db.execute("SELECT COUNT(*) as c FROM complaints WHERE status='open'");
      const [[staff]] = await db.execute("SELECT COUNT(*) as c FROM users WHERE is_active=1");
      const [monthlyRevenue] = await db.execute(
        "SELECT DATE_FORMAT(created_at,'%b') as month, SUM(paid_amount) as amount FROM bills WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY MONTH(created_at), DATE_FORMAT(created_at,'%b') ORDER BY MIN(created_at)"
      );
      const [apptByStatus] = await db.execute(
        "SELECT status, COUNT(*) as count FROM appointments WHERE WEEK(appointment_date)=WEEK(CURDATE()) GROUP BY status"
      );
      const [recentPatients] = await db.execute(
        "SELECT patient_id, full_name, phone, created_at FROM patients ORDER BY created_at DESC LIMIT 5"
      );
      const [todayAppts] = await db.execute(
        `SELECT a.appointment_no, a.appointment_time, a.status, a.type,
                p.full_name AS patient_name, du.full_name AS doctor_name
         FROM appointments a JOIN patients p ON a.patient_id=p.id
         JOIN doctors d ON a.doctor_id=d.id JOIN users du ON d.user_id=du.id
         WHERE a.appointment_date = CURDATE() ORDER BY a.appointment_time LIMIT 10`
      );
      stats.patients      = pats.c;
      stats.today_appts   = appts.c;
      stats.pending_bills = pending.c;
      stats.monthly_revenue = revenue.c;
      stats.open_complaints = complaints.c;
      stats.active_staff  = staff.c;
      stats.monthly_revenue_chart = monthlyRevenue;
      stats.appt_by_status = apptByStatus;
      stats.recent_patients = recentPatients;
      stats.today_appointments = todayAppts;
    }

    if (role === 'doctor') {
      const [[doc]] = await db.execute('SELECT id FROM doctors WHERE user_id=?', [req.user.id]);
      if (doc) {
        const [[todayC]] = await db.execute("SELECT COUNT(*) as c FROM appointments WHERE doctor_id=? AND appointment_date=CURDATE()", [doc.id]);
        const [[pendingC]] = await db.execute("SELECT COUNT(*) as c FROM appointments WHERE doctor_id=? AND status='scheduled'", [doc.id]);
        const [[totalPats]] = await db.execute("SELECT COUNT(DISTINCT patient_id) as c FROM appointments WHERE doctor_id=?", [doc.id]);
        const [upcoming] = await db.execute(
          `SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone
           FROM appointments a JOIN patients p ON a.patient_id=p.id
           WHERE a.doctor_id=? AND a.appointment_date>=CURDATE() AND a.status NOT IN ('cancelled','completed')
           ORDER BY a.appointment_date, a.appointment_time LIMIT 10`, [doc.id]
        );
        stats.today_appointments = todayC.c;
        stats.pending_appointments = pendingC.c;
        stats.total_patients = totalPats.c;
        stats.upcoming_appointments = upcoming;
      }
    }

    if (role === 'receptionist' || role === 'staff') {
      const [[todayC]] = await db.execute("SELECT COUNT(*) as c FROM appointments WHERE appointment_date=CURDATE()");
      const [[newPats]] = await db.execute("SELECT COUNT(*) as c FROM patients WHERE DATE(created_at)=CURDATE()");
      const [[pendingBills]] = await db.execute("SELECT COUNT(*) as c FROM bills WHERE payment_status='pending'");
      const [todayAppts] = await db.execute(
        `SELECT a.appointment_no, a.appointment_time, a.status, a.type,
                p.full_name AS patient_name, du.full_name AS doctor_name
         FROM appointments a JOIN patients p ON a.patient_id=p.id
         JOIN doctors d ON a.doctor_id=d.id JOIN users du ON d.user_id=du.id
         WHERE a.appointment_date=CURDATE() ORDER BY a.appointment_time LIMIT 15`
      );
      stats.today_appointments_count = todayC.c;
      stats.new_patients_today = newPats.c;
      stats.pending_bills = pendingBills.c;
      stats.today_appointments = todayAppts;
    }

    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};
