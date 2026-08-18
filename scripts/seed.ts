// Populates a fresh database with the schema and starting content.
// Usage: DATABASE_URL=postgres://... npm run seed

import { readFileSync } from 'fs';
import path from 'path';
import { Pool } from 'pg';
import {
  SEED_CARE_GUIDES,
  SEED_KITCHEN_RECORD,
  SEED_ORDER_WINDOW,
  SEED_PRODUCTS,
  SEED_STAND_STATUS,
  SEED_STORY,
} from '../lib/seed-data';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Nothing to do.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  });

  console.log('Applying schema...');
  const schema = readFileSync(path.join(__dirname, '..', 'lib', 'schema.sql'), 'utf8');
  await pool.query(schema);

  console.log('Seeding products...');
  for (const p of SEED_PRODUCTS) {
    await pool.query(
      `insert into products (id, type, name, subtitle, specs, price_cents, price_note, price_pending, ships, capacity, ordered_count, active, sort_order, image_note, ingredients, allergens)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (id) do nothing`,
      [
        p.id,
        p.type,
        p.name,
        p.subtitle,
        JSON.stringify(p.specs),
        p.priceCents,
        p.priceNote,
        p.pricePending,
        p.ships,
        p.capacity,
        p.orderedCount,
        p.active,
        p.sortOrder,
        p.imageNote,
        p.ingredients,
        p.allergens,
      ]
    );
  }

  console.log('Seeding order window...');
  await pool.query(
    `update order_window set status=$1, pickup_days=$2, notes=$3, updated_at=now() where id = 1`,
    [SEED_ORDER_WINDOW.status, SEED_ORDER_WINDOW.pickupDays, SEED_ORDER_WINDOW.notes]
  );

  console.log('Seeding stand status...');
  await pool.query(
    `update stand_status set is_open=$1, hours=$2, address=$3, today_text=$4, hours_day_of_week=$5, hours_opens_time=$6, hours_closes_time=$7, updated_at=now() where id = 1`,
    [
      SEED_STAND_STATUS.isOpen,
      SEED_STAND_STATUS.hours,
      SEED_STAND_STATUS.address,
      SEED_STAND_STATUS.todayText,
      SEED_STAND_STATUS.hoursDayOfWeek,
      SEED_STAND_STATUS.hoursOpensTime,
      SEED_STAND_STATUS.hoursClosesTime,
    ]
  );

  console.log('Seeding kitchen record...');
  await pool.query(`update kitchen_record set content=$1, updated_at=now() where id = 1`, [
    JSON.stringify(SEED_KITCHEN_RECORD),
  ]);

  console.log('Seeding story page...');
  await pool.query(`update story_page set content=$1, updated_at=now() where id = 1`, [SEED_STORY]);

  console.log('Seeding care guides...');
  for (const g of SEED_CARE_GUIDES) {
    await pool.query(
      `insert into care_guides (slug, title, plant_accession, dek, body, published, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (slug) do nothing`,
      [g.slug, g.title, g.plantAccession, g.dek, g.body, g.published, g.sortOrder]
    );
  }

  // Products the owner has withdrawn. Seeding runs against databases that may
  // already carry them, so retire them explicitly rather than leaving them
  // live from an earlier seed.
  const retired = ['WG·B·003', 'WG·P·002'];
  const { rowCount } = await pool.query('delete from products where id = any($1)', [retired]);
  if (rowCount) console.log(`Removed ${rowCount} withdrawn product(s).`);

  console.log('Done.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
