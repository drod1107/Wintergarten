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
  kind text not null check (kind in ('order', 'wholesale')),
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

-- Orders are created on payment, not on submit (2026-08-20)
-- The row is now written when Stripe confirms payment, so `orders` contains
-- only real sales and enquiries -- never abandoned carts. Both the webhook and
-- the confirmation page can settle the same session, so this index makes the
-- insert idempotent: whichever arrives first wins, the other is a no-op.
create unique index if not exists orders_stripe_session_id_key
  on orders (stripe_session_id)
  where stripe_session_id is not null;

-- Out-of-area orders are enquiries, not a waitlist (2026-08-20)
-- The old 'waitlist' branch promised customers a list that does not exist.
-- Out-of-area now files as 'enquiry' -- captured as a lead, never charged,
-- same shape as a wholesale enquiry. 'waitlist' stays permitted so historical
-- rows remain valid; nothing new is written with it.
alter table orders drop constraint if exists orders_branch_check;
alter table orders add constraint orders_branch_check
  check (branch in ('pickup', 'shipping', 'enquiry', 'waitlist', 'n/a'));

-- Stock holds during checkout (2026-08-20)
-- Orders are only written on payment, so ordered_count no longer moves when a
-- customer starts checkout. A hold takes the unit off the shelf for the length
-- of the checkout window: nobody else can buy it, whether or not the holder
-- pays. Released when the hold expires, when the customer cancels, or when the
-- order settles (at which point ordered_count carries it instead).
create table if not exists reservations (
  stripe_session_id text not null,
  product_id text not null references products(id) on delete cascade,
  qty integer not null check (qty > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (stripe_session_id, product_id)
);

-- Availability is read on every order-page load, and the sweep filters on the
-- same column, so both paths want this.
create index if not exists reservations_expires_at_idx on reservations (expires_at);
