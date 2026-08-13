const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/stats', ctrl.getStats);
router.get('/charts', ctrl.getCharts);

module.exports = router;
