// Read-only: prints the order_window row and any recent orders. Changes nothing.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(path.join(root, '.env.local'), 'utf8');
const line = env.split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL='));
const url = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  const w = await pool.query('select * from order_window where id = 1');
  console.log('order_window:', JSON.stringify(w.rows[0]));
  const o = await pool.query(
    'select id, created_at, kind, branch, name, email, charge_cents, notified_at from orders order by id desc limit 5'
  );
  console.log('recent orders:', JSON.stringify(o.rows));
} catch (e) {
  console.error('PEEK_FAILED:', e.message);
} finally {
  await pool.end();
}
