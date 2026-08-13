const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.post('/', upload.array('attachments', 5),
  [body('subject').notEmpty(), body('description').notEmpty(), body('department_id').notEmpty()],
  validate, ctrl.createTicket);

router.get('/', ctrl.listTickets);
router.get('/:id', ctrl.getTicket);

router.put('/:id', ctrl.updateTicket);
router.delete('/:id', ctrl.deleteTicket);
router.patch('/:id/status', authorize('Technician', 'Admin'),
  [body('status').isIn(['New','Open','Assigned','In Progress','Waiting for User','Pending Vendor','Resolved','Closed','Cancelled'])],
  validate, ctrl.updateStatus);

router.patch('/:id/assign', authorize('Technician', 'Admin'),
  [body('technician_id').notEmpty()], validate, ctrl.assignTechnician);

router.post('/:id/comments', upload.array('attachments', 5),
  [body('comment').notEmpty()], validate, ctrl.addComment);

router.post('/:id/satisfaction', authorize('Employee'),
  [body('rating').isInt({ min: 1, max: 5 })], validate, ctrl.rateSatisfaction);

module.exports = router;
