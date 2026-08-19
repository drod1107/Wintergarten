import { getPool, hasDatabase } from './db';
import {
  SEED_CARE_GUIDES,
  SEED_KITCHEN_RECORD,
  SEED_ORDER_WINDOW,
  SEED_PRODUCTS,
  SEED_STAND_STATUS,
  SEED_STORY,
} from './seed-data';
import type {
  CareGuide,
  KitchenRecordContent,
  OrderItem,
  OrderRecord,
  OrderWindow,
  Product,
  StandStatus,
} from './types';

// Every read function works with or without DATABASE_URL. Every write
// function succeeds either way, but without a database the write is not
// durable — it's held only for the life of this request/serverless
// invocation, so the order/admin flows are fully clickable in demo mode
// without a real backing store. isDemoMode() lets the UI say so.

export function isDemoMode(): boolean {
  return !hasDatabase();
}

// Reservat items are arranged by conversation, not bought from a cart, and an
// item whose price the owner hasn't set yet can't be charged for at all. Both
// are still listed on the site — they're just not add-to-cart.
export function isOrderable(p: Product): boolean {
  return p.type !== 'reservat' && !p.pricePending;
}

function rowToProduct(r: any): Product {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    subtitle: r.subtitle,
    specs: r.specs,
    priceCents: r.price_cents,
    priceNote: r.price_note,
    pricePending: r.price_pending,
    ships: r.ships,
    capacity: r.capacity,
    orderedCount: r.ordered_count,
    active: r.active,
    sortOrder: r.sort_order,
    imageNote: r.image_note,
    ingredients: r.ingredients,
    allergens: r.allergens,
  };
}

