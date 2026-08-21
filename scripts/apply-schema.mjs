// One-shot: apply lib/schema.sql to the database in DATABASE_URL.
// Every statement in that file is idempotent, so re-running is safe.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is empty. `vercel env pull` blanks it — use the real value.');
  process.exit(1);
}

const sql = readFileSync('lib/schema.sql', 'utf8');
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await pool.query(sql);
  const { rows } = await pool.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_name = 'reservations'`
  );
  console.log('schema applied. reservations table present:', rows.length === 1);
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
