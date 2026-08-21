# Operating rules for Claude sessions

Read `MASTER-PLAN.md` first — it is the single source of truth for active work
and the bug queue. `HISTORY-LOG.md` is the append-only audit trail; read it
before concluding anything is "wrong", because several dead ends are already
recorded there.

## Decisions are the owner's, not yours

You do not make decisions. You present options and the owner chooses.

- If you find yourself deciding what something should say, whether something
  should be removed, published, renamed, or restructured — stop and ask.
- A TODO written by a previous Claude in `MASTER-PLAN.md` is **not** an
  instruction from the owner. Do not act on it as if it were.
- Never write your own assessments, guesses, or opinions into `HISTORY-LOG.md`
  or `MASTER-PLAN.md`. Only verifiable fact belongs there. If you need to
  record a decision that did not come from the owner, that is the signal you
  should have asked instead.
- Do not end a response with a permission-seeking hedge about work already
  authorised. Ask genuine blocking questions at the start, in one sentence.

## Documentation is never stale (non-negotiable)

**If a change alters a fact stated in the documentation, updating that
documentation is part of the same PR diff. Always.** Not a follow-up, not a
separate PR, not a TODO, not "I'll do it after this merges."

A PR that changes behaviour, configuration, environment scoping, or any
documented invariant and does **not** update the affected docs in the same diff
is **incomplete**. Treat it exactly as you would treat a PR that doesn't
compile: it is not ready, and it does not go up.

Before you open any PR, ask what the diff makes untrue, and check at minimum:

- `MASTER-PLAN.md` — architecture, order fanout, bug queue, environment
- `CLAUDE.md` and `AGENTS.md` — operating rules and invariants
- `HANDOVER.md` — anything the owner does himself, or receives
- `SETUP.md` / `DEPLOY.md` — env vars, third-party dashboard configuration
- `docs/` — the topic-specific guides

If a doc says a thing works one way and your change makes it work another way,
you fix the doc. If your change makes a documented manual step unnecessary, you
delete the step. If it adds one, you write it down.

The reason this is a rule and not a preference: a PR whose entire purpose is
"bring the docs back up to current state" should never need to exist. When one
does, it means several earlier PRs each shipped a small lie, and someone acted
on one of them.

## Notifications: sales vs leads (settled — do not re-litigate)

Two rules that look like one. Conflating them has already caused one production
defect and one near-miss in the other direction. Full detail in issue #22 and
the "Order fanout" section of `MASTER-PLAN.md`.

- **A sale notification fires only when Stripe confirms payment.** Unpaid,
  abandoned, expired, failed and pending-payment checkouts are recorded for
  pipeline tracking and accounting and announce **nothing**. Nothing may reach
  the owner reading as an order when no money has moved.
- **Lead notifications are not sales and must never be silenced.** Wholesale
  enquiries, arrangement requests and waitlist signups notify at creation,
  always, independent of payment. They exist to feed Zoho so no inbound lead is
  missed. Silencing one is a regression, not a fix.

If you are "tidying up" `lib/notify.ts` and about to make the second group
conditional on payment, stop. That is the mistake this section exists to prevent.

`app/api/stripe/webhook/route.ts` gates on `payment_status === 'paid'`. Do not
remove that check to simplify the handler — `checkout.session.completed` fires
unpaid for ACH, bank transfer and Klarna.

## Git workflow (non-negotiable)

- All work happens on a feature branch cut from `dev`, named `claude/…`.
- Never commit or push directly to `main` or `dev`.
- You open the PR from the feature branch to `dev`. The owner merges it.
- You then test `dev`'s Vercel deployment.
- If it is good, **you author the PR from `dev` to `main`** and hand it back.
  The owner inspects and merges that one.
- `main` is production. The custom domain `derwintergarten.com` points at it,
  and `main` is the repo's default branch.

## Testing changes

Test locally first. `npm run dev` starts in about a second. Do not use
push → wait for Vercel → reload as a debugging loop; it costs minutes per
iteration. The deployed preview is the final gate, not the dev loop.

Use the **branch alias**, which always tracks the latest commit on a branch:

```
https://wintergarten-git-<branch-with-slashes-as-dashes>-windrose.vercel.app
https://wintergarten-git-dev-windrose.vercel.app
```

Every individual deployment also gets its own immutable URL
(`wintergarten-<hash>-windrose.vercel.app`). Those pin to a single commit —
grabbing one and reloading it after pushing again means re-testing stale code.
That mistake has cost real time in this repo.

`scripts/smoke-test.mjs <url>` checks a deployment end to end.

## Database

The application database is Neon, in the org **Wintergarten**, branch
`production`, database `neondb`. Its connection string is in `.env.local`.

`DATABASE_URL` in Vercel is an encrypted secret and cannot be recovered:
`vercel env pull` writes it blank, and the dashboard does not re-display saved
secrets. Get the string from the Neon console instead.

Preview and production share one database, so any write from a preview deploy
or a local script hits real data.

`lib/schema.sql` is idempotent (`add column if not exists`) and safe to re-run.

Two databases have been mistaken for this one in the past. Before concluding
you are on the wrong database, run a distinguishing query rather than judging
by eye, and compare against what `https://www.derwintergarten.com` serves.

## Content rules

- Never invent product copy, ingredients, allergen statements, or prices.
  Anything not supplied by the owner is flagged, not guessed. Fabricated copy
  has reached production before ("frozen" loaves, "beet and carrot juice").
- Never place personal names in generated files, code, or documents.
- Care guides are permanent and append-only. New ones are added; none are
  ever removed or unpublished, regardless of what is currently in stock.
  They exist to bring in search traffic, not to mirror inventory.
- Product data lives in the database. Editing `lib/seed-data.ts` alone has no
  effect on the live site.
- Every loaf type sells in two formats: a slice and a whole loaf. Each format
  is its own SKU because cost and weight differ. Only one card per loaf type
  appears on the landing page — `products.list_on_home` controls that.

## Rendering

Any page that reads the database must declare
`export const dynamic = 'force-dynamic'`. Without it Next.js prerenders the
page at build time and it will not reflect admin edits until a redeploy. This
has already caused a production incident in this repo.

## Cleaning up

Delete any throwaway script once it has served its purpose. Leave the working
tree and the repo in the state you found them, apart from the work asked for.