export async function getProducts(opts: { includeInactive?: boolean } = {}): Promise<Product[]> {
  const pool = getPool();
  if (!pool) {
    const products = SEED_PRODUCTS;
    return opts.includeInactive ? products : products.filter((p) => p.active);
  }
  const { rows } = await pool.query(
    opts.includeInactive
      ? 'select * from products order by sort_order asc'
      : 'select * from products where active = true order by sort_order asc'
  );
  return rows.map(rowToProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const pool = getPool();
  if (!pool) return SEED_PRODUCTS.find((p) => p.id === id) ?? null;
  const { rows } = await pool.query('select * from products where id = $1', [id]);
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function upsertProduct(p: Product): Promise<void> {
  const pool = getPool();
  if (!pool) return; // demo mode: accepted, not persisted
  await pool.query(
    `insert into products (id, type, name, subtitle, specs, price_cents, price_note, price_pending, ships, capacity, ordered_count, active, sort_order, image_note, ingredients, allergens, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
     on conflict (id) do update set
       type=$2, name=$3, subtitle=$4, specs=$5, price_cents=$6, price_note=$7, price_pending=$8,
       ships=$9, capacity=$10, ordered_count=$11, active=$12, sort_order=$13, image_note=$14,
       ingredients=$15, allergens=$16, updated_at=now()`,
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

// --- Order window -----------------------------------------------------

function rowToOrderWindow(r: any): OrderWindow {
  return {
    status: r.status,
    opensAt: r.opens_at ? new Date(r.opens_at).toISOString() : null,
    closesAt: r.closes_at ? new Date(r.closes_at).toISOString() : null,
    pickupDays: r.pickup_days,
    notes: r.notes,
  };
}

export async function getOrderWindow(): Promise<OrderWindow> {
  const pool = getPool();
  if (!pool) return SEED_ORDER_WINDOW;
  const { rows } = await pool.query('select * from order_window where id = 1');
  return rows[0] ? rowToOrderWindow(rows[0]) : SEED_ORDER_WINDOW;
}

export async function setOrderWindow(w: OrderWindow): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `insert into order_window (id, status, opens_at, closes_at, pickup_days, notes, updated_at)
     values (1, $1, $2, $3, $4, $5, now())
     on conflict (id) do update set status=$1, opens_at=$2, closes_at=$3, pickup_days=$4, notes=$5, updated_at=now()`,
    [w.status, w.opensAt, w.closesAt, w.pickupDays, w.notes]
  );
}

// Computed, human-facing window state, accounting for a passed closing
// time and exhausted per-item capacity even if nobody flipped a switch.
export type EffectiveWindowState =
  | { state: 'open'; closesAt: string | null; notes: string }
  | { state: 'closed'; reason: 'scheduled' | 'manually-closed' | 'time-passed'; notes: string }
  | { state: 'sold-out'; notes: string };

export async function getEffectiveWindowState(): Promise<EffectiveWindowState> {
  const window = await getOrderWindow();
  if (window.status === 'scheduled') {
    return { state: 'closed', reason: 'scheduled', notes: window.notes };
  }
  if (window.status === 'closed') {
    return { state: 'closed', reason: 'manually-closed', notes: window.notes };
  }
  if (window.closesAt && new Date(window.closesAt).getTime() < Date.now()) {
    return { state: 'closed', reason: 'time-passed', notes: window.notes };
  }
  const products = await getProducts();
  const orderable = products.filter((p) => isOrderable(p));
  const soldOut =
    orderable.length > 0 &&
    orderable.every((p) => p.capacity !== null && p.orderedCount >= p.capacity);
  if (soldOut) return { state: 'sold-out', notes: window.notes };
  return { state: 'open', closesAt: window.closesAt, notes: window.notes };
}

// --- Stand status -------------------------------------------------------

function rowToStandStatus(r: any): StandStatus {
  return {
    isOpen: r.is_open,
    hours: r.hours,
    address: r.address,
    todayText: r.today_text,
    updatedAt: new Date(r.updated_at).toISOString(),
    hoursDayOfWeek: r.hours_day_of_week,
    hoursOpensTime: r.hours_opens_time,
    hoursClosesTime: r.hours_closes_time,
  };
}

export async function getStandStatus(): Promise<StandStatus> {
  const pool = getPool();
  if (!pool) return SEED_STAND_STATUS;
  const { rows } = await pool.query('select * from stand_status where id = 1');
  return rows[0] ? rowToStandStatus(rows[0]) : SEED_STAND_STATUS;
}

export async function setStandStatus(s: Omit<StandStatus, 'updatedAt'>): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `insert into stand_status (id, is_open, hours, address, today_text, hours_day_of_week, hours_opens_time, hours_closes_time, updated_at)
     values (1, $1, $2, $3, $4, $5, $6, $7, now())
     on conflict (id) do update set is_open=$1, hours=$2, address=$3, today_text=$4, hours_day_of_week=$5, hours_opens_time=$6, hours_closes_time=$7, updated_at=now()`,
    [s.isOpen, s.hours, s.address, s.todayText, s.hoursDayOfWeek, s.hoursOpensTime, s.hoursClosesTime]
  );
}

// --- Kitchen record -------------------------------------------------------

export async function getKitchenRecord(): Promise<KitchenRecordContent> {
  const pool = getPool();
  if (!pool) return SEED_KITCHEN_RECORD;
  const { rows } = await pool.query('select content from kitchen_record where id = 1');
  const content = rows[0]?.content as Partial<KitchenRecordContent> | undefined;
  if (!content || Object.keys(content).length === 0) return SEED_KITCHEN_RECORD;
  // Merge with seed so any field not yet saved by the admin falls back to a
  // non-undefined value rather than crashing a .map() call at prerender time.
  return { ...SEED_KITCHEN_RECORD, ...content };
}

export async function setKitchenRecord(content: KitchenRecordContent): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `insert into kitchen_record (id, content, updated_at) values (1, $1, now())
     on conflict (id) do update set content=$1, updated_at=now()`,
    [JSON.stringify(content)]
  );
}

