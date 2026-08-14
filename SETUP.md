# Setup

This is a Next.js 16 (App Router) site. It runs fully — every page, the order
form, and the admin panel — with **no environment variables set at all**,
against seed content in `lib/seed-data.ts`. That's "demo mode": you can click
through the whole site, but nothing submitted (orders, email signups, admin
edits) is saved between requests, and a banner says so.

To make it real, wire up the three things below. Each is independent — you
can add them in any order, or skip the ones you don't need yet.

## 1. Database (Postgres) — makes admin edits and orders persist

Any standard Postgres works: Vercel Postgres, Neon, Supabase, or your own.

1. Create a database and copy its connection string.
2. Set `DATABASE_URL` in your environment (locally: `.env.local`; on Vercel:
   Project Settings → Environment Variables).
3. Run the schema + seed script once:
   ```
   DATABASE_URL=postgres://... npm run seed
   ```
   This creates all tables (`lib/schema.sql`) and loads the starting products,
   care guides, and stand status. Safe to re-run — it won't duplicate rows.

Without `DATABASE_URL`, reads fall back to seed data and writes are accepted
but not persisted (`lib/store.ts` — every function checks `getPool()` and
degrades gracefully).

## 2. Stripe (test mode) — makes checkout actually charge a test card

1. Create a free Stripe account if you don't have one, and make sure you're
   in **Test mode** (toggle top-right of the Stripe dashboard).
2. Dashboard → Developers → API keys. Copy the test **Secret key** and
   **Publishable key**.
3. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`.
4. Optional but recommended: Dashboard → Developers → Webhooks → add endpoint
   `https://yourdomain.com/api/stripe/webhook`, select
   `checkout.session.completed`, copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`. This is a reliability backstop — payment is
   already confirmed on the order confirmation page itself, but the webhook
   catches the case where a customer closes the tab before returning.
5. Test with Stripe's published test card: `4242 4242 4242 4242`, any future
   expiry, any CVC, any ZIP.

Without a Stripe key, the order flow still completes end-to-end — the
confirmation page just says payment was skipped, and the order is recorded
as unpaid. This means the checkout UI and the geocoding/branching logic are
fully demonstrable without a Stripe account.

**Going live:** switch the Stripe dashboard out of test mode and swap in the
live keys. Nothing else changes — nothing in the code path is test-mode
specific. The same checkout also handles a future higher-priced single item
(e.g. a $75 private-dinner deposit) with no code changes — it's just another
product with a price.

## 3. Admin login

Set `ADMIN_PASSWORD` (any password you choose) and `ADMIN_SESSION_SECRET`
(any long random string — used to sign the login session, not the password
itself). Both are required together; the login page says so if either is
missing.

```
ADMIN_SESSION_SECRET=$(openssl rand -hex 32)
```

Log in at `/admin`. Sessions last 30 days.

## Geocoding (no setup needed)

The order form's address → pickup/shipping branching uses two free, keyless
services: the US Census Bureau geocoder (primary) and OpenStreetMap
Nominatim (fallback). No API key, no account, no cost. If both fail to
resolve an address (rare — mostly PO boxes or malformed input), the form
falls back to asking the customer to pick pickup or shipping manually,
which keeps the "never a dead end for an out-of-area customer" requirement
intact even when geocoding itself fails.

Note: this doesn't work from network-sandboxed dev environments that block
arbitrary outbound HTTPS (which is why local testing during the build used
the manual fallback path) — it works normally from Vercel's runtime, which
has ordinary outbound internet access.

## Environment variable summary

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | Persistence | Any Postgres connection string |
| `ADMIN_PASSWORD` | Admin login | Plain password, compared with a timing-safe check |
| `ADMIN_SESSION_SECRET` | Admin login | Long random string |
| `STRIPE_SECRET_KEY` | Checkout | Test or live, from the Stripe dashboard |
| `STRIPE_PUBLISHABLE_KEY` | Checkout | Currently unused server-side but reserved for a future client Elements upgrade |
| `STRIPE_WEBHOOK_SECRET` | Checkout reliability | Optional |
| `NEXT_PUBLIC_SITE_URL` | Metadata, Stripe redirect URLs | Set to your real domain in production |

## Local development

```
npm install
npm run dev
```

## Deploying

Standard Vercel deploy — connect the repo, set the environment variables
above in the Vercel project settings, deploy. No build configuration needed
beyond the defaults; `next build` is the build command.
