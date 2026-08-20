import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query(
    `SELECT id, name, price_cents, price_pending, active,
            LEFT(COALESCE(ingredients,''),40) as ing,
            LEFT(COALESCE(allergens,''),40) as alg
     FROM products ORDER BY sort_order`
  );
  for (const r of rows) {
    console.log(
      `${r.id} | ${r.name.padEnd(30)} | $${(r.price_cents/100).toFixed(2)} | pending:${r.price_pending} | active:${r.active} | ing:${r.ing || '(empty)'} | alg:${r.alg || '(empty)'}`
    );
  }
  await pool.end();
}
main().catch(err => { console.error(err); process.exit(1); });
