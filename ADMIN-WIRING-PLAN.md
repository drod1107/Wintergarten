# Admin Wiring Plan — Wintergarten
_Last updated: 2026-08-20 (revised after full codebase audit including merged sessions)_

## Architecture summary

The site is a Next.js app on Vercel backed by Neon Postgres. All public pages
(`/`, `/order`, `/kitchen-record`, `/care-guides`, `/story`) are async Server
Components that query the DB directly via `lib/store.ts`. When `DATABASE_URL`
is not set, every `getX()` call falls back to `lib/seed-data.ts` (demo mode).

The admin panel lives at `/admin/dashboard`. It is `force-dynamic` (no cache),
pulls fresh DB data on every load, and writes back through API routes under
`/api/admin/*`. Client components in `components/admin/` manage local state
and POST to those routes.

**Every public page is fully dynamic — changes written to the DB via admin
are reflected immediately on next page load. No deploy needed.**

---

## Order flow / fanout (fully implemented)

On a paid Stripe `checkout.session.completed` event, the webhook at
`/api/stripe/webhook` fans out to three destinations in parallel — all
fire-and-forget (failures never cause Stripe to redeliver):

| Destination | Implementation | Activation |
|---|---|---|
| Zapier webhook | `lib/zapier.ts` → `notifyZapier()` | Set `ZAPIER_WEBHOOK_URL` env var |
| Owner email/SMS via Resend | `lib/notify-email.ts` → `notifyOwnerByEmail()` | Set `RESEND_API_KEY` + `ORDER_NOTIFY_EMAIL` env vars |
| Zoho Books invoice | `lib/zoho.ts` → `recordOrderInZoho()` | Set `ZOHO_CLIENT_ID` + `ZOHO_CLIENT_SECRET` + `ZOHO_REFRESH_TOKEN` env vars |

Wholesale enquiries route through `/api/orders` and trigger only the owner
email (not Stripe/Zoho, since no payment is involved).

---

## What is wired end-to-end (working)

