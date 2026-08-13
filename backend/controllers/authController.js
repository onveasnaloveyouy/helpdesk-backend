const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendEmail } = require('../utils/email');
const { logActivity } = require('../utils/ticketHelpers');
require('dotenv').config();

const ROLE_NAMES = { 1: 'User', 2: 'Technician', 3: 'Admin' };

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: ROLE_NAMES[user.role_id], department_id: user.department_id, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    const token = signToken(user);
    await logActivity(user.id, 'LOGIN', `User ${user.email} logged in`, req.ip);

    res.json({
      token,
      user: {
        id: user.id, full_name: user.full_name, email: user.email,
        role: ROLE_NAMES[user.role_id], department_id: user.department_id
      }
    });
  } catch (err) { next(err); }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    await logActivity(req.user.id, 'LOGOUT', `User logged out`, req.ip);
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { employee_id, full_name, sex, position, department_id, location, phone, email, password } = req.body;
    
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ? OR employee_id = ?', [email, employee_id]);
    if (existing.length) return res.status(400).json({ message: 'Email or Employee ID already exists' });

    const hash = await bcrypt.hash(password, 10);
    // 3 = Employee role
    const finalEmpId = employee_id ? employee_id : null;
    const finalName = full_name ? full_name : 'New User';
    const finalDept = department_id ? department_id : null;

    const [result] = await pool.query(
      `INSERT INTO users (employee_id, full_name, department_id, phone, email, password_hash, role_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 3, 1)`,
      [finalEmpId, finalName, finalDept, phone || null, email, hash]
    );

    res.status(201).json({ message: 'Account created successfully', userId: result.insertId });
  } catch (err) { next(err); }
}

// POST /api/auth/check-user
async function checkUser(req, res, next) {
  try {
    const { email, employee_id } = req.body;
    
    // Only check employee_id if it's provided and not empty
    const empIdToCheck = employee_id ? employee_id : null;
    
    let query = 'SELECT * FROM users WHERE email = ?';
    let params = [email];
    
    if (empIdToCheck) {
      query += ' OR employee_id = ?';
      params.push(empIdToCheck);
    }
    
    const [rows] = await pool.query(query, params);
    if (rows.length > 0) {
      if (empIdToCheck && rows.some(u => u.employee_id === empIdToCheck)) return res.status(400).json({ message: 'Employee ID already exists.' });
      if (rows.some(u => u.email === email)) return res.status(400).json({ message: 'Email is already registered.' });
    }
    res.json({ available: true });
  } catch (err) { next(err); }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    // Always respond success to avoid leaking which emails are registered
    if (!rows.length) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>Click the link below to reset your password (valid 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
}

// POST /api/auth/reset-password-otp (Used by the 3-step OTP flow in frontend)
async function resetPasswordOtp(req, res, next) {
  try {
    const { email, newPassword } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, rows[0].id]);
    res.json({ message: 'Password reset successful' });
  } catch (err) { next(err); }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]
    );
    if (!rows.length) return res.status(400).json({ message: 'Invalid or expired reset token' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hash, rows[0].id]
    );
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) { next(err); }
}

// POST /api/auth/reset-password

// POST /api/auth/change-password  (logged-in user)
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.employee_id, u.phone, r.name AS role, u.department_id, d.name AS department_name
       FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`, [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = {
  login,
  register,
  checkUser,
  logout,
  me,
  forgotPassword,
  resetPassword,
  resetPasswordOtp,
  changePassword
};
