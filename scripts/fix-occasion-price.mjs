import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const before = await pool.query(
  'select price_cents, price_note from products where id = $1',
  ['WG·O·002']
);
console.log('before:', before.rows[0]);
await pool.query(
  'update products set price_cents = $1, price_note = $2, updated_at = now() where id = $3',
  [5000, 'to $150+, depending on size and flavour', 'WG·O·002']
);
const after = await pool.query(
  'select price_cents, price_note from products where id = $1',
  ['WG·O·002']
);
console.log('after: ', after.rows[0]);
await pool.end();
