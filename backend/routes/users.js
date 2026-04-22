const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const audit = require('../middleware/auditLog');

const adminOnly = [authenticate, authorize('admin')];

router.get('/',    ...adminOnly, ctrl.getAll);
router.get('/:id', ...adminOnly, ctrl.getOne);

router.post('/',
  ...adminOnly,
  body('employee_id').notEmpty().trim(),
  body('full_name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role_id').isInt({ min: 1 }),
  validate,
  audit('CREATE_EMPLOYEE', 'users'),
  ctrl.create
);

router.put('/:id',
  ...adminOnly,
  body('full_name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('role_id').isInt({ min: 1 }),
  validate,
  audit('UPDATE_EMPLOYEE', 'users'),
  ctrl.update
);

router.delete('/:id', ...adminOnly, audit('DEACTIVATE_EMPLOYEE', 'users'), ctrl.remove);
router.put('/:id/reset-password',
  ...adminOnly,
  body('new_password').isLength({ min: 8 }),
  validate,
  audit('RESET_PASSWORD', 'users'),
  ctrl.resetPassword
);

module.exports = router;
