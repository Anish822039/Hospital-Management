const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/billController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const audit = require('../middleware/auditLog');

const auth = [authenticate, authorize('admin','receptionist','staff')];

router.get('/',    ...auth, ctrl.getAll);
router.get('/:id', ...auth, ctrl.getOne);

router.post('/',
  ...auth,
  body('patient_id').isInt(),
  body('items').isArray({ min: 1 }),
  validate,
  audit('CREATE_BILL', 'bills'),
  ctrl.create
);

router.patch('/:id/pay',
  ...auth,
  body('paid_amount').isFloat({ min: 0.01 }),
  validate,
  audit('PAYMENT_RECORDED', 'bills'),
  ctrl.markPaid
);

module.exports = router;
