// Read-only: show exactly what is in `orders` before deciding what to delete.
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows } = await pool.query(
  `select id, created_at, kind, branch, name, email,
          subtotal_cents, charge_cents, stripe_status, stripe_session_id
     from orders order by id asc`
);

console.log(`orders: ${rows.length}\n`);
for (const r of rows) {
  console.log(
    [
      `#${r.id}`,
      new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' '),
      r.kind,
      r.branch,
      r.stripe_status,
      `$${(r.charge_cents / 100).toFixed(2)}`,
      r.stripe_session_id ? 'session' : 'no-session',
      r.name || '(no name)',
      r.email || '(no email)',
    ].join('  |  ')
  );
}

const { rows: paid } = await pool.query(
  `select count(*)::int as n from orders where stripe_status = 'paid'`
);
console.log(`\nrows with stripe_status = 'paid': ${paid[0].n}`);

await pool.end();
