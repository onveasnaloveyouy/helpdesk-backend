const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()], validate, ctrl.login);
router.post('/register', ctrl.register);
router.post('/check-user', ctrl.checkUser);
router.post('/logout', authenticate, ctrl.logout);
router.post('/forgot-password', [body('email').isEmail()], validate, ctrl.forgotPassword);
router.post('/reset-password', [body('token').notEmpty(), body('newPassword').isLength({ min: 8 })], validate, ctrl.resetPassword);
router.post('/reset-password-otp', [body('email').isEmail(), body('newPassword').isLength({ min: 8 })], validate, ctrl.resetPasswordOtp);
router.post('/change-password', authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })], validate, ctrl.changePassword);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
