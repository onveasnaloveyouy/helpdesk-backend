const { pool } = require('./config/db.js');
(async () => {
  await pool.query('DELETE FROM departments');
  await pool.query(`INSERT INTO departments (id, name) VALUES (1, 'IT Department'), (2, 'Human Resources Department'), (3, 'Finance Department')`);
  console.log('Done!');
  process.exit();
})();
