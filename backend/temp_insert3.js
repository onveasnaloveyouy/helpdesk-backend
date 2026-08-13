const { pool } = require('./config/db');

async function test() {
  try {
    const [result] = await pool.query(
      `INSERT INTO users (employee_id, full_name, email, phone, password_hash, role_id, department_id)
       VALUES (?,?,?,?,?,?,?)`,
      ['test2@helpdesk.local', 'test2', 'test2@helpdesk.local', '', 'hash', 1, "8"]
    );
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
