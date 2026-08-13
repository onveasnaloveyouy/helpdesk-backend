const { pool } = require('./config/db');

async function test() {
  try {
    const [[counts]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'New') AS new_count,
        SUM(status = 'Open') AS open_count,
        SUM(status IN ('Waiting for User','Pending Vendor')) AS pending_count,
        SUM(status = 'In Progress') AS in_progress_count,
        SUM(status = 'Resolved') AS resolved_count,
        0 AS vendor_count,
        SUM(status = 'Resolved') AS in_house_count,
        SUM(status = 'Closed') AS closed_count,
        SUM(due_at < datetime('now', 'localtime') AND status NOT IN ('Resolved','Closed','Cancelled')) AS overdue_count
       FROM tickets
    `);
    console.log('Stats:', counts);
  } catch (err) {
    console.error('Stats Error:', err);
  }
}
test();
