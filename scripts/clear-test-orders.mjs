// Clear the pre-launch test orders.
//
// Every row is written to a JSON file next to the repo before anything is
// deleted, so this is recoverable: the backup carries whole rows and can be
// re-inserted. Refuses to run if the table contains anything that does not
// look like test data, so it cannot quietly wipe a real order later.
import { writeFileSync } from 'node:fs';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows } = await pool.query('select * from orders order by id asc');

if (rows.length === 0) {
  console.log('orders is already empty. Nothing to do.');
  await pool.end();
  process.exit(0);
}

// A row is test data if its email or name says so. Anything else stops the run.
const TEST = /(^|@)(example\.com|wintergarten\.test)$|test|windrose\.dev/i;
const suspicious = rows.filter((r) => !TEST.test(r.email || '') && !TEST.test(r.name || ''));

if (suspicious.length > 0) {
  console.error('REFUSING TO DELETE — these do not look like test data:');
  for (const r of suspicious) console.error(`  #${r.id}  ${r.name}  ${r.email}`);
  await pool.end();
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const backup = `orders-backup-${stamp}.json`;
writeFileSync(backup, JSON.stringify(rows, null, 2));
console.log(`backed up ${rows.length} rows to ${backup}`);

const { rowCount } = await pool.query('delete from orders');
console.log(`deleted ${rowCount} rows`);

// The counts those orders consumed have to go back on the shelf too, or the
// batch reads as partly sold before a single real sale.
const reset = await pool.query('update products set ordered_count = 0 where ordered_count <> 0');
console.log(`reset ordered_count on ${reset.rowCount} products`);

const { rows: after } = await pool.query('select count(*)::int as n from orders');
console.log(`orders now: ${after[0].n}`);

await pool.end();
