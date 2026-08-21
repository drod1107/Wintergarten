# Wintergarten — Master Plan
_Owner: derwintergarten.com | Live site, Neon Postgres, Vercel, Next.js App Router_
_Last updated: 2026-08-20_
_This document is the single source of truth for all active and pending work._
_A fresh Claude instance should be able to read this file and execute without any other briefing._

---

## Architecture (read this first)

- **Repo:** github.com/drod1107/Wintergarten
- **Live domain:** https://www.derwintergarten.com (production = main branch)
- **Dev branch:** `dev` — all Claude feature branches PR here; owner merges dev → main
- **Claude branch naming:** `claude/feature-name` → PR to `dev`
- **Vercel project:** windrose/wintergarten (team: windrose, account: david@windrose.dev)
- **DB:** Neon Postgres, `DATABASE_URL` env var in Vercel (single DB, production and preview share it)
- **Stack:** Next.js App Router, TypeScript, plain CSS, `pg` for Postgres, Stripe Checkout, Resend email
- **Admin:** `/admin/dashboard` — force-dynamic, password-protected, all content editable here takes effect immediately on next page load, no deploy needed
- **Demo mode:** if `DATABASE_URL` is unset, site renders from `lib/seed-data.ts` with no persistence
- **Git rule (non-negotiable):** Never commit or push directly to `main` or `dev`. Feature branch → PR to dev → owner merges dev to main. Claude tests on feature branch Vercel preview URL before opening any PR.

