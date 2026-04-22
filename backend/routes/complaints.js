const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const audit = require('../middleware/auditLog');

const auth = [authenticate];
const adminOnly = [authenticate, authorize('admin')];

router.get('/',    ...auth, ctrl.getAll);
router.get('/:id', ...auth, ctrl.getOne);

router.post('/',
  ...auth,
  body('title').notEmpty().trim(),
  body('category').isIn(['maintenance','hygiene','equipment','staff','other']),
  validate,
  audit('CREATE_COMPLAINT', 'complaints'),
  ctrl.create
);

router.put('/:id', ...adminOnly, audit('UPDATE_COMPLAINT', 'complaints'), ctrl.update);

module.exports = router;
