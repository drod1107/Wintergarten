# Wintergarten Site Audit — derwintergarten.com
_Audited: 2026-08-20 against live production deployment (commit 1f2bb63)_
_This is a documentation-only file. No fixes should be applied until every item is reviewed._

---

## HOMEPAGE (/)

### Product Cards — Structure

**BUG-01: WG·B·006 and WG·B·007 should not exist as separate cards.**
- Two separate cards exist for "Iced Lemon Loaf — Whole" and "Pumpkin Loaf — Whole."
- Sir's stated intent: one card per product. Loaf = one product sold in two formats (slice at $4, whole loaf at $20).
- The whole loaf SKUs (WG·B·006, WG·B·007) should be removed from the DB entirely.
- The slice cards (WG·B·004, WG·B·005) should communicate both formats in their specs and pricing.
- Fix requires: deactivating/deleting WG·B·006 and WG·B·007; updating WG·B·004 and WG·B·005 specs and price note to reflect both formats.

**BUG-02: WG·B·006 subtitle reads "whole frozen loaf" — word "frozen" was never agreed upon.**
- Sir explicitly called this out. The product is a whole loaf. The word "frozen" is fabricated AI copy.
- Applies equally to WG·B·007.

**BUG-03: WG·B·006 spec "Format: 9×5 loaf, frozen" — "frozen" again, fabricated.**
- Same issue. Remove.

**BUG-04: WG·B·006 spec "Sold as: Whole loaf only" — acceptable but redundant once card is removed.**

**BUG-05: "From the oven" shows count of 6 — inflated by the two phantom whole-loaf SKUs.**
- Once WG·B·006 and WG·B·007 are removed, the count correctly reflects active products.

### Product Cards — Content Accuracy

**BUG-06: WG·B·004 Iced Lemon Loaf — "Sold as: By the slice (see also: whole frozen loaf)"**
- Contains "frozen" — not agreed upon. Should read "By the slice or whole loaf" or similar.

**BUG-07: WG·B·005 Pumpkin Loaf — "Sold as: By the slice (see also: whole frozen loaf)"**
- Same issue.

**BUG-08: WG·B·004 and WG·B·005 do not show the whole-loaf price ($20) on the card.**
- If the whole loaf format is communicated on the slice card, the $20 price needs to appear somewhere on it. Currently only $4/slice is shown.

**BUG-09: WG·P·005 Spider Plant — SVG illustration not rendering (broken image).**
- The file `spider-plant.svg` exists in the repo and serves 200, but the image is not rendering on the card.
- Root cause not yet confirmed. May be an SVG content issue (the drawn paths may not be producing visible output at the rendered size).

**BUG-10: WG·P·006 Holiday Cactus — SVG illustration not rendering (broken image).**
- Same issue as BUG-09.

**BUG-11: Plant card tab line shows the first spec value, not a tier label.**
- WG·P·005 tab reads "BRIGHT INDIRECT; ADAPTS TO MODERATE LIGHT" — this is the Light spec value bleeding into the tab because plants have no tier label. This is a code-level display issue; the tab for plants should either be blank or show something meaningful like "Rooted in soil."

**BUG-12: WG·P·006 tab reads "BRIGHT INDIRECT; AVOID DI..." — same overflow issue, truncated.**

### Homepage — Other

**BUG-13: Order window stamp reads "ORDERS CLOSED / OPENING SOON" despite window being set to Scheduled closing tonight.**
- The `getEffectiveWindowState()` logic may be treating a future close time as "not yet open" rather than "open." Needs investigation — the window may need to be set to "Open" rather than "Scheduled."

**BUG-14: "From the oven" section counter reads 6 — should be 4 once whole-loaf phantom SKUs are removed.**

---

## ORDER PAGE (/order)

**BUG-15: Order page confirms "This window is closed right now."**
- Consistent with BUG-13 — if the window state logic is wrong, the order form is inaccessible.
- No products are shown in the order form as a result.

---

## KITCHEN RECORD PAGE (/kitchen-record)

**BUG-16: "How cross-contact is handled" section heading renders but the content block appears empty.**
- The heading shows but no text is visible under it in the screenshot. May be a placeholder or DB content missing.