// --- Story page -------------------------------------------------------

export async function getStory(): Promise<string> {
  const pool = getPool();
  if (!pool) return SEED_STORY;
  const { rows } = await pool.query('select content from story_page where id = 1');
  return rows[0]?.content || SEED_STORY;
}

export async function setStory(content: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `insert into story_page (id, content, updated_at) values (1, $1, now())
     on conflict (id) do update set content=$1, updated_at=now()`,
    [content]
  );
}

// --- Care guides -------------------------------------------------------

function rowToCareGuide(r: any): CareGuide {
  return {
    slug: r.slug,
    title: r.title,
    plantAccession: r.plant_accession,
    dek: r.dek,
    body: r.body,
    published: r.published,
    sortOrder: r.sort_order,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function seedGuideAsFull(g: (typeof SEED_CARE_GUIDES)[number]): CareGuide {
  const now = new Date().toISOString();
  return { ...g, createdAt: now, updatedAt: now };
}

export async function getCareGuides(opts: { includeUnpublished?: boolean } = {}): Promise<CareGuide[]> {
  const pool = getPool();
  if (!pool) {
    const guides = SEED_CARE_GUIDES.map(seedGuideAsFull);
    return opts.includeUnpublished ? guides : guides.filter((g) => g.published);
  }
  const { rows } = await pool.query(
    opts.includeUnpublished
      ? 'select * from care_guides order by sort_order asc, created_at asc'
      : 'select * from care_guides where published = true order by sort_order asc, created_at asc'
  );
  return rows.map(rowToCareGuide);
}

export async function getCareGuide(slug: string): Promise<CareGuide | null> {
  const pool = getPool();
  if (!pool) return SEED_CARE_GUIDES.map(seedGuideAsFull).find((g) => g.slug === slug) ?? null;
  const { rows } = await pool.query('select * from care_guides where slug = $1', [slug]);
  return rows[0] ? rowToCareGuide(rows[0]) : null;
}

export async function upsertCareGuide(g: Omit<CareGuide, 'createdAt' | 'updatedAt'>): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `insert into care_guides (slug, title, plant_accession, dek, body, published, sort_order, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())
     on conflict (slug) do update set title=$2, plant_accession=$3, dek=$4, body=$5, published=$6, sort_order=$7, updated_at=now()`,
    [g.slug, g.title, g.plantAccession, g.dek, g.body, g.published, g.sortOrder]
  );
}

export async function deleteCareGuide(slug: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query('delete from care_guides where slug = $1', [slug]);
}

// --- Orders -------------------------------------------------------

function rowToOrder(r: any): OrderRecord {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    kind: r.kind,
    branch: r.branch,
    name: r.name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    distanceMiles: r.distance_miles === null ? null : Number(r.distance_miles),
    referencePoint: r.reference_point,
    pickupDay: r.pickup_day,
    items: r.items,
    subtotalCents: r.subtotal_cents,
    chargeCents: r.charge_cents,
    wholesaleBusiness: r.wholesale_business,
    wholesaleQty: r.wholesale_qty,
    notes: r.notes,
    stripeSessionId: r.stripe_session_id,
    stripeStatus: r.stripe_status,
  };
}

export type NewOrder = {
  kind: 'order' | 'wholesale';
  branch: OrderRecord['branch'];
  name: string;
  email: string;
  phone: string;
  address: string;
  distanceMiles: number | null;
  referencePoint: string | null;
  pickupDay: string;
  items: OrderItem[];
  subtotalCents: number;
  chargeCents: number;
  wholesaleBusiness: string;
  wholesaleQty: string;
  notes: string;
};

let demoOrderId = 1;

