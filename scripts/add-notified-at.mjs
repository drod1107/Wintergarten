// One-off, additive migration: add orders.notified_at (nullable timestamptz).
// Reads DATABASE_URL in-process from .env.local so it never leaves this machine.
// Deliberately does NOT run lib/schema.sql, which also performs a products
// UPDATE and two constraint drop/add cycles against the shared database.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(path.join(root, '.env.local'), 'utf8');
const line = env.split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL='));
if (!line) { console.error('DATABASE_URL not found in .env.local'); process.exit(1); }
const url = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  const before = await pool.query(
    "select column_name from information_schema.columns where table_name='orders' and column_name='notified_at'"
  );
  console.log('exists_before:', before.rows.length > 0);
  await pool.query('alter table orders add column if not exists notified_at timestamptz');
  const after = await pool.query(
    "select column_name, data_type, is_nullable from information_schema.columns where table_name='orders' and column_name='notified_at'"
  );
  console.log('after:', JSON.stringify(after.rows));
  const counts = await pool.query('select count(*)::int as total, count(notified_at)::int as notified from orders');
  console.log('rows:', JSON.stringify(counts.rows[0]));
} catch (err) {
  console.error('MIGRATION_FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
