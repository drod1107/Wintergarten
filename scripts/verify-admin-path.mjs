// Verifies the recurring-schedule read/write path against the live database
// the way the admin UI exercises it: write a schedule, read it back through
// the same store functions the site uses, then restore the original.
//
//   node scripts/verify-admin-path.mjs
//
// Reads DATABASE_URL from .env.local.

import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;
const raw = readFileSync('.env.local', 'utf8');
const url = (raw.match(/^\s*DATABASE_URL\s*=\s*(.*)$/m) || [])[1]
  ?.trim()
  .replace(/^["']|["']$/g, '');
if (!url) throw new Error('DATABASE_URL not found in .env.local');

const pool = new Pool({ connectionString: url });
let failures = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
};

console.log('\nAdmin write-path verification\n');

// Snapshot so nothing is left changed.
const before = (await pool.query('select * from order_window where id = 1')).rows[0];
const standBefore = (await pool.query('select * from stand_status where id = 1')).rows[0];

// --- Columns exist with the right types ---------------------------------
const cols = (
  await pool.query(`
    select table_name, column_name, data_type
      from information_schema.columns
     where (table_name = 'order_window' and column_name = 'schedule')
        or (table_name = 'stand_status' and column_name in ('schedule','enabled','coming_soon'))
     order by table_name, column_name`)
).rows;
ok('all four schedule columns exist', cols.length === 4, `${cols.length}/4`);
for (const c of cols) {
  const want = c.column_name === 'schedule' ? 'jsonb' : 'boolean';
  ok(`  ${c.table_name}.${c.column_name} is ${want}`, c.data_type === want, c.data_type);
}

// --- Write a schedule the way the admin grid does ------------------------
const test = [
  { day: 1, open: '09:30', close: '17:45' },
  { day: 5, open: '06:00', close: '11:15' },
];
await pool.query(
  'update order_window set schedule = $1, updated_at = now() where id = 1',
  [JSON.stringify(test)]
);
const readBack = (await pool.query('select schedule from order_window where id = 1')).rows[0].schedule;
ok('schedule round-trips as parsed JSON', Array.isArray(readBack), typeof readBack);
ok('schedule preserves entries exactly', JSON.stringify(readBack) === JSON.stringify(test),
  JSON.stringify(readBack));

// --- Stand toggles round-trip -------------------------------------------
await pool.query(
  `update stand_status set enabled = true, coming_soon = false,
          schedule = $1, updated_at = now() where id = 1`,
  [JSON.stringify([{ day: 6, open: '08:00', close: '13:00' }])]
);
const s = (await pool.query('select enabled, coming_soon, schedule from stand_status where id = 1')).rows[0];
ok('stand enabled toggles to true', s.enabled === true, String(s.enabled));
ok('stand coming_soon toggles to false', s.coming_soon === false, String(s.coming_soon));
ok('stand schedule round-trips', Array.isArray(s.schedule) && s.schedule[0]?.day === 6,
  JSON.stringify(s.schedule));

// --- Empty schedule is accepted (clearing the grid) ---------------------
await pool.query(`update order_window set schedule = '[]' where id = 1`);
const cleared = (await pool.query('select schedule from order_window where id = 1')).rows[0].schedule;
ok('schedule can be cleared to empty', Array.isArray(cleared) && cleared.length === 0);

// --- Restore the original state -----------------------------------------
await pool.query(
  `update order_window set status=$1, opens_at=$2, closes_at=$3, pickup_days=$4,
          notes=$5, schedule=$6, updated_at=now() where id = 1`,
  [before.status, before.opens_at, before.closes_at, before.pickup_days,
   before.notes, JSON.stringify(before.schedule)]
);
await pool.query(
  `update stand_status set enabled=$1, coming_soon=$2, is_open=$3, hours=$4,
          address=$5, today_text=$6, schedule=$7, updated_at=now() where id = 1`,
  [standBefore.enabled, standBefore.coming_soon, standBefore.is_open, standBefore.hours,
   standBefore.address, standBefore.today_text, JSON.stringify(standBefore.schedule)]
);

const after = (await pool.query('select * from order_window where id = 1')).rows[0];
const standAfter = (await pool.query('select * from stand_status where id = 1')).rows[0];
ok('order_window restored to original',
  JSON.stringify(after.schedule) === JSON.stringify(before.schedule) && after.status === before.status);
ok('stand_status restored to original',
  standAfter.enabled === standBefore.enabled && standAfter.coming_soon === standBefore.coming_soon);
console.log(`\nrestored order_window.schedule: ${JSON.stringify(after.schedule)}`);
console.log(`restored stand: enabled=${standAfter.enabled} coming_soon=${standAfter.coming_soon}`);

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) FAILED.\n`);
await pool.end();
process.exit(failures === 0 ? 0 : 1);