### Key files
- `lib/store.ts` — all DB read/write functions; falls back to seed-data.ts when no pool
- `lib/seed-data.ts` — fallback content and source of truth for initial DB state
- `lib/types.ts` — TypeScript types for all data models
- `lib/schema.sql` — DB schema, idempotent (safe to re-run)
- `components/admin/` — all admin UI components (client components, POST to /api/admin/*)
- `app/api/admin/` — admin API routes (requireAdminApi guard on all)
- `app/page.tsx` — homepage (server component, fully dynamic)
- `app/order/page.tsx` — order page (force-dynamic)
- `app/kitchen-record/page.tsx` — kitchen record (server component)
- `app/care-guides/` — growing notes index and slug pages
- `scripts/sync-products.ts` — full upsert of all products from seed-data to DB (safe to re-run; use with DB connection string)

### Environment scoping — verified 2026-08-21

Checked with `vercel env ls`, which shows names and scopes only.

| Variable | `Preview (dev)` override | Environment-wide |
|---|---|---|
| `DATABASE_URL` | yes — separate test database | `Production, Preview` |
| `STRIPE_SECRET_KEY` | yes — **test** key | `Production, Preview` |
| `STRIPE_PUBLISHABLE_KEY` | yes | `Production, Preview` |
| `STRIPE_WEBHOOK_SECRET` | yes — test endpoint | `Production, Preview` |

**Isolation applies to the `dev` branch only.** A deployment built from `dev`
gets the test database and test Stripe keys — confirmed by a `cs_test_` session
id and a "Sandbox" badge at Checkout. **Every other preview branch falls through
to the `Production, Preview` values and therefore reads the production database
with the production Stripe key.** A checkout on a feature-branch preview is a
real charge against real data. Treat any branch preview that is not `dev` as
production.

The intent is to make this Preview-wide. It has **not** landed: Vercel rejects a
second Preview-scoped variable of the same name (`An Environment Variable with
the name 'DATABASE_URL' and target 'preview' already exists`), so the
environment-wide entry has to be narrowed to Production first, and these are
**Sensitive** variables whose values cannot be read back — the edit form's value
box is empty and "Copy to Clipboard" is disabled. Re-scoping therefore needs the
owner, who holds the values.

Notification credentials (`RESEND_API_KEY`, `ORDER_NOTIFY_EMAIL`, `ZOHO_*`,
`ZAPIER_WEBHOOK_URL`) are **not** branch-scoped. Preview sends real email to the
real inbox and writes real Zoho records, even when its payments are test-mode.
That is why a test order produces a genuine-looking notification.

**Stripe webhook endpoints** (dashboard state; nothing in this repo configures
them). Both rows below were read from the Stripe dashboard on 2026-08-21 after
the second event was added, and re-checked on a fresh page load:

| Mode | Name | URL | Events |
|---|---|---|---|
| Live | `wintergarten-production` | `derwintergarten.com/api/stripe/webhook` | `checkout.session.completed`, `checkout.session.async_payment_succeeded` |
| Test | `wintergarten-dev-preview` | `wintergarten-git-dev-windrose.vercel.app/api/stripe/webhook` | same two |

The test endpoint is bound to the **`dev` preview URL specifically**. Stripe
cannot fan out to arbitrary per-branch preview URLs, so webhook-dependent
testing only works on `dev` even once the keys are Preview-wide.

### Order fanout — sales vs leads

**Read this distinction before changing anything in `lib/notify.ts`. Getting it
wrong in either direction has burned this project once already.**

There are two kinds of notification and they follow opposite rules:

| | Fires when | Paths |
|---|---|---|
| **Sale** — "you have been paid" | **Only when Stripe confirms payment.** Never before. | Card order, on `checkout.session.completed` / `checkout.session.async_payment_succeeded` with `payment_status === 'paid'` |
| **Lead** — "someone wants something" | **At creation, always. Independent of payment.** | Wholesale enquiry, arrangement request, waitlist signup |

**Sales.** An unpaid, abandoned, expired, failed or pending-payment checkout is
written to the database for pipeline tracking and accounting and **notifies
nothing**. Anything that reads as an "order" when no money has moved creates a
false obligation to bake and an argument with a customer who never paid. The
only place a sale is ever announced is `app/api/stripe/webhook/route.ts`, behind
`payment_status === 'paid'`.

**Leads.** Wholesale enquiries, arrangement requests and waitlist signups never
touch Stripe, so there is no payment to wait for. They notify at creation and
**must never be silenced** — burying them defeats the entire point of the Zoho
CRM/Books setup, which exists to capture every inbound lead so none is missed.
They label themselves as enquiries rather than sales (`lib/notify-email.ts`
`headline()`), so they cannot be mistaken for money received.

If any of the three lead paths goes quiet, that is a regression, not a fix.

`lib/notify.ts` → `notifyNewOrder()` is the single entry point for both. Note
what it does **not** do: there is no payment check inside it. Hand it an unpaid
payable order and it will fan out. The paid-only rule is enforced entirely at the
**call sites** — the only caller that can pass a payable order is the Stripe
webhook, behind `payment_status === 'paid'`. If you add a new `notifyNewOrder`
call, that check is your responsibility; there is no backstop underneath you.

It fans out to three channels concurrently:

1. `lib/zapier.ts` → `notifyZapier()` — needs `ZAPIER_WEBHOOK_URL`
2. `lib/notify-email.ts` → `notifyOwnerByEmail()` — needs `RESEND_API_KEY` + `ORDER_NOTIFY_EMAIL`
3. `lib/zoho.ts` → `recordOrderInZoho()` — needs `ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN`

Outcomes are logged as `[notify] order N (kind/branch) zapier=… email=… zoho=…`
in the Vercel runtime logs. `orders.notified_at` is claimed before sending so a
redelivered webhook sends nothing, and released if nothing was delivered.

Full rule and the settled scope: issue #22.

---

## Weekly operational workflow (owner)

| Day | Action |
|---|---|
| Sunday 8AM CST | Orders open automatically |
| Sunday | Post 3 photos to FB/Instagram (manual for now) |
| Sunday–Thursday | Orders accepted |
| Thursday 8PM CST | Orders close automatically |
| Friday | Bake |
| Saturday | Deliver |

---

## Active work — IN PROGRESS

### FEATURE: Recurring order window + farm stand schedule
**Branch to create:** `claude/recurring-schedule`
**Status:** 🟡 IN PROGRESS — branch pushed, awaiting Vercel preview URL for testing

**User-facing behavior (do not deviate from this):**

**Order window:**
- Opens automatically every Sunday at 8AM CST, closes every Thursday at 8PM CST
- No action needed from owner week to week
- Owner can change the schedule from admin at any time — whatever is set persists and repeats until changed again
- Admin UI: a simple day-of-week grid with open time and close time per day. Leave a day blank to skip it. The system scans forward from now through the week to find the next open→close window and determines current state from that.
- Current DB record: single open/close datetime — needs to be replaced with a recurring schedule model

**Farm stand:**
- Currently: no farm stand exists. The public site should show a "Coming Soon" treatment, nothing else.
- Admin has a master on/off toggle — currently OFF. When OFF, the coming-soon display shows publicly regardless of any schedule set.
- When ON, the farm stand schedule applies (same day/time grid as order window) and the public site shows the stand hours for the current week.
- No "open right now" toggle needed for day-of — the schedule handles it automatically
- Admin can clear the schedule or toggle off to temporarily suspend

**Implementation steps:**
1. [x] Read all target files
2. [x] Write schema migration (new columns on `order_window` and `stand_status`)
3. [x] Update `lib/types.ts` — added `ScheduleEntry`, updated `OrderWindow` and `StandStatus`
4. [x] Update `lib/store.ts` — `getEffectiveWindowState()` scans recurring schedule; legacy path preserved
5. [x] Update `lib/seed-data.ts` — default Sun 8AM open / Thu 8PM close for order window; stand defaults to enabled=false, comingSoon=true
6. [x] Update `lib/schema.sql` — idempotent ALTER TABLE; migration applied to prod Neon
7. [x] Update `components/admin/WindowEditor.tsx` — 7-row day/time grid
8. [x] Update `components/admin/StandEditor.tsx` — master enabled toggle + comingSoon toggle + 7-row day/time grid
9. [x] Update `components/StandStatusBlock.tsx` — coming-soon mode when !enabled || comingSoon
10. [x] Update `app/page.tsx` — announcement banner only when stand enabled and not comingSoon
11. [x] Update `/api/admin/window` route — passes schedule field through
12. [x] Test on Vercel preview URL — verified: `Orders open · Closing Thu, Aug 20, 8 PM`, stand `Coming soon`
13. [x] Open PR to dev

**Additional fixes made while completing this feature:**
- **Static-rendering defect (the real blocker).** `app/page.tsx`,
  `kitchen-record`, `story` and both `care-guides` pages read the DB but
  declared no rendering mode, so Next.js prerendered them at build time and
  they never re-read the database. This is why admin edits appeared to do
  nothing until a redeploy, and it masked the recurring schedule entirely.
  All five now `export const dynamic = 'force-dynamic'`.
- **Timezone defect.** `OrderWindowBanner` formatted the close time with no
  `timeZone`, so server rendering in UTC published "Closing Fri, Aug 21, 1 AM"
  for a window closing Thu 8 PM Central. Fixed, plus the admin orders table.
- **DST defect.** The schedule scanner inferred DST from the *host* clock,
  which on Vercel (UTC) is always wrong — it would have hardcoded CDT and put
  every open/close an hour off from November to March. Now reads the real
  America/Chicago offset from `Intl`.
- `scripts/test-schedule.ts` — 21 assertions across the week in CDT and CST
  plus the March DST transition. Run with `npx tsx scripts/test-schedule.ts`.

**Update this file after each step is completed.**

---

## Bug queue — from SITE-AUDIT.md (2026-08-20)

All bugs confirmed against live production deployment commit 1f2bb63.
Fix nothing without updating this file first.

### P0 — Blocking orders (fix immediately after recurring-schedule feature)

**BUG-13 / BUG-15: Order window shows closed — customers cannot order.**
- Root cause was twofold: no recurring schedule, *and* the homepage was
  statically prerendered so it could never reflect a window change anyway.
- Status: ✅ FIXED on `claude/recurring-schedule` — pending merge to dev/main

### P1 — Visible errors on live public site

**BUG-01 / BUG-04 / BUG-05 / BUG-14: one card per loaf type.**
- Owner ruling (2026-08-20): the SKUs are correct and must exist. Every loaf
  sells as a slice ($4) and as a whole loaf ($20); the formats differ in cost
  and weight, so each needs its own SKU to be charged for. The error was a
  second *card* on the landing page for a format that already had one.
- Fix: `products.list_on_home` — WG·B·006/007 stay active and orderable but do
  not appear in the landing grid. "From the oven" count now reflects cards.
- Status: ✅ FIXED

**BUG-02 / BUG-03 / BUG-06 / BUG-07: the word "frozen" is fabricated copy.**
- Never agreed by the owner. Appeared in subtitles, Format specs, and "Sold as".
- Status: ✅ FIXED — no occurrence remains in the database or `seed-data.ts`.

**BUG-08: whole-loaf price not shown on the slice card.**
- Status: ✅ FIXED — price note reads "/slice · $20 whole loaf", owner-approved.

**BUG-09 / BUG-10: Spider Plant and Holiday Cactus SVGs not rendering.**
- Files exist in repo and serve 200. Root cause: SVG path content may not produce visible output at rendered card size. Both SVGs need to be inspected and redrawn if needed.
- Status: ⬜ TODO

**BUG-20: Kitchen Record "Artificial Colour" copy.**
- Owner ruling (2026-08-20): the beet and carrot juice line is the owner's own
  wording and is correct. It was wrongly deleted and has been restored.
- Status: ✅ CLOSED — not a bug.

**BUG-16: "How cross-contact is handled" section empty on Kitchen Record.**
- The `crossContact` field was an empty string in the database.
- Status: ✅ FIXED — restored to the owner's supplied statement, verbatim.

**BUG-18: WG·B·006 listed on the kitchen record.**
- The kitchen record uses `includeInactive: true`, so alternate-format SKUs
  appear there as separate entries.
- Status: ⬜ DECISION NEEDED FROM OWNER — same question as BUG-17/19 below.

**BUG-21 / BUG-22: care guides for plants not currently sold.**
- Owner ruling (2026-08-20): care guides are permanent and append-only. They
  are never removed or unpublished regardless of inventory, because they exist
  to bring in search traffic, not to mirror stock. The Monstera guide was
  wrongly unpublished and has been restored.
- Status: ✅ CLOSED — not a bug.

### P2 — Content cleanup

**BUG-11 / BUG-12: Plant card tab line shows spec value instead of tier label.**
- Plants have no tier label (bakery = "Everyday", reservat = "Reservat", plant = ""). The SpecimenCard falls back to `product.specs[0]?.value` which is the Light spec — wrong. Should show "Rooted in soil" or be blank.
- Fix: code change in `components/SpecimenCard.tsx`
- Status: ⬜ TODO

**BUG-17 / BUG-19: Kitchen record lists all 13 products including inactive ones.**
- Decision needed: should kitchen record show all products ever sold (full transparency for allergy community) or only currently active products? Log the decision and implement.
- Status: ⬜ DECISION NEEDED FROM OWNER

**BUG-21: "Why Your Monstera Hasn't Split Yet" care guide is published.**
- Monstera is not in current inventory. This guide should be unpublished.
- Fix: admin → Guides → unpublish it. No deploy.
- Status: ⬜ TODO (admin action)

### P3 — Infrastructure

**BUG-23: Email signup form not confirmed end-to-end.**
- Test: submit a real email on the homepage, check admin → Email List. No code change likely needed.
- Status: ⬜ VERIFY

**BUG-24: Zoho Books env vars set but unconfirmed working.**
- Paid orders may not be creating Zoho invoices. Place a test order and check Zoho Books.
- Status: ⬜ VERIFY

**BUG-25: ZAPIER_WEBHOOK_URL is empty — no Zaps built.**
- Separate work stream. Not blocking anything critical.
- Status: ⬜ FUTURE WORK

**BUG-26: `/api/debug-notify` endpoint was live in production.**
- It was worse than "low risk": it returned `ORDER_NOTIFY_EMAIL` in plaintext to
  any unauthenticated caller.
- Deleted in PR #18/#19. `/api/debug-notify` returns 404 on the dev deployment,
  checked 2026-08-21, and no `app/api/debug-notify` directory exists in the tree.
- Status: ✅ FIXED

**BUG-27: Direct push to main bypassed branch protection (commit 1f2bb63).**
- One empty commit exists directly on main. Branch protection rule may not be enforced. Investigate Vercel/GitHub integration and tighten rules.
- Status: ⬜ INVESTIGATE

**BUG-28: Vercel does not auto-deploy on PR merge to main.**
- PR #8 merge did not trigger a Vercel production build automatically. Required manual push to trigger. Root cause unknown.
- Status: ⬜ INVESTIGATE

---

## Completed work (2026-08-20 session)

- PR #6 merged to main: ingredients/allergens editable in admin ProductsEditor; homepage announcements wired to `stand.todayText` and `stand.isOpen`
- PR #7 merged to dev then main via PR #8: spider-plant.svg and holiday-cactus.svg added
- `dev` branch created from main
- All product prices corrected in live DB via admin API
- Snickerdoodle: $3.00 ✅
- Iced Lemon Loaf and Pumpkin Loaf: $4.00/slice ✅
- Pumpkin Loaf price pending resolved ✅
- Ingredients entered for all bakery products from locked recipes ✅
- WG·P·006 Holiday Cactus added to DB ($12, capacity 5) ✅
- WG·P·005 Spider Plant added to DB ($10, capacity 4) ✅
- Brownies, Snickerdoodle, Pothos, Philodendron, ZZ Plant set inactive ✅
- Care guides for Spider Plant and Holiday Cactus added ✅
- todayText updated: "Iced lemon loaf · pumpkin loaf · spider plant · holiday cactus" ✅
- SITE-AUDIT.md written with 29 itemized bugs ✅
- ADMIN-WIRING-PLAN.md (superseded — consolidated into this document)

---

## Database access

The application database is Neon: org **Wintergarten**, project `wintergarten`,
branch `production`, database `neondb`. The connection string is in
`.env.local`, and `DATABASE_URL` in Vercel points at the same database for both
Production and Preview.

Migrated to this database on 2026-08-20 from an earlier Neon project. All rows
transferred with counts verified on both sides: 13 products, 9 care guides,
10 orders, and the singleton rows. `scripts/migrate-to-new-db.mjs` performed it.

Two other databases have been mistaken for the application database in past
sessions:

| Location | What it is |
|---|---|
| Neon org "Vercel: Windrose", project `umami`, db `verceldb` | Analytics only — not the app |
| Neon org "David Windrose", project `wintergarten`, db `neondb` | The pre-migration app database |

`DATABASE_URL` in Vercel is an encrypted secret and cannot be recovered:
`vercel env pull` writes it blank and the dashboard will not re-display it.
Use the Neon console.

Preview and production share one database, so any preview write is a real
write. `lib/schema.sql` is idempotent.

---

## Documents in repo root — purpose

| File | Purpose | Keep? |
|---|---|---|
| MASTER-PLAN.md (this file) | Single source of truth for all active work and bug queue | ✅ KEEP |
| HISTORY-LOG.md | Audit trail of past decisions and context | ✅ KEEP |
| CLAUDE.md | Operating rules for Claude sessions (git, testing, DB, content) | ✅ KEEP |
| SETUP.md | Owner-facing: how to configure env vars and run seed | ✅ KEEP (owner doc) |
| DEPLOY.md | Owner-facing: production setup runbook | ✅ KEEP (owner doc) |
| HANDOVER.md | Owner-facing: day-to-day admin tasks (some detail outdated — ingredients are now editable in admin) | ✅ KEEP but update |
| AGENTS.md | Auto-generated by `next dev`; leave in place | ✅ KEEP |
| README.md | Repo overview | ✅ KEEP |

Deleted 2026-08-20: `ADMIN-WIRING-PLAN.md` and `SITE-AUDIT.md` (both fully
superseded by this file).
