# Wintergarten

A gluten-free, mammal-free bakery and houseplant nursery in Sullivan,
Missouri — built from `wintergartenwebsitebuildbrief.md` and the approved
herbarium-sheet mockup.

- **Run locally:** `npm install && npm run dev`
- **Configure a real backend (database, Stripe, admin login):** see
  [`SETUP.md`](./SETUP.md)
- **Owner's day-to-day tasks (open/close ordering, change a price, etc.):**
  see [`HANDOVER.md`](./HANDOVER.md)

## Stack, and why

| Choice | Reasoning |
|---|---|
| Next.js 16 (App Router), TypeScript | One deploy target for pages, API routes, and structured-data metadata; strong SEO defaults (static generation for the care guides, which are the site's only durable organic-traffic asset per the brief) |
| Plain CSS, no framework | The design language is bespoke and specific (paper texture, asymmetric sheets, four type roles) — a utility framework would fight it, not help it. Fonts are self-hosted via `next/font` so nothing round-trips to Google at runtime |
| Postgres via `pg`, no ORM | Small, well-understood schema (`lib/schema.sql`); a query builder or ORM would add a build-time dependency (Prisma's engine download, for instance) for little benefit at this scale |
| Stripe Checkout (hosted), not custom Elements | Fewer moving parts, PCI scope stays with Stripe, and it generalizes to a larger single-ticket charge (e.g. a future $75 dinner deposit) with zero code changes — it's just another line item |
| Free, keyless geocoding (Census + Nominatim) | No API key, no billing account, no owner setup step. Trade-off: occasionally less forgiving of typos than Google Places — mitigated by a manual pickup/shipping fallback that keeps the "never a dead end" requirement intact even when geocoding fails outright |

## What's real vs. placeholder

Per the brief's instruction not to invent medical, legal, or biographical
content: the kitchen record's cross-contact protocol, per-item ingredient
lists, and the story page are structurally complete but intentionally
empty, marked with a visible dashed-border "awaiting content from owner"
flag rather than any invented text. Product names, prices and descriptions
follow the mockup's demonstration copy as a starting point (also flagged as
editable in `/admin`) — replace before real launch. The seven care guides
contain genuine, factual, general horticultural information (not
business-specific claims), each marked "DRAFT — voice not yet reviewed by
the owner" so nobody mistakes it for the owner's own words.

## One deliberate deviation from the mockup's exact palette

The mockup's copper accent (`#8C4A2F`) measures below the WCAG AA 4.5:1
text-contrast threshold against both paper tones at the small sizes it's
used at (spec labels, stamps) — verified with an automated contrast audit,
per the brief's own instruction not to assume. Darkened to `#7A3F28`, which
clears AA on both paper tones while staying recognizably "oxidised copper."
Every other token is unchanged.

## Passing an automated accessibility audit

`axe-core` via Playwright, run across every page including the
authenticated admin dashboard: 0 violations at WCAG 2.1/2.2 AA. All
interactive controls are native HTML elements (real `<button>`, `<input>`,
`<textarea>`, `<details>`) rather than custom widgets, which is what makes
full keyboard operability fall out for free rather than needing bespoke
`tabindex`/ARIA management.
