const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('Technician', 'Admin'));
router.get('/data', ctrl.getReportData);
router.get('/export/excel', ctrl.exportExcel);
router.get('/export/pdf', ctrl.exportPdf);

module.exports = router;
