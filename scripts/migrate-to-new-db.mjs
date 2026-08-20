// One-time migration: copy the Wintergarten application database from the
// old Neon project to the new one.
//
//   SOURCE (read-only): org "David Windrose" / project wintergarten / neondb
//   TARGET:             org "Wintergarten"   / project wintergarten / neondb
//
// TARGET comes from DATABASE_URL in .env.local. SOURCE is passed as argv[2].
// Safe to re-run: the target tables are truncated and reloaded each time.
//
//   node scripts/migrate-to-new-db.mjs "<source-connection-string>"

import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;

function envLocal(key) {
  const raw = readFileSync('.env.local', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && m[1] === key) return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const SOURCE = process.argv[2];
const TARGET = envLocal('DATABASE_URL');
if (!SOURCE) throw new Error('Pass the source connection string as argv[2].');
if (!TARGET) throw new Error('DATABASE_URL not found in .env.local');
if (SOURCE === TARGET) throw new Error('Source and target are the same database. Aborting.');

const src = new Pool({ connectionString: SOURCE });
const dst = new Pool({ connectionString: TARGET });

// Child tables first on truncate, parents first on load.
const TABLES = [
  'products',
  'order_window',
  'stand_status',
  'kitchen_record',
  'story_page',
  'care_guides',
  'orders',
  'subscribers',
];

const ident = (s) => '"' + String(s).replace(/"/g, '""') + '"';

async function copyTable(table) {
  const { rows } = await src.query(`select * from ${ident(table)}`);
  if (rows.length === 0) return { table, copied: 0 };

  const cols = Object.keys(rows[0]);
  const colList = cols.map(ident).join(', ');

  // jsonb/json columns must be re-serialised; pg returns them already parsed.
  const jsonCols = new Set(
    (
      await src.query(
        `select column_name from information_schema.columns
          where table_name = $1 and data_type in ('json','jsonb')`,
        [table]
      )
    ).rows.map((r) => r.column_name)
  );

  const client = await dst.connect();
  try {
    await client.query('begin');
    for (const row of rows) {
      const values = cols.map((c) =>
        jsonCols.has(c) && row[c] !== null ? JSON.stringify(row[c]) : row[c]
      );
      const params = cols.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `insert into ${ident(table)} (${colList}) values (${params})`,
        values
      );
    }
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw new Error(`${table}: ${err.message}`);
  } finally {
    client.release();
  }
  return { table, copied: rows.length };
}

// 1. Schema on the target.
console.log('Applying lib/schema.sql to target…');
await dst.query(readFileSync('lib/schema.sql', 'utf8'));

// 2. The recurring-schedule columns, in case the target schema predates them.
await dst.query(`
  alter table order_window add column if not exists schedule    jsonb   not null default '[]';
  alter table stand_status add column if not exists enabled     boolean not null default false;
  alter table stand_status add column if not exists coming_soon boolean not null default true;
  alter table stand_status add column if not exists schedule    jsonb   not null default '[]';
`);

// 3. Clear the target so a re-run is idempotent. schema.sql seeds the
//    singleton rows, which would otherwise collide on primary key.
console.log('Clearing target tables…');
await dst.query(`truncate ${TABLES.map(ident).join(', ')} restart identity cascade`);

// 4. Copy.
console.log('Copying data…\n');
const results = [];
for (const t of TABLES) results.push(await copyTable(t));

// 5. Verify row counts match on both sides.
console.log('table              source  target  match');
console.log('-----------------  ------  ------  -----');
let allMatch = true;
for (const t of TABLES) {
  const s = (await src.query(`select count(*)::int n from ${ident(t)}`)).rows[0].n;
  const d = (await dst.query(`select count(*)::int n from ${ident(t)}`)).rows[0].n;
  const ok = s === d;
  if (!ok) allMatch = false;
  console.log(`${t.padEnd(17)}  ${String(s).padStart(6)}  ${String(d).padStart(6)}  ${ok ? 'ok' : 'MISMATCH'}`);
}

// 6. Spot-check the values that identify the real catalogue.
const cactus = (await dst.query("select count(*)::int n from products where id like '%P%006%'")).rows[0].n;
const win = (await dst.query('select status, schedule from order_window where id = 1')).rows[0];
console.log(`\nHoliday Cactus present: ${cactus === 1 ? 'yes' : 'NO'}`);
console.log(`order_window.schedule : ${JSON.stringify(win?.schedule)}`);
console.log(allMatch ? '\nAll row counts match.' : '\nROW COUNT MISMATCH — do not cut over.');

await src.end();
await dst.end();
process.exit(allMatch ? 0 : 1);
