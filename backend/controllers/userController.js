const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { logActivity } = require('../utils/ticketHelpers');

const ROLE_IDS = { User: 1, Employee: 1, Technician: 2, Admin: 3 };

// GET /api/users
async function listUsers(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.employee_id, u.full_name, u.email, u.phone, r.name AS role,
              u.department_id, d.name AS department_name, u.is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

// POST /api/users  (admin creates employee/technician/admin account)
async function createUser(req, res, next) {
  try {
    const { employee_id, full_name, email, phone, password, role, department_id } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (employee_id, full_name, email, phone, password_hash, role_id, department_id)
       VALUES (?,?,?,?,?,?,?)`,
      [employee_id, full_name, email, phone, hash, ROLE_IDS[role] || 1, department_id || null]
    );
    await logActivity(req.user.id, 'USER_CREATED', `Created user ${email}`, req.ip);
    res.status(201).json({ id: result.insertId, message: 'User created' });
  } catch (err) {
    if (err.message && (err.message.includes('users.email') || err.message.includes('UNIQUE constraint failed'))) {
      if (err.message.includes('users.email')) {
        return res.status(400).json({ message: 'An account with this email address already exists. Please use a different email.' });
      }
      if (err.message.includes('users.employee_id')) {
        return res.status(400).json({ message: 'An account with this Staff ID already exists. Please use a different ID.' });
      }
    }
    next(err);
  }
}

// PUT /api/users/:id
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, phone, role, department_id, is_active } = req.body;
    await pool.query(
      `UPDATE users SET full_name = ?, phone = ?, role_id = ?, department_id = ?, is_active = ? WHERE id = ?`,
      [full_name, phone, ROLE_IDS[role] || 1, department_id || null, is_active ? 1 : 0, id]
    );
    res.json({ message: 'User updated' });
  } catch (err) { next(err); }
}

// DELETE /api/users/:id
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const [[user]] = await pool.query('SELECT email FROM users WHERE id = ?', [id]);
    
    // Check if user has tickets
    const [[ticketCount]] = await pool.query('SELECT COUNT(*) as c FROM tickets WHERE requester_id = ? OR assigned_technician_id = ?', [id, id]);
    if (ticketCount && ticketCount.c > 0) {
      return res.status(400).json({ message: 'Cannot permanently delete user because they are linked to existing tickets. Please deactivate them instead.' });
    }

    try {
      await pool.query('DELETE FROM users WHERE id = ?', [id]); 
      await logActivity(req.user.id, 'USER_DELETED', `Permanently deleted user ${user?.email}`, req.ip);
      res.json({ message: 'User permanently deleted' });
    } catch (err) {
      if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(400).json({ message: 'Cannot permanently delete user due to existing related records. Please deactivate them instead.' });
      }
      throw err;
    }
  } catch (err) { next(err); }
}

// GET /api/users/technicians  (for assignment dropdowns)
async function listTechnicians(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.department_id,
        (SELECT COUNT(*) FROM tickets t WHERE t.assigned_technician_id = u.id
          AND t.status NOT IN ('Resolved','Closed','Cancelled')) AS open_ticket_count
       FROM users u WHERE u.is_active = 1 ORDER BY u.full_name ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { listUsers, createUser, updateUser, deleteUser, listTechnicians };
