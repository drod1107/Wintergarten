// Remove end-to-end test orders from the database. Nothing else, ever.
//
//   node scripts/clear-e2e-orders.mjs              # dry run: lists, deletes nothing
//   node scripts/clear-e2e-orders.mjs --confirm    # deletes what the dry run listed
//
// Safety, in order of importance:
//   * Two independent markers must BOTH match (see scripts/e2e-marker.mjs).
//     A typo in either one deletes nothing rather than something real.
//   * The email domain is compared with split_part(email,'@',2) = $1, an exact
//     equality on the domain. There is no LIKE anywhere in this file, so there
//     is no pattern that can widen.
//   * The name is compared with =, not a prefix.
//   * Nothing is deleted without --confirm, and everything is printed first.
//   * A suspiciously large match set aborts rather than proceeding.
//   * All writes run in one transaction; any error rolls the whole thing back.
//
// It also puts back the batch capacity those orders reserved. createOrder
// increments products.ordered_count when an order is placed, and deleting the
// order row does not undo that — leaving the count to drift upward until a real
// product reads as sold out. Only kind='order' rows reserved anything:
// wholesale orders carry no items, and arrangements are created with
// reserveCapacity:false.
//
// Reads DATABASE_URL in-process from .env.local and never prints it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { E2E_EMAIL_DOMAIN, E2E_NAME, isE2eRow } from './e2e-marker.mjs';

// If more than this many rows match, something is wrong with the marker and we
// stop rather than delete in bulk.
const SANITY_LIMIT = 50;

const confirm = process.argv.includes('--confirm');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(path.join(root, '.env.local'), 'utf8');
const line = env.split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL='));
if (!line) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}
const url = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();

try {
  console.log(`marker: name = ${JSON.stringify(E2E_NAME)}`);
  console.log(`marker: email domain = ${JSON.stringify(E2E_EMAIL_DOMAIN)}`);
  console.log('');

  const { rows: matched } = await client.query(
    `select id, created_at, kind, branch, name, email, items, charge_cents, notified_at
       from orders
      where split_part(email, '@', 2) = $1
        and name = $2
      order by id`,
    [E2E_EMAIL_DOMAIN, E2E_NAME]
  );

  if (matched.length === 0) {
    console.log('Nothing matches the marker. No test orders to remove.');
    process.exit(0);
  }

  // Re-check every row in JS as well as in SQL. If these ever disagree, stop.
  const mismatched = matched.filter((r) => !isE2eRow(r));
  if (mismatched.length > 0) {
    console.error(
      `ABORT: ${mismatched.length} row(s) came back from the marker query but do not pass the ` +
        'in-process marker check. Refusing to delete anything.'
    );
    process.exit(1);
  }

  console.log(`${matched.length} test order(s) match:`);
  for (const r of matched) {
    const items = Array.isArray(r.items) ? r.items : [];
    const summary = items.map((i) => `${i.qty}×${i.name}`).join(', ') || '(no items)';
    console.log(
      `  #${r.id}  ${new Date(r.created_at).toISOString()}  ${r.kind}/${r.branch}  ` +
        `${r.email}  $${(r.charge_cents / 100).toFixed(2)}  notified_at=${r.notified_at ? 'set' : 'null'}  ${summary}`
    );
  }
  console.log('');

  if (matched.length > SANITY_LIMIT) {
    console.error(
      `ABORT: ${matched.length} matches exceeds the sanity limit of ${SANITY_LIMIT}. ` +
        'That is far more test orders than this project should ever have. Investigate by hand.'
    );
    process.exit(1);
  }

  // Work out the capacity to hand back, from the rows we are about to delete.
  // Only kind='order' reserved any.
  const restore = new Map();
  for (const r of matched) {
    if (r.kind !== 'order') continue;
    for (const item of Array.isArray(r.items) ? r.items : []) {
      const qty = Number(item.qty) || 0;
      if (!item.id || qty <= 0) continue;
      restore.set(item.id, (restore.get(item.id) || 0) + qty);
    }
  }
  if (restore.size > 0) {
    console.log('Batch capacity to hand back:');
    for (const [productId, qty] of restore) console.log(`  ${productId}  -${qty}`);
    console.log('');
  }

  if (!confirm) {
    console.log('Dry run. Nothing was deleted. Re-run with --confirm to delete the above.');
    process.exit(0);
  }

  await client.query('begin');

  const ids = matched.map((r) => r.id);
  const { rows: deleted } = await client.query(
    `delete from orders
      where id = any($1::int[])
        and split_part(email, '@', 2) = $2
        and name = $3
      returning id`,
    [ids, E2E_EMAIL_DOMAIN, E2E_NAME]
  );

  if (deleted.length !== matched.length) {
    await client.query('rollback');
    console.error(
      `ABORT: expected to delete ${matched.length} row(s) but the delete matched ${deleted.length}. ` +
        'Rolled back, nothing changed.'
    );
    process.exit(1);
  }

  for (const [productId, qty] of restore) {
    await client.query(
      'update products set ordered_count = greatest(0, ordered_count - $1) where id = $2',
      [qty, productId]
    );
  }

  await client.query('commit');
  console.log(`Deleted ${deleted.length} test order(s): ${deleted.map((d) => `#${d.id}`).join(', ')}`);
  if (restore.size > 0) console.log(`Handed back capacity on ${restore.size} product(s).`);
} catch (err) {
  try {
    await client.query('rollback');
  } catch {
    /* nothing in flight */
  }
  console.error('CLEANUP_FAILED:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
