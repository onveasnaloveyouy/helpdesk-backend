const { pool } = require('../config/db');
async function run() {
  await pool.query("DELETE FROM ticket_statuses WHERE name IN ('Complete')");
  await pool.query("INSERT OR IGNORE INTO ticket_statuses (name, type, color_code) VALUES ('Complete by IT', 'Complete', '#20c997'), ('Complete by Vendor', 'Complete', '#6c757d')");
  await pool.query("UPDATE tickets SET status = 'Complete by IT' WHERE status = 'Complete'");
  console.log('Statuses updated');
}
run();
