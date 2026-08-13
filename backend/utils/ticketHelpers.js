const { pool } = require('../config/db');

// Generates sequential ticket numbers like IT-2026-000001, reset per year.
async function generateTicketNumber() {
  const year = new Date().getFullYear();
  const [rows] = await pool.query(
    `SELECT ticket_number FROM tickets WHERE ticket_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`IT-${year}-%`]
  );
  let nextSeq = 1;
  if (rows.length > 0) {
    const lastSeq = parseInt(rows[0].ticket_number.split('-')[2], 10);
    nextSeq = lastSeq + 1;
  }
  return `IT-${year}-${String(nextSeq).padStart(6, '0')}`;
}

// SLA minutes per priority level, matches sla_settings table defaults.
const SLA_MINUTES = { Critical: 30, High: 120, Medium: 480, Low: 1440 };

async function calculateDueDate(priority) {
  const [rows] = await pool.query('SELECT resolution_minutes FROM sla_settings WHERE priority = ?', [priority]);
  const minutes = rows.length ? rows[0].resolution_minutes : (SLA_MINUTES[priority] || 480);
  const due = new Date(Date.now() + minutes * 60 * 1000);
  return due.toISOString().slice(0, 19).replace('T', ' ');
}

// Logs an entry to activity_logs for auditing.
async function logActivity(userId, action, details = '', ip = '') {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?,?,?,?)`,
      [userId, action, details, ip]
    );
  } catch (err) {
    console.error('Failed to log activity (ignoring):', err.message);
  }
}

module.exports = { generateTicketNumber, calculateDueDate, logActivity };
