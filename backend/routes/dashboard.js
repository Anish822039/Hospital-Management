const express = require('express');
const router  = express.Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, ctrl.getStats);

module.exports = router;
