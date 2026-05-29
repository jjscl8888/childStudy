import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT name FROM migrations');
    const executed = new Set(rows.map(r => r.name));

    const files = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql') && f !== 'migrations.sql')
      .sort();

    for (const file of files) {
      if (executed.has(file)) {
        console.log(`Skip ${file} (already executed)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Executed ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed ${file}:`, err.message);
        throw err;
      }
    }

    console.log('Migration complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
