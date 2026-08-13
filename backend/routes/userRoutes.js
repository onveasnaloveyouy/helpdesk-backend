const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/technicians', ctrl.listTechnicians);
router.get('/', authorize('Admin'), ctrl.listUsers);
router.post('/', authorize('Admin'),
  [body('full_name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 4 }), body('role').notEmpty()],
  validate, ctrl.createUser);
router.put('/:id', authorize('Admin'), ctrl.updateUser);
router.delete('/:id', authorize('Admin'), ctrl.deleteUser);

module.exports = router;
