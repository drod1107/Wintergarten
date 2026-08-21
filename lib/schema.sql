-- Wintergarten — schema. Run once against DATABASE_URL to enable
-- persistence and the admin panel. Without this, the site runs in
-- read-only demo mode against lib/seed-data.ts.

create table if not exists products (
  id text primary key,                 -- accession number, e.g. 'WG-B-001'
  type text not null check (type in ('bakery', 'plant', 'reservat')),
  name text not null,
  subtitle text not null default '',
  specs jsonb not null default '[]',   -- [{label, value}]
  price_cents integer not null,
  price_note text not null default '', -- e.g. '· $22 half dozen'
  price_pending boolean not null default false, -- owner has not set a price; listed but not orderable
  ships boolean not null default true,
  capacity integer,                    -- null = unlimited
  ordered_count integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  image_note text not null default '',
  ingredients text not null default '',
  allergens text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_window (
  id integer primary key default 1,
  status text not null default 'closed' check (status in ('scheduled', 'open', 'closed')),
  opens_at timestamptz,
  closes_at timestamptz,
  pickup_days text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

create table if not exists orders (
  id serial primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('order', 'wholesale', 'arrangement')),
  branch text not null check (branch in ('pickup', 'shipping', 'waitlist', 'n/a')),
  name text not null,
  email text not null,
  phone text not null default '',
  address text not null default '',
  distance_miles numeric,
  reference_point text,
  pickup_day text not null default '',
  items jsonb not null default '[]',   -- [{id, name, qty, price_cents}]
  subtotal_cents integer not null default 0,
  charge_cents integer not null default 0, -- what was actually charged (deposit or full)
  wholesale_business text not null default '',
  wholesale_qty text not null default '',
  notes text not null default '',
  stripe_session_id text,
  stripe_status text not null default 'unpaid',
  updated_at timestamptz not null default now()
);

create table if not exists stand_status (
  id integer primary key default 1,
  is_open boolean not null default false,
  hours text not null default '',
  address text not null default '5312 Highway H, Sullivan, MO 63080',
  today_text text not null default '',
  hours_day_of_week text not null default 'Saturday',
  hours_opens_time text not null default '08:00',
  hours_closes_time text not null default '13:00',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

create table if not exists kitchen_record (
  id integer primary key default 1,
  content jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

create table if not exists story_page (
  id integer primary key default 1,
  content text not null default '',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

create table if not exists care_guides (
  id serial primary key,
  slug text unique not null,
  title text not null,
  plant_accession text not null default '',
  dek text not null default '',
  body text not null default '',
  published boolean not null default true,
  sort_order integer not null default 0, -- drives the 01, 02, … numbering on the index
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscribers (
  id serial primary key,
  email text unique not null,
  source text not null default 'site',
  created_at timestamptz not null default now()
);

-- Idempotent column adds, so this file can be re-run against a database
-- created by an earlier version of it. `create table if not exists` above
-- is a no-op once a table exists, so new columns have to be added here.
alter table products add column if not exists price_pending boolean not null default false;
alter table care_guides add column if not exists sort_order integer not null default 0;

-- The occasion tier was renamed to Reservat.
alter table products drop constraint if exists products_type_check;
update products set type = 'reservat' where type = 'occasion';
alter table products add constraint products_type_check
  check (type in ('bakery', 'plant', 'reservat'));

insert into order_window (id, status) values (1, 'closed') on conflict (id) do nothing;
insert into stand_status (id) values (1) on conflict (id) do nothing;
insert into kitchen_record (id) values (1) on conflict (id) do nothing;
insert into story_page (id) values (1) on conflict (id) do nothing;

-- Recurring schedule feature (2026-08-20)
-- order_window: add a weekly recurring schedule stored as a JSONB array.
-- Each element: { day: 0-6 (Sun=0), open: "HH:MM", close: "HH:MM" } in CST.
-- When schedule is non-empty, getEffectiveWindowState() ignores opens_at/closes_at
-- and instead scans forward from now to find the active window.
alter table order_window add column if not exists schedule jsonb not null default '[]';

-- stand_status: add enabled flag (master on/off) and coming_soon flag (public display),
-- plus a weekly recurring schedule in the same shape as order_window.schedule.
-- enabled=false → public shows coming-soon regardless of schedule.
-- coming_soon=true → public shows coming-soon even if enabled=true.
alter table stand_status add column if not exists enabled boolean not null default false;
alter table stand_status add column if not exists coming_soon boolean not null default true;
alter table stand_status add column if not exists schedule jsonb not null default '[]';

-- Alternate formats of a product (a whole loaf alongside the slice) are their
-- own SKU — different price, different weight — but must not get their own
-- card on the landing page. One card per product; both formats orderable.
alter table products add column if not exists list_on_home boolean not null default true;

-- Stripe Tax (2026-08-20)
-- Sales tax is calculated and collected by Stripe at checkout, not by this app.
-- tax_cents records what Stripe actually collected so the order row reconciles
-- against the charge. charge_cents is updated at webhook time to the real total.
alter table orders add column if not exists tax_cents integer not null default 0;

-- notified_at is the once-only guard on the outbound fanout (Zapier, owner
-- email, Zoho). Claiming it is a conditional update, so a redelivered Stripe
-- webhook — or any other double call — finds it already set and sends nothing.
-- Deliberately nullable: null means "not yet notified".
alter table orders add column if not exists notified_at timestamptz;

-- By-arrangement requests (2026-08-21)
-- Reservat items (Der Smoking, occasion cakes) are booked by conversation, not
-- bought from the cart. They arrive as their own order kind so they are not
-- filed as wholesale and are not gated by the bake window.
alter table orders drop constraint if exists orders_kind_check;
alter table orders add constraint orders_kind_check
  check (kind in ('order', 'wholesale', 'arrangement'));
