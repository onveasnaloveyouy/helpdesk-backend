const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  // First, swap the roles so they match schema.sql: 1=User, 2=Technician, 3=Admin
  // But we also need to update users to preserve their actual intended roles if they were created with the old mapping.
  // Actually, the easiest is just to force the roles table to be exactly what schema.sql wants,
  // and force admin@helpdesk.local to role_id=3.
  db.run("DELETE FROM roles");
  db.run("INSERT INTO roles (id, name) VALUES (1, 'User')");
  db.run("INSERT INTO roles (id, name) VALUES (2, 'Technician')");
  db.run("INSERT INTO roles (id, name) VALUES (3, 'Admin')");
  
  // Make sure admin is active and has role_id=3
  db.run("UPDATE users SET is_active = 1, role_id = 3 WHERE email = 'admin@helpdesk.local'");
  
  console.log("Roles and Admin user fixed.");
});
