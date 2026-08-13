const { pool } = require('../config/db');

// ---------------- Departments ----------------
async function listDepartments(req, res, next) {
  try { 
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY name'); 
    res.json(rows); 
  }
  catch (err) { next(err); }
}
async function createDepartment(req, res, next) {
  try {
    const { name } = req.body;
    const [result] = await pool.query('INSERT INTO departments (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
}
async function updateDepartment(req, res, next) {
  try {
    await pool.query('UPDATE departments SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}
async function deleteDepartment(req, res, next) {
  try { await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
}

// ---------------- Categories ----------------
async function listCategories(req, res, next) {
  try { const [rows] = await pool.query('SELECT * FROM categories ORDER BY name'); res.json(rows); }
  catch (err) { next(err); }
}
async function createCategory(req, res, next) {
  try {
    const { name } = req.body;
    const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
}
async function updateCategory(req, res, next) {
  try {
    await pool.query('UPDATE categories SET name = ?, is_active = ? WHERE id = ?',
      [req.body.name, req.body.is_active ? 1 : 0, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}
async function deleteCategory(req, res, next) {
  try { await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
}

// ---------------- SLA ----------------
async function listSla(req, res, next) {
  try { const [rows] = await pool.query('SELECT * FROM sla_settings'); res.json(rows); }
  catch (err) { next(err); }
}
async function updateSla(req, res, next) {
  try {
    const { resolution_minutes } = req.body;
    await pool.query('UPDATE sla_settings SET resolution_minutes = ? WHERE priority = ?',
      [resolution_minutes, req.params.priority]);
    res.json({ message: 'SLA updated' });
  } catch (err) { next(err); }
}

// ---------------- Statuses ----------------
async function listStatuses(req, res, next) {
  try { const [rows] = await pool.query('SELECT * FROM ticket_statuses ORDER BY id'); res.json(rows); }
  catch (err) { next(err); }
}
async function createStatus(req, res, next) {
  try {
    const { name, type, color_code } = req.body;
    const [result] = await pool.query('INSERT INTO ticket_statuses (name, type, color_code) VALUES (?, ?, ?)', [name, type, color_code || '#6c757d']);
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
}
async function updateStatus(req, res, next) {
  try {
    await pool.query('UPDATE ticket_statuses SET name = ?, type = ?, color_code = ? WHERE id = ?',
      [req.body.name, req.body.type, req.body.color_code || '#6c757d', req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}
async function deleteStatus(req, res, next) {
  try { await pool.query('DELETE FROM ticket_statuses WHERE id = ?', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
}

// ---------------- Email settings ----------------
async function getEmailSettings(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM email_settings ORDER BY id DESC LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) { next(err); }
}
async function updateEmailSettings(req, res, next) {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email, it_department_email } = req.body;
    await pool.query(
      `INSERT INTO email_settings (smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email, it_department_email)
       VALUES (?,?,?,?,?,?,?)`,
      [smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email, it_department_email]
    );
    res.json({ message: 'Email settings saved. Restart server to apply to active SMTP transport.' });
  } catch (err) { next(err); }
}

// ---------------- FAQ / Knowledge Base ----------------
async function listFaqs(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, c.name AS category_name FROM faqs f LEFT JOIN categories c ON f.category_id = c.id ORDER BY f.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}
async function createFaq(req, res, next) {
  try {
    const { category_id, question, answer } = req.body;
    const [result] = await pool.query(
      'INSERT INTO faqs (category_id, question, answer, created_by) VALUES (?,?,?,?)',
      [category_id || null, question, answer, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { next(err); }
}
async function deleteFaq(req, res, next) {
  try { await pool.query('DELETE FROM faqs WHERE id = ?', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
}

// ---------------- Activity logs ----------------
async function listActivityLogs(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT a.*, u.full_name, u.email FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`, [parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM activity_logs');
    res.json({ data: rows, total });
  } catch (err) { next(err); }
}

module.exports = {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listCategories, createCategory, updateCategory, deleteCategory,
  listStatuses, createStatus, updateStatus, deleteStatus,
  listSla, updateSla, getEmailSettings, updateEmailSettings,
  listFaqs, createFaq, deleteFaq, listActivityLogs
};
