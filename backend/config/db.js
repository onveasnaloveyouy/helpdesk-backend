const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let db;

async function initDb() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  // Load and run schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schema);

  const bcrypt = require('bcrypt');
  const adminHash = await bcrypt.hash('Admin123!', 10);
  await db.run(
    `UPDATE users SET is_active = 1, role_id = 3, password_hash = ? WHERE email = 'admin@helpdesk.local'`,
    [adminHash]
  );
  console.log('✅ SQLite database initialized and schema loaded.');
}

const pool = {
  getConnection: async () => pool,
  beginTransaction: async () => { if (!db) await initDb(); await db.exec('BEGIN TRANSACTION'); },
  commit: async () => { if (!db) await initDb(); await db.exec('COMMIT'); },
  rollback: async () => { if (!db) await initDb(); await db.exec('ROLLBACK'); },
  release: () => {},
  query: async (sql, params = []) => {
    if (!db) await initDb();
    
    // SQLite doesn't support IF(), NOW(), or DATE_FORMAT() like MySQL
    // So we will dynamically replace them in our wrapper
    let sqliteQuery = sql
      .replace(/IF\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'CASE WHEN $1 THEN $2 ELSE $3 END')
      .replace(/NOW\(\)/gi, "datetime('now', 'localtime')")
      .replace(/TIMESTAMPDIFF\(MINUTE,\s*([^,]+),\s*([^)]+)\)/gi, '(julianday($2) - julianday($1)) * 24 * 60')
      .replace(/DATE_SUB\(datetime\('now', 'localtime'\),\s*INTERVAL\s*\?\s*DAY\)/gi, "datetime('now', 'localtime', '-' || ? || ' days')")
      .replace(/DATE_FORMAT\(([^,]+),\s*'([^']+)'\)/gi, (match, col, format) => {
        let sqliteFormat = format.replace('%Y', '%Y').replace('%m', '%m').replace('%d', '%d');
        return `strftime('${sqliteFormat}', ${col})`;
      });

    if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
      const rows = await db.all(sqliteQuery, params);
      return [rows, []];
    } else {
      const result = await db.run(sqliteQuery, params);
      return [{ insertId: result.lastID, affectedRows: result.changes }, []];
    }
  }
};

async function testConnection() {
  try {
    if (!db) await initDb();
    // Test a simple query to ensure everything is connected
    await db.get('SELECT 1');
    console.log('✅ SQLite connected successfully');
  } catch (err) {
    console.error('❌ SQLite connection failed:', err.message);
  }
}

module.exports = { pool, testConnection };
