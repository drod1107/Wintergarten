import { Pool } from 'pg';

let pool: Pool | null = null;
let poolInitAttempted = false;

// A live pool means the admin panel and order/email submissions persist.
// Without DATABASE_URL, the site still renders fully against seed data —
// see lib/store.ts — but writes don't survive the request.
export function getPool(): Pool | null {
  if (poolInitAttempted) return pool;
  poolInitAttempted = true;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
    max: 5,
  });
  return pool;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
