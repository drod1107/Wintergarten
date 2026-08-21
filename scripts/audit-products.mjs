import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const { rows } = await pool.query(
  'select id, name, type, price_cents, price_note, image_note, list_on_home, active, sort_order from products order by sort_order'
);
for (const r of rows) {
  console.log(
    [
      r.id,
      r.type,
      r.name,
      `$${(r.price_cents / 100).toFixed(2)}`,
      `note="${r.price_note || ''}"`,
      `img="${r.image_note || '(none)'}"`,
      `home=${r.list_on_home}`,
      `active=${r.active}`,
    ].join(' | ')
  );
}
await pool.end();
