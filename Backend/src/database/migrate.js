/**
 * Simple migration runner.
 * - Reads all .sql files from ./migrations/ in alphabetical order.
 * - Checks schema_migrations table to skip already-applied ones.
 * - Applies missing migrations and records them.
 *
 * Usage: node src/database/migrate.js
 */
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const knex = require('./index');

async function run() {
  const migrationsDir = path.join(__dirname, '../../database/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Ensure schema_migrations exists (bootstraps itself on first run)
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name    VARCHAR(255) NOT NULL PRIMARY KEY,
      run_at  DATETIME     NOT NULL
    )
  `);

  const applied = await knex('schema_migrations').select('name');
  const appliedSet = new Set(applied.map(r => r.name));

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }

    const raw = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // Strip single-line comments, then split into individual statements
    const sql = raw
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await knex.raw(stmt);
    }

    await knex('schema_migrations').insert({ name: file, run_at: new Date() });
    console.log(`  apply ${file}`);
  }

  console.log('Migrations done.');
  await knex.destroy();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
