const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/metaController');
const { authenticate, authorize } = require('../middleware/auth');

// Departments
router.get('/departments', ctrl.listDepartments); // Public for Registration
router.post('/departments', authenticate, authorize('Admin'), ctrl.createDepartment);
router.put('/departments/:id', authenticate, authorize('Admin'), ctrl.updateDepartment);
router.delete('/departments/:id', authenticate, authorize('Admin'), ctrl.deleteDepartment);

// Categories
router.get('/categories', authenticate, ctrl.listCategories);
router.post('/categories', authenticate, authorize('Admin'), ctrl.createCategory);
router.put('/categories/:id', authenticate, authorize('Admin'), ctrl.updateCategory);
router.delete('/categories/:id', authenticate, authorize('Admin'), ctrl.deleteCategory);

// Statuses
router.get('/statuses', authenticate, ctrl.listStatuses);
router.post('/statuses', authenticate, authorize('Admin'), ctrl.createStatus);
router.put('/statuses/:id', authenticate, authorize('Admin'), ctrl.updateStatus);
router.delete('/statuses/:id', authenticate, authorize('Admin'), ctrl.deleteStatus);

// SLA
router.get('/sla', authenticate, ctrl.listSla);
router.put('/sla/:priority', authenticate, authorize('Admin'), ctrl.updateSla);

// Email settings
router.get('/email-settings', authenticate, authorize('Admin'), ctrl.getEmailSettings);
router.put('/email-settings', authenticate, authorize('Admin'), ctrl.updateEmailSettings);

// FAQ / Knowledge base
router.get('/faqs', authenticate, ctrl.listFaqs);
router.post('/faqs', authenticate, authorize('Technician', 'Admin'), ctrl.createFaq);
router.delete('/faqs/:id', authenticate, authorize('Admin'), ctrl.deleteFaq);

// Activity logs
router.get('/activity-logs', authenticate, authorize('Admin'), ctrl.listActivityLogs);

module.exports = router;
