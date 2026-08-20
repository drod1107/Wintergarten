// Writes the default recurring order-window schedule into the database:
// open Sunday 08:00 CST, close Thursday 20:00 CST, repeating weekly.
// Also ensures the farm stand is off with the coming-soon notice showing.
// Safe to re-run. Usage: DATABASE_URL=... node scripts/set-default-schedule.mjs
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const schedule = [
  { day: 0, open: '08:00', close: '23:59' },
  { day: 4, open: '00:00', close: '20:00' },
];

await pool.query(
  `update order_window
      set schedule = $1,
          opens_at = null,
          closes_at = null,
          updated_at = now()
    where id = 1`,
  [JSON.stringify(schedule)]
);

await pool.query(
  `update stand_status
      set enabled = false,
          coming_soon = true,
          is_open = false,
          schedule = '[]',
          updated_at = now()
    where id = 1`
);

const w = (await pool.query('select status, schedule from order_window where id = 1')).rows[0];
const s = (await pool.query('select enabled, coming_soon, schedule from stand_status where id = 1')).rows[0];
console.log('order_window:', JSON.stringify(w));
console.log('stand_status:', JSON.stringify(s));
await pool.end();
