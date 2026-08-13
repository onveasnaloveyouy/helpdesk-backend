const { pool } = require('./config/db');
const { logActivity } = require('./utils/ticketHelpers');

async function test() {
  try {
    const adminId = 1; // Assuming this is req.user.id
    await logActivity(adminId, 'USER_CREATED', 'Created user test', '127.0.0.1');
    console.log("Success logActivity");
  } catch (err) {
    console.error("Error logActivity:", err.message);
  }
}
test();