export async function createOrder(o: NewOrder): Promise<{ id: number }> {
  const pool = getPool();
  if (!pool) return { id: demoOrderId++ };
  const { rows } = await pool.query(
    `insert into orders (kind, branch, name, email, phone, address, distance_miles, reference_point, pickup_day, items, subtotal_cents, charge_cents, wholesale_business, wholesale_qty, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
    [
      o.kind,
      o.branch,
      o.name,
      o.email,
      o.phone,
      o.address,
      o.distanceMiles,
      o.referencePoint,
      o.pickupDay,
      JSON.stringify(o.items),
      o.subtotalCents,
      o.chargeCents,
      o.wholesaleBusiness,
      o.wholesaleQty,
      o.notes,
    ]
  );
  // Reserve capacity immediately so concurrent orders can't oversell a batch.
  for (const item of o.items) {
    await pool.query('update products set ordered_count = ordered_count + $1 where id = $2', [
      item.qty,
      item.id,
    ]);
  }
  return { id: rows[0].id };
}

export async function setOrderStripeSession(id: number, sessionId: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query('update orders set stripe_session_id = $1 where id = $2', [sessionId, id]);
}

// Returns the order that was marked paid, so callers can forward it onward
// without a second round trip. Null in demo mode, or if the session id
// matches no order.
export async function markOrderPaid(sessionId: string): Promise<OrderRecord | null> {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    "update orders set stripe_status = 'paid', updated_at = now() where stripe_session_id = $1 returning *",
    [sessionId]
  );
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function getOrders(): Promise<OrderRecord[]> {
  const pool = getPool();
  if (!pool) return [];
  const { rows } = await pool.query('select * from orders order by created_at desc');
  return rows.map(rowToOrder);
}

export function ordersToCsv(orders: OrderRecord[]): string {
  const headers = [
    'id',
    'created_at',
    'kind',
    'branch',
    'name',
    'email',
    'phone',
    'address',
    'distance_miles',
    'reference_point',
    'pickup_day',
    'items',
    'subtotal_cents',
    'charge_cents',
    'wholesale_business',
    'wholesale_qty',
    'notes',
    'stripe_status',
  ];
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const o of orders) {
    lines.push(
      [
        o.id,
        o.createdAt,
        o.kind,
        o.branch,
        o.name,
        o.email,
        o.phone,
        o.address,
        o.distanceMiles ?? '',
        o.referencePoint ?? '',
        o.pickupDay,
        JSON.stringify(o.items),
        (o.subtotalCents / 100).toFixed(2),
        (o.chargeCents / 100).toFixed(2),
        o.wholesaleBusiness,
        o.wholesaleQty,
        o.notes,
        o.stripeStatus,
      ]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}

// --- Subscribers -------------------------------------------------------

export async function addSubscriber(email: string, source = 'site'): Promise<'added' | 'exists'> {
  const pool = getPool();
  if (!pool) return 'added';
  try {
    await pool.query('insert into subscribers (email, source) values ($1, $2)', [
      email.trim().toLowerCase(),
      source,
    ]);
    return 'added';
  } catch (err: any) {
    if (err?.code === '23505') return 'exists';
    throw err;
  }
}

export async function importSubscribers(emails: string[]): Promise<{ added: number; skipped: number }> {
  const pool = getPool();
  if (!pool) return { added: 0, skipped: emails.length };
  let added = 0;
  let skipped = 0;
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      skipped++;
      continue;
    }
    const result = await addSubscriber(email, 'import');
    if (result === 'added') added++;
    else skipped++;
  }
  return { added, skipped };
}

export async function getSubscriberCount(): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  const { rows } = await pool.query('select count(*)::int as n from subscribers');
  return rows[0].n;
}

export async function exportSubscribersCsv(): Promise<string> {
  const pool = getPool();
  if (!pool) return 'email,source,created_at\n';
  const { rows } = await pool.query('select email, source, created_at from subscribers order by created_at desc');
  const lines = ['email,source,created_at'];
  for (const r of rows) lines.push(`${r.email},${r.source},${new Date(r.created_at).toISOString()}`);
  return lines.join('\n');
}
