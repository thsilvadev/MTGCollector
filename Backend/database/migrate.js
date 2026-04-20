/**
 * Simple SQL migration runner.
 * Reads all *.sql files from database/migrations/ in alphabetical order,
 * runs each one that hasn't been recorded in schema_migrations, then exits.
 *
 * Usage: node database/migrate.js
 * Called automatically by the Docker entrypoint before the server starts.
 */

require('dotenv').config();

const fs      = require('fs');
const path    = require('path');
const mysql   = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const db = await mysql.createConnection({
    host:     process.env.HOST,
    user:     process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    multipleStatements: true,   // needed to run multi-statement SQL files
  });

  try {
    // Ensure the tracking table exists (created by 001, but bootstrap it here too)
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name   VARCHAR(255) NOT NULL PRIMARY KEY,
        run_at DATETIME     NOT NULL
      )
    `);

    const [rows] = await db.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map(r => r.name));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] Skipping ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] Applying ${file}...`);
      await db.query(sql);
      await db.query(
        'INSERT INTO schema_migrations (name, run_at) VALUES (?, NOW())',
        [file]
      );
      console.log(`[migrate] Done: ${file}`);
    }

    console.log('[migrate] All migrations applied.');
  } finally {
    await db.end();
  }
}

run().catch(err => {
  console.error('[migrate] FATAL:', err.message);
  process.exit(1);
});
