const { pool } = require('./config/db');

async function generate() {
  try {
    const statuses = ['New', 'Open', 'In Progress', 'Resolved', 'Closed'];
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    
    const [users] = await pool.query('SELECT id FROM users LIMIT 10');
    const [categories] = await pool.query('SELECT id FROM categories LIMIT 10');
    const [depts] = await pool.query('SELECT id FROM departments LIMIT 10');

    if (!users.length || !categories.length || !depts.length) {
      console.log('Ensure you have users, categories, and departments in DB first.');
      process.exit(1);
    }

    // Get current max ticket ID to generate unique ticket numbers
    const [rows] = await pool.query('SELECT MAX(id) as maxId FROM tickets');
    let startId = (rows[0].maxId || 0) + 1;

    for (let i = 1; i <= 60; i++) {
      const ticketNum = `IT-TEST-${String(startId++).padStart(6, '0')}`;
      const user = users[Math.floor(Math.random() * users.length)].id;
      const cat = categories[Math.floor(Math.random() * categories.length)].id;
      const dept = depts[Math.floor(Math.random() * depts.length)].id;
      const prio = priorities[Math.floor(Math.random() * priorities.length)];
      const stat = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Random date within the last 6 months
      const randomTime = Date.now() - Math.floor(Math.random() * 15000000000);
      const date = new Date(randomTime).toISOString().slice(0, 19).replace('T', ' ');

      await pool.query(
        `INSERT INTO tickets (ticket_number, requester_id, department_id, category_id, priority, status, subject, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticketNum, 
          user, 
          dept, 
          cat, 
          prio, 
          stat, 
          `Test Ticket ${i}: Need help with ${prio} issue`, 
          `This is an auto-generated test ticket number ${i} for testing purposes.`, 
          date, 
          date
        ]
      );
      console.log(`Inserted ${ticketNum}`);
    }
    console.log('Successfully inserted 60 tickets!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

generate();
