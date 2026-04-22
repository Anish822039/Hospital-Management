const express = require('express');
const router  = express.Router();
const ctrl = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');

const auth = [authenticate];
const adminOnly = [authenticate, authorize('admin')];

router.get('/',    ...auth, ctrl.getAll);
router.get('/:id', ...auth, ctrl.getOne);
router.post('/',   ...adminOnly, ctrl.create);
router.put('/:id', ...adminOnly, ctrl.update);

module.exports = router;
