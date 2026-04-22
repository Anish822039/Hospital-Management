const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 }),
  validate,
  ctrl.login
);

router.get('/me', authenticate, ctrl.getMe);

router.post('/change-password',
  authenticate,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*\d)/),
  validate,
  ctrl.changePassword
);

module.exports = router;
