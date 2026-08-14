-- Wintergarten — schema. Run once against DATABASE_URL to enable
-- persistence and the admin panel. Without this, the site runs in
-- read-only demo mode against lib/seed-data.ts.

create table if not exists products (
  id text primary key,                 -- accession number, e.g. 'WG-B-001'
  type text not null check (type in ('bakery', 'plant', 'occasion')),
  name text not null,
  subtitle text not null default '',
  specs jsonb not null default '[]',   -- [{label, value}]
  price_cents integer not null,
  price_note text not null default '', -- e.g. '· $22 half dozen'
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscribers (
  id serial primary key,
  email text unique not null,
  source text not null default 'site',
  created_at timestamptz not null default now()
);

insert into order_window (id, status) values (1, 'closed') on conflict (id) do nothing;
insert into stand_status (id) values (1) on conflict (id) do nothing;
insert into kitchen_record (id) values (1) on conflict (id) do nothing;
insert into story_page (id) values (1) on conflict (id) do nothing;
