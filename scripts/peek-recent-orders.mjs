// Read-only, PII-free. Answers one question: which database am I pointed at,
// and does it contain the rows an e2e run just created?
//
// Deliberately selects no name and no email — only shape. Prints the marker
// match as a boolean so a test row can be identified without echoing a real
// customer's details.
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows } = await pool.query(
  `select id, created_at, kind, branch, charge_cents, stripe_status,
          notified_at is not null as notified,
          split_part(email,'@',2) = 'wintergarten-e2e.invalid' as e2e_email,
          name = 'E2E TEST — do not fulfil' as e2e_name,
          left(coalesce(stripe_session_id,''), 8) as session_prefix
     from orders order by id desc limit 12`
);

console.log(`most recent ${rows.length} order rows (newest first):\n`);
for (const r of rows) {
  console.log(
    [
      `#${r.id}`,
      new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' '),
      r.kind,
      r.branch,
      `$${(r.charge_cents / 100).toFixed(2)}`,
      `stripe=${r.stripe_status ?? 'null'}`,
      `session=${r.session_prefix || 'none'}`,
      `notified=${r.notified}`,
      `e2e=${r.e2e_email && r.e2e_name ? 'BOTH' : r.e2e_email || r.e2e_name ? 'PARTIAL' : 'no'}`,
    ].join('  |  ')
  );
}

const { rows: total } = await pool.query(`select count(*)::int as n from orders`);
console.log(`\ntotal rows in orders: ${total[0].n}`);

await pool.end();
