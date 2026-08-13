const { pool } = require('./config/db');

async function test() {
  try {
    const [result] = await pool.query(
      `INSERT INTO users (employee_id, full_name, email, phone, password_hash, role_id, department_id)
       VALUES (?,?,?,?,?,?,?)`,
      ['EMP999', 'Test User', 'test999@test.com', '123', 'hash', 1, "1"]
    );
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
