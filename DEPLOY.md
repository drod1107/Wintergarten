# Production setup runbook

Everything in the codebase is ready. What's left is account-level
configuration in Vercel and Stripe — steps that need dashboard access and
live secrets, so they have to be done by the account owner.

Work top to bottom; each step takes a minute or two.

---

## 1. Provision Postgres

Vercel dashboard → your project → **Storage** → **Create Database** →
**Postgres** → pick the region nearest Missouri (`iad1`, US East) →
**Create**.

Vercel automatically adds `DATABASE_URL` (plus `POSTGRES_*` aliases) to the
project's environment variables for all environments. Nothing to copy by
hand. Only `DATABASE_URL` is read by this app.

## 2. Set the remaining environment variables

Project → **Settings** → **Environment Variables**. Add each of these to
**Production, Preview and Development** unless noted.

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | the chosen admin password — delivered separately, not stored in this repo |
| `ADMIN_SESSION_SECRET` | a 64-character hex string — see below |
| `NEXT_PUBLIC_SITE_URL` | `https://derwintergarten.com` |
| `ZAPIER_WEBHOOK_URL` | *(leave empty for now)* |
| `STRIPE_SECRET_KEY` | `sk_test_…` — from step 3 |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` — from step 3 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` — from step 4 |

Secrets are deliberately not written down in this repository — anything
committed here is permanent in git history and visible to anyone with
repository access. Paste them straight into the Vercel dashboard.

`ADMIN_SESSION_SECRET` signs admin login cookies; it is not the password,
and it never needs to be memorable. Generate one with:

```
openssl rand -hex 32
```

Rotating it later is harmless — it just signs everyone out.

## 3. Stripe keys (test mode)

stripe.com → **Developers** → **API keys**, with the sandbox/test toggle on.
Copy the **Secret key** (`sk_test_…`) and **Publishable key** (`pk_test_…`)
into the two variables above.

Going live later is a straight swap to the `sk_live_…` / `pk_live_…` pair —
no code changes; nothing in the code path is test-mode specific.

## 4. Stripe webhook

Stripe → **Developers** → **Webhooks** → **Add endpoint**.

- Endpoint URL: `https://derwintergarten.com/api/stripe/webhook`
- Events to send: **`checkout.session.completed`** (this one only)

Stripe then shows a **Signing secret** (`whsec_…`). Put it in
`STRIPE_WEBHOOK_SECRET`.

The endpoint must exist and be publicly reachable before Stripe will accept
it, so do this after the first successful production deploy on the real
domain.

## 5. Seed the database

Once `DATABASE_URL` exists, load the schema and the starting catalog. From a
machine with the repo checked out:

```
# copy the value from Vercel → Storage → your database → .env.local tab
DATABASE_URL='postgres://…' npm run seed
```

This applies `lib/schema.sql` and loads products, care guides, the story
page, the kitchen record and stand status. It is safe to re-run: existing
rows are left alone, missing columns are added, and the two withdrawn
products (Angel Food Cupcake, Swiss Cheese Monstera) are removed if an
earlier seed created them.

Alternatively, run it from the Vercel CLI without handling the string
yourself:

```
npx vercel env pull .env.local
npm run seed
```

## 6. Domain

Project → **Settings** → **Domains** → add `derwintergarten.com` and follow
the DNS instructions Vercel shows for the registrar.

`NEXT_PUBLIC_SITE_URL` (step 2) is what canonical URLs, the sitemap, Open
Graph tags and Stripe's return URLs are built from, so it must match the
final domain exactly, with `https://` and no trailing slash.

## 7. Verify

After the deploy finishes:

- [ ] Homepage loads and the demo-mode banner is **gone** (that banner is
      what tells you `DATABASE_URL` isn't connected yet).
- [ ] `/admin` accepts the password and the dashboard lists 9 products.
- [ ] Change a price in the admin, reload the homepage, confirm it stuck —
      that proves the database is connected and writable.
- [ ] Place a test order and pay with Stripe's test card
      `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
- [ ] Stripe → Webhooks → your endpoint shows a successful
      `checkout.session.completed` delivery.
- [ ] The order shows as **paid** in the admin orders export.

## 8. Zapier, when you're ready

Create a Zap with a **Webhooks by Zapier → Catch Hook** trigger, copy the
URL it generates into `ZAPIER_WEBHOOK_URL`, and redeploy. The order payload
format is documented in `SETUP.md`. Until then the empty value is skipped
silently and nothing else changes.
