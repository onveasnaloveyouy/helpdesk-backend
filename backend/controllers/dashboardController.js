const { pool } = require('../config/db');

// GET /api/dashboard/stats
async function getStats(req, res, next) {
  console.log('--- GET /api/dashboard/stats CALLED BY', req.user);
  try {
    // Scope by role: employees see only their own counts
    const scopeWhere = req.user.role === 'Employee' ? 'WHERE requester_id = ?' : '';
    const scopeParams = req.user.role === 'Employee' ? [req.user.id] : [];

    const [[counts]] = await pool.query(
      `SELECT
        COUNT(*) AS total,
        SUM(status IN (SELECT name FROM ticket_statuses WHERE type = 'New')) AS new_count,
        SUM(status IN (SELECT name FROM ticket_statuses WHERE type = 'Open')) AS open_count,
        SUM(status IN (SELECT name FROM ticket_statuses WHERE type = 'Pending')) AS pending_count,
        SUM(status IN (SELECT name FROM ticket_statuses WHERE type = 'In Progress')) AS in_progress_count,
        SUM(status IN (SELECT name FROM ticket_statuses WHERE type = 'Complete')) AS resolved_count,
        SUM(status = 'Complete by Vendor') AS vendor_count,
        SUM(status IN (SELECT name FROM ticket_statuses WHERE type = 'Complete') AND status != 'Complete by Vendor') AS in_house_count,
        SUM(status IN (SELECT name FROM ticket_statuses WHERE type = 'Complete')) AS closed_count,
        SUM(due_at < datetime('now', 'localtime') AND status NOT IN (SELECT name FROM ticket_statuses WHERE type IN ('Complete') OR name = 'Cancelled')) AS overdue_count
       FROM tickets ${scopeWhere}`, scopeParams
    );

    console.log('--- GET /api/dashboard/stats SUCCESS', counts);
    res.json(counts);
  } catch (err) {
    console.error('--- GET /api/dashboard/stats ERROR', err);
    next(err);
  }
}

// GET /api/dashboard/charts
async function getCharts(req, res, next) {
  try {
    const [byDepartment] = await pool.query(
      `SELECT d.name AS label, COUNT(*) AS value FROM tickets t
       JOIN departments d ON t.department_id = d.id GROUP BY d.name`
    );
    const [byCategory] = await pool.query(
      `SELECT c.name AS label, COUNT(*) AS value FROM tickets t
       LEFT JOIN categories c ON t.category_id = c.id GROUP BY c.name`
    );
    const [monthly] = await pool.query(
      `SELECT strftime('%Y-%m', created_at) AS label, COUNT(*) AS value
       FROM tickets GROUP BY label ORDER BY label ASC LIMIT 12`
    );
    const [technicianPerf] = await pool.query(
      `SELECT u.full_name AS label,
              COUNT(t.id) AS assigned,
              SUM(t.status IN (SELECT name FROM ticket_statuses WHERE type IN ('Complete'))) AS resolved,
              ROUND(AVG((julianday(t.resolved_at) - julianday(t.created_at)) * 24 * 60), 1) AS avg_resolution_minutes
       FROM users u LEFT JOIN tickets t ON t.assigned_technician_id = u.id
       WHERE u.role_id = 2 GROUP BY u.id`
    );
    const [slaCompliance] = await pool.query(
      `SELECT priority AS label,
              SUM(status IN (SELECT name FROM ticket_statuses WHERE type IN ('Complete')) AND resolved_at <= due_at) AS within_sla,
              SUM(status IN (SELECT name FROM ticket_statuses WHERE type IN ('Complete')) AND resolved_at > due_at) AS breached_sla
       FROM tickets WHERE resolved_at IS NOT NULL GROUP BY priority`
    );

    res.json({ byDepartment, byCategory, monthly, technicianPerf, slaCompliance });
  } catch (err) { next(err); }
}

module.exports = { getStats, getCharts };