| Feature | Admin UI | API route | Store fn | Public page |
|---|---|---|---|---|
| Order window (open/closed/scheduled, pickup days, notes) | ✅ WindowEditor | ✅ /api/admin/window | ✅ setOrderWindow | ✅ / and /order |
| Farm stand status (open flag, hours, today text) | ✅ StandEditor | ✅ /api/admin/stand | ✅ setStandStatus | ✅ / |
| Homepage "This weekend" announcement | ✅ Stand → todayText | — | — | ✅ / (hidden when empty) |
| Homepage farm stand notice | ✅ Stand → isOpen checkbox | — | — | ✅ / (shown when closed) |
| Product price | ✅ ProductsEditor | ✅ /api/admin/products | ✅ upsertProduct | ✅ / and /order |
| Product capacity / sold-out | ✅ ProductsEditor | ✅ /api/admin/products | ✅ upsertProduct | ✅ / (badge) and /order |
| Product active/inactive | ✅ ProductsEditor | ✅ /api/admin/products | ✅ upsertProduct | ✅ / and /order |
| Product ingredients | ✅ ProductsEditor (expandable, merged PR #6) | ✅ /api/admin/products | ✅ upsertProduct | ✅ /kitchen-record |
| Product allergens | ✅ ProductsEditor (expandable, merged PR #6) | ✅ /api/admin/products | ✅ upsertProduct | ✅ / (SpecimenCard) and /kitchen-record |
| Care guides (add/edit/delete/publish) | ✅ GuidesEditor | ✅ /api/admin/guides | ✅ upsertCareGuide | ✅ /care-guides and / (first 4) |
| Kitchen record allergen statements | ✅ KitchenRecordEditor | ✅ /api/admin/kitchen-record | ✅ setKitchenRecord | ✅ /kitchen-record |
| Story page | ✅ KitchenRecordEditor | ✅ /api/admin/kitchen-record | ✅ setStory | ✅ /story |
| Orders list + CSV export | ✅ read-only table | ✅ /api/admin/orders/export | ✅ getOrders | — |
| Email subscriber list + import + export | ✅ SubscribersImport | ✅ /api/admin/subscribers | ✅ getSubscriberCount | — |
| Paid order → Zapier webhook | — | ✅ stripe/webhook | ✅ notifyZapier | — |
| Paid order → owner email/SMS (Resend) | — | ✅ stripe/webhook | ✅ notifyOwnerByEmail | — |
| Paid order → Zoho Books invoice | — | ✅ stripe/webhook | ✅ recordOrderInZoho | — |

---

## Remaining gaps

### GAP 1 — Product ingredients/allergens need to be written to the live DB
**Context:** PR #6 exposes ingredients/allergens in the admin UI. But the live
Neon DB still has empty `ingredients` fields for several products because the
original seed used `ON CONFLICT DO NOTHING`. The admin UI is now the correct
way to populate them — no script needed.

**Action:** Sir opens admin → Products, expands each product, pastes in the
ingredient list, hits Save. One-time task per product with missing content.

**Products needing content entered via admin (confirm on live site):**
- Iced Lemon Loaf (WG·B·004)
- Iced Lemon Loaf — Whole (WG·B·006)
- Pumpkin Loaf (WG·B·005)
- Pumpkin Loaf — Whole (WG·B·007)
- Der Smoking (WG·O·001)
- Golden Pothos (WG·P·001) — plants have no ingredients; field can stay blank
- Philodendron (WG·P·004) — same
- ZZ Plant (WG·P·003) — same
- Spider Plant (WG·P·005) — same

**Status:** ⬜ OWNER ACTION — enter via admin after PR #6 deploys

---

### GAP 2 — Product specs (batch count, format) not editable in admin
**Impact:** Spec values like "9×13, cut 3×4 — 16 per two-pan session" are
frozen at seed time. Changing them requires a deploy.

**Fix:** Extend ProductsEditor to expose spec values as editable inputs.
Low urgency — specs rarely change.

**Status:** ⬜ TODO (low priority)

---

### GAP 3 — Order window is expired
**Impact:** Window set to "Scheduled, closes at 08/19/2026 8PM" — past.
Site shows "Orders Closed / Opening Soon."

**Fix:** Owner sets to Open/Closed/future date via admin → Window.

**Status:** ⬜ OWNER ACTION

---

### GAP 4 — Zapier env var is a placeholder (no Zaps built yet)
**Impact:** `ZAPIER_WEBHOOK_URL` is set to empty string. No Zaps exist.
Order fanout to Zapier silently no-ops.

**Fix:** Build Zaps (separate work stream from this plan).

**Status:** ⬜ SEPARATE WORK — see FB/Instagram/CRM automation work

---

### GAP 5 — Zoho Books env vars not confirmed set in Vercel production
**Impact:** `ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN` may not be populated.
`isZohoConfigured()` returns false → invoice creation silently skipped.

**Fix:** Verify env vars in Vercel dashboard. The code is fully ready.

**Status:** ⬜ VERIFY — check Vercel env vars

---

### GAP 6 — debug-notify endpoint should be removed
**Impact:** `/api/debug-notify` exposes whether Resend is configured.
Low risk but unnecessary in production.

**Fix:** Delete `app/api/debug-notify/route.ts` once email is confirmed working.

**Status:** ⬜ TODO (housekeeping, after email confirmed)

---

### GAP 7 — Email signup form destination unconfirmed
**Impact:** `/api/subscribe` route exists and likely writes to `subscribers`
table. Not confirmed end-to-end on production.

**Fix:** Submit a test email via the homepage form, verify it appears in
admin → Email List.

**Status:** ⬜ VERIFY

---

## Implementation order (remaining code work)

1. **GAP 2** — specs editor in ProductsEditor (next feature branch)
2. **GAP 6** — delete debug-notify (bundle with next feature branch)
3. GAPs 3, 5, 7 — owner/env var actions, no code

---

## Git workflow (non-negotiable from 2026-08-20)
- All Claude work on feature branches: `claude/feature-name`
- Feature branches PR to `dev`
- Claude tests on feature branch Vercel preview URL before opening PR
- Sir reviews dev's Vercel preview before merging dev → main
- Sir is the only one who merges dev → main
- Never commit or push directly to main or dev

---

## Change log
| Date | Change |
|---|---|
| 2026-08-20 | Initial plan written |
| 2026-08-20 | Revised after full audit of merged sessions — zoho.ts, notify-email.ts, updated seed-data, OrderForm fixes all already implemented |
| 2026-08-20 | PR #6 merged: ingredients/allergens in ProductsEditor, homepage announcements wired to DB |
| 2026-08-20 | dev branch created from main |


The site is a Next.js app on Vercel backed by Neon Postgres. All public pages
(`/`, `/order`, `/kitchen-record`, `/care-guides`, `/story`) are async Server
Components that query the DB directly via `lib/store.ts`. When `DATABASE_URL`
is not set, every `getX()` call falls back to `lib/seed-data.ts` (demo mode).

The admin panel lives at `/admin/dashboard`. It is `force-dynamic` (no cache),
pulls fresh DB data on every load, and writes back through API routes under
`/api/admin/*`. Client components in `components/admin/` manage local state
and POST to those routes.

**Every public page is fully dynamic — changes written to the DB via admin
are reflected immediately on next page load. No deploy needed.**

---

## What is already wired (working end-to-end)

| Feature | Admin UI | API route | Store fn | Public page |
|---|---|---|---|---|
| Order window (open/closed/scheduled, pickup days, notes) | ✅ WindowEditor | ✅ /api/admin/window | ✅ setOrderWindow | ✅ / and /order |
| Farm stand status (open flag, hours, today text) | ✅ StandEditor | ✅ /api/admin/stand | ✅ setStandStatus | ✅ / |
| Product price | ✅ ProductsEditor (price field) | ✅ /api/admin/products | ✅ upsertProduct | ✅ / and /order |
| Product capacity | ✅ ProductsEditor (capacity field) | ✅ /api/admin/products | ✅ upsertProduct | ✅ / (sold-out badge) and /order |
| Product active/inactive | ✅ ProductsEditor (checkbox) | ✅ /api/admin/products | ✅ upsertProduct | ✅ / and /order (hidden when inactive) |
| Care guides (add/edit/delete/publish) | ✅ GuidesEditor | ✅ /api/admin/guides | ✅ upsertCareGuide / deleteCareGuide | ✅ /care-guides and / (first 4 shown) |
| Kitchen record page-level allergen statements | ✅ KitchenRecordEditor | ✅ /api/admin/kitchen-record | ✅ setKitchenRecord | ✅ /kitchen-record |
| Story page | ✅ KitchenRecordEditor (bottom section) | ✅ /api/admin/kitchen-record | ✅ setStory | ✅ /story |
| Orders list + CSV export | ✅ read-only table | ✅ /api/admin/orders/export | ✅ getOrders | — |
| Email subscriber list + import + export | ✅ SubscribersImport | ✅ /api/admin/subscribers | ✅ getSubscriberCount | — |

---

## What is NOT wired (gaps to fix)

### GAP 1 — Product ingredients and allergens not editable in admin
**Impact:** Kitchen record page shows "AWAITING CONTENT FROM OWNER" placeholder
for any product whose `ingredients` field is empty in the DB. The field exists
in the schema and the type; it is just not exposed in ProductsEditor.

**Fix:** Extend `ProductRow` in `components/admin/ProductsEditor.tsx` to
include `ingredients` and `allergens` textareas. The existing save() call
already spreads `...product` into the POST body, so the API route and store
function (`upsertProduct`) will handle it without any changes. UI change only.

**Affected pages when fixed:** `/kitchen-record` (per-product lists), and
`/` (allergens line on SpecimenCard, which already renders `product.allergens`
if non-empty).

**Status:** ✅ IMPLEMENTED — 2026-08-20. Awaiting deploy to verify on live site.

---

### GAP 2 — Product specs (batch count, format, etc.) not editable in admin
**Impact:** The "Cut: 9×13, cut 3×4" spec line and similar factual fields
are frozen at whatever was seeded. To change them requires a code deploy.

**Fix:** Extend `ProductRow` to expose the `specs` array as an editable list.
Each spec is `{label, value}`. A simple repeated pair of text inputs (label
readonly, value editable) is enough — the labels are fixed by product identity,
only the values change.

**Affected pages when fixed:** `/` (SpecimenCard specs), `/order` (OrderForm
product detail if shown), `/kitchen-record` (not shown there — specs are
separate from ingredients).

**Status:** ⬜ TODO (lower priority than GAP 1)

---

### GAP 3 — /care-guides 404 on live site
**Impact:** The nav link "Growing Notes" and footer link both point to
`/care-guides`. That route exists in the codebase (`app/care-guides/page.tsx`)
and 8 guides are confirmed in the DB. The 404 indicates a runtime error on
that page in the deployed build — most likely an uncaught exception in
`getCareGuides()` or `rowToCareGuide()`.

**Fix:** Was a stale CDN edge cache. Page now resolves correctly at
`/care-guides` with all 8 guides. No code change needed.

**Status:** ✅ RESOLVED — no code change required

---

### GAP 4 — Order window "Scheduled / closes at" is expired
**Impact:** The order window is set to "Scheduled, closes at 08/19/2026 8PM"
— that date has passed. The site is showing "Orders Closed / Opening Soon"
on the homepage. This is a data state issue, not a code issue.

**Fix:** Owner updates via admin dashboard → Window section. Set to Open,
Closed, or a future Scheduled date.

**Status:** ⬜ OWNER ACTION — not a code fix

---

### GAP 5 — Two hardcoded field-note blocks on homepage
**Impact:** The homepage has two hardcoded `<div class="field-note">` blocks
in `app/page.tsx`:
1. "This weekend — Iced lemon and pumpkin loaves — both baking this weekend..."
2. "Farm stand — Opening soon — not yet open for walk-up sales..."

These are not editable via admin. They require a code deploy to change.

**Fix:** Implemented without schema change:
- "This weekend" block now renders `stand.todayText` (editable via admin →
  Stand → "On the table today"). Hidden entirely when `todayText` is empty.
- "Farm stand" notice now renders conditionally: shown only when `stand.isOpen`
  is false (the checkbox in admin → Stand). When you open the stand, it
  disappears. Text is now a neutral "not yet open for walk-up sales" rather
  than a hardcoded seasonal claim.

**Status:** ✅ RESOLVED — 2026-08-20

---

### GAP 6 — Email signup form has no confirmed destination
**Impact:** The "One email a week" signup on the homepage POSTs to
`/api/subscribe`. That route exists. Confirm it writes to the `subscribers`
table and that the admin Email List section reflects submissions.

**Fix:** Verify the route works end-to-end. No code change likely needed —
this may already be working.

**Status:** ⬜ VERIFY (low risk)

---

## Implementation order

1. **GAP 1** — ingredients/allergens in ProductsEditor (highest impact, easiest fix)
2. **GAP 3** — /care-guides 404 (broken public page)
3. **GAP 5** — hardcoded homepage announcements (owner needs this weekly)
4. **GAP 2** — specs editor (nice to have, low urgency)
5. **GAP 4** — owner fixes order window via admin (no code needed)
6. **GAP 6** — verify email signup (quick smoke test)

---

## Out of scope for this plan (separate work)
- Zapier wiring (no Zaps exist yet)
- FB/Instagram automation and Meta Business Suite scheduling
- Zoho CRM ← website form submissions
- Email newsletter backend destination (Zoho Campaigns vs Mailchimp TBD)
- Instagram connection

---

## Change log
| Date | Change |
|---|---|
| 2026-08-20 | Initial plan written after full codebase audit |
