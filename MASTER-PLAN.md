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

### Order fanout (on paid Stripe checkout.session.completed)
1. `lib/zapier.ts` → `notifyZapier()` — fires if `ZAPIER_WEBHOOK_URL` env var is set (currently empty)
2. `lib/notify-email.ts` → `notifyOwnerByEmail()` — fires if `RESEND_API_KEY` + `ORDER_NOTIFY_EMAIL` are set (confirmed set)
3. `lib/zoho.ts` → `recordOrderInZoho()` — fires if `ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN` are set (set but unconfirmed working)

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

**BUG-01: WG·B·006 and WG·B·007 are phantom SKUs — should not exist.**
- One card per product. Iced Lemon Loaf and Pumpkin Loaf are each one product sold in two formats ($4/slice or $20/whole loaf), not two separate products.
- Fix: deactivate WG·B·006 and WG·B·007 via admin API; update WG·B·004 and WG·B·005 specs/price note to communicate both formats on one card.
- Status: ⬜ TODO

**BUG-06 / BUG-07: "Sold as: By the slice (see also: whole frozen loaf)" — "frozen" is fabricated.**
- The word "frozen" was never agreed upon. It is AI-invented copy.
- Fix: update specs on WG·B·004 and WG·B·005 to "By the slice or whole loaf — $4 / $20"
- Status: ⬜ TODO (part of BUG-01 fix)

**BUG-08: Whole-loaf price ($20) not shown on slice card.**
- Once whole-loaf SKUs are removed, the $20 price must appear on the slice card.
- Status: ⬜ TODO (part of BUG-01 fix)

**BUG-09 / BUG-10: Spider Plant and Holiday Cactus SVG illustrations not rendering.**
- Files exist in repo and serve 200. Root cause: SVG path content may not produce visible output at rendered card size. Both SVGs need to be inspected and redrawn if needed.
- Status: ⬜ TODO

**BUG-20: Kitchen Record "Artificial Colour" states "We use only naturally derived food colorings like beet and carrot juice."**
- Wintergarten uses no food coloring whatsoever — natural or artificial. This is fabricated AI copy.
- Fix: update that field in admin → Kitchen Record to accurately state "No food coloring of any kind is used."
- Status: ⬜ TODO (admin UI change, no deploy)

**BUG-16: "How cross-contact is handled" section appears empty on Kitchen Record page.**
- Content may be missing from DB. Check admin → Kitchen Record section.
- Status: ⬜ INVESTIGATE

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

**BUG-26: `/api/debug-notify` endpoint is live in production.**
- Low risk but unnecessary. Delete after email is confirmed working.
- Status: ⬜ TODO (bundle with next code deploy)

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

## Database access — READ THIS BEFORE TOUCHING DATA

There are **two Neon organizations** on this account, each with one project.
Confusing them has cost multiple sessions.

| Neon org | Project | Branch | DB | What it is |
|---|---|---|---|---|
| **David Windrose** | `wintergarten` | `production` | `neondb` | ✅ **THE REAL APP DATABASE** |
| Vercel: Windrose | `umami` | `main` | `verceldb` | ❌ Analytics only — NOT the app |

Verify before writing: the real database has **13 products and Holiday Cactus
(`WG·P·006`)**. The `umami`/`verceldb` database has 12 products and no Holiday
Cactus. One query settles it:

```sql
select count(*) from products where id like '%P%006%';  -- 1 = right DB, 0 = wrong DB
```

The connection string `postgres://default:g9ykUX8mNbli@ep-round-river-a5pzyn9u…`
recorded in earlier notes points at the **umami/analytics** database. It is not
production, despite HISTORY-LOG previously asserting it was.

`DATABASE_URL` in Vercel is an encrypted secret and cannot be recovered:
`vercel env pull` writes it blank, and the dashboard will not re-display it.
To run SQL, use the **Neon SQL Editor** on the `wintergarten` project
(org: David Windrose, branch: `production`). `lib/schema.sql` is idempotent.

Preview and production share this one database, so any preview write is a
real write.

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
