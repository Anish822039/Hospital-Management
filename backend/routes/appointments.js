const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const audit = require('../middleware/auditLog');

const auth = [authenticate, authorize('admin','doctor','receptionist','staff')];

router.get('/',    ...auth, ctrl.getAll);
router.get('/:id', ...auth, ctrl.getOne);

router.post('/',
  ...auth,
  body('patient_id').isInt(),
  body('doctor_id').isInt(),
  body('appointment_date').isDate(),
  body('appointment_time').matches(/^\d{2}:\d{2}$/),
  validate,
  audit('CREATE_APPOINTMENT', 'appointments'),
  ctrl.create
);

router.put('/:id', ...auth, audit('UPDATE_APPOINTMENT', 'appointments'), ctrl.update);
router.patch('/:id/status', ...auth, ctrl.updateStatus);
router.delete('/:id', ...auth, audit('CANCEL_APPOINTMENT', 'appointments'), ctrl.cancel);

module.exports = router;
