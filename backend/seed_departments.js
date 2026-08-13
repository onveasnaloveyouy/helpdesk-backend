const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const departments = [
  'Administration',
  'IT Department',
  'Human Resources',
  'Finance & Accounting',
  'Marketing & Sales',
  'Operations',
  'Customer Support',
  'Engineering',
  'Legal',
  'Procurement'
];

db.serialize(() => {
  const stmt = db.prepare('INSERT INTO departments (name) VALUES (?)');
  
  departments.forEach((dept) => {
    stmt.run(dept, (err) => {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          console.log(`Department ${dept} already exists.`);
        } else {
          console.error('Error inserting department:', err.message);
        }
      } else {
        console.log(`Added department: ${dept}`);
      }
    });
  });
  
  stmt.finalize();
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Database connection closed.');
  }
});
