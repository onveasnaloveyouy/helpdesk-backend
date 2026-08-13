const { pool } = require('../config/db');

// GET /api/notifications
async function listNotifications(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

// PATCH /api/notifications/:id/read
async function markRead(req, res, next) {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res, next) {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
}

module.exports = { listNotifications, markRead, markAllRead };