**BUG-17: Ingredients count shows "13" — inflated by inactive/phantom products.**
- Kitchen record lists all products including inactive ones (brownie, snickerdoodle, whole-loaf SKUs). The count and listings should reflect only currently active, customer-facing products, or all products with full transparency — but 13 is confusing when the store only sells 4 active items today.

**BUG-18: WG·B·006 "Iced Lemon Loaf — Whole" listed on kitchen record.**
- If this SKU is removed from the product list (BUG-01), it must also disappear from kitchen record.

**BUG-19: Brownie and Snickerdoodle listed on kitchen record despite being inactive.**
- Kitchen record uses `includeInactive: true`. Whether inactive products should appear here is a product decision, not yet made. Flagging for clarity.

**BUG-20: Kitchen Record "Artificial Colour" states "We use only naturally derived food colorings like beet and carrot juice."**
- Wintergarten does not use food coloring at all. This is fabricated content from an earlier AI-generated pass. Sir stated the policy is no artificial colour — no coloring of any kind is used, natural or otherwise.

---

## CARE GUIDES PAGE (/care-guides)

**BUG-21: "Why Your Monstera Hasn't Split Yet" guide is listed.**
- Monstera is not in the current plant inventory and was removed earlier. This guide exists in the DB from the initial seed. It should either be removed or unpublished.

**BUG-22: Care guides list 8 entries — includes guides for products not sold.**
- Monstera guide (BUG-21) plus potentially others for plants no longer in inventory.

---

## STORY PAGE (/story)

No bugs observed on story page in this audit.

---

## SITEWIDE

**BUG-23: Email signup form destination unconfirmed.**
- The "One email a week" signup form POSTs to `/api/subscribe`. Not confirmed whether submissions reach the admin Email List section. No test has been run.

**BUG-24: Zoho Books env vars not confirmed populated in Vercel production.**
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` are listed in Vercel env vars but values unconfirmed. If empty, paid orders do not create Zoho invoices.

**BUG-25: ZAPIER_WEBHOOK_URL is an empty placeholder.**
- No Zaps built. Order fanout to Zapier silently no-ops on every paid order.

**BUG-26: debug-notify diagnostic endpoint (`/api/debug-notify`) is live in production.**
- Exposes whether Resend is configured. Should be removed once email is confirmed working.

**BUG-27: Empty commit on main branch bypassing branch protection.**
- Commit `1f2bb63` ("chore: trigger Vercel production redeploy") was pushed directly to main, bypassing the PR requirement. This is a workflow violation. The branch protection rule was not enforced — needs investigation and potentially tighter rule configuration.

**BUG-28: Vercel does not auto-deploy on PR merge to main.**
- PR #8 merged to main but Vercel did not pick it up automatically. Required manual trigger. Root cause unknown — possibly a Vercel GitHub integration issue that needs investigation.

---

## SUMMARY — ISSUE COUNT BY CATEGORY

| Category | Count |
|---|---|
| Product card structure (phantom SKUs, wrong format) | 5 |
| Product card content accuracy (fabricated words, wrong prices) | 5 |
| SVG illustrations not rendering | 2 |
| Plant card display bug (spec overflow in tab) | 2 |
| Order window / window state logic | 2 |
| Kitchen record content errors | 5 |
| Care guides stale content | 2 |
| Sitewide / infrastructure | 6 |
| **Total** | **29** |

---

## PRIORITY ORDER FOR FIXES

**P0 — Blocking orders today:**
- BUG-13 / BUG-15: Order window not showing as open — customers cannot order

**P1 — Visible errors on live public site:**
- BUG-01/02/03/04/05: Phantom whole-loaf SKUs (remove WG·B·006, WG·B·007)
- BUG-06/07: "frozen" in Sold As copy
- BUG-08: Whole-loaf price not shown on slice card
- BUG-09/10: SVG illustrations broken
- BUG-20: Fabricated food coloring statement on Kitchen Record
- BUG-16: Cross-contact section content missing

**P2 — Content cleanup:**
- BUG-11/12: Plant card tab overflow
- BUG-17/18/19: Kitchen record product count and inactive product visibility
- BUG-21/22: Monstera care guide should be unpublished

**P3 — Infrastructure / backend:**
- BUG-23: Email signup test
- BUG-24: Zoho env var confirmation
- BUG-25: Zapier wiring
- BUG-26: Remove debug endpoint
- BUG-27/28: Git workflow and Vercel auto-deploy
