const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const audit = require('../middleware/auditLog');

const auth = [authenticate, authorize('admin','doctor','receptionist','staff')];
const clinical = [authenticate, authorize('admin','doctor')];

router.get('/',    ...auth, ctrl.getAll);
router.get('/:id', ...auth, ctrl.getOne);

router.post('/',
  ...auth,
  body('full_name').notEmpty().trim(),
  body('date_of_birth').isDate(),
  body('gender').isIn(['male','female','other']),
  body('phone').notEmpty(),
  validate,
  audit('CREATE_PATIENT', 'patients'),
  ctrl.create
);

router.put('/:id',
  ...auth,
  body('full_name').notEmpty().trim(),
  body('date_of_birth').isDate(),
  validate,
  audit('UPDATE_PATIENT', 'patients'),
  ctrl.update
);

router.post('/:id/records',
  ...clinical,
  body('doctor_id').isInt(),
  body('visit_date').isISO8601(),
  validate,
  audit('ADD_MEDICAL_RECORD', 'medical_records'),
  ctrl.addRecord
);

module.exports = router;
