# Operating rules for Claude sessions

**The planning documents are no longer in this repository.** It is public and
has no outside contributors, so as of 2026-08-21 every internal working
document was moved out of the repo and stripped from git history. They live on
the owner's machine at:

```
C:\Users\david_9uweb6c\code\wintergarten-local-docs\
```

Read `wintergarten-local-docs\MASTER-PLAN.md` first — it is the single source of
truth for active work and the bug queue. `HISTORY-LOG.md` in the same folder is
the append-only audit trail; read it before concluding anything is "wrong",
because several dead ends are already recorded there.

This file and `AGENTS.md` are the exception and stay tracked: they are operating
instructions for the agent, not documentation, and they must travel with the
code. Keep them free of credentials, personal data, and customer information —
this repository is public.

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

Before you open any PR, ask what the diff makes untrue, and check at minimum.
Everything except the first line is now in `wintergarten-local-docs\`, outside
the repo — being outside the repo does not exempt it from this rule:

- `CLAUDE.md` and `AGENTS.md` — operating rules and invariants; **in the repo**
- `MASTER-PLAN.md` — architecture, order fanout, bug queue, environment
- `HANDOVER.md` — anything the owner does himself, or receives
- `SETUP.md` / `DEPLOY.md` — env vars, third-party dashboard configuration
- `docs/` — the topic-specific guides

Because those files are no longer tracked, a docs edit cannot ride along in the
PR diff. Make the edit locally anyway, in the same working session, and say in
the PR body which local documents you changed.

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

## Zoho: Books vs CRM (settled — do not re-litigate)

Two Zoho products, two purposes. Sending something to the wrong one is a bug.

- **Zoho Books** — orders and invoices. `lib/zoho.ts` talks to
  `https://www.zohoapis.com/books/v3`, creates contacts and invoices, and is
  idempotent on `reference_number = WEB-<orderId>`. Leave that as it is.
- **Zoho CRM** — every inbound social contact. Facebook Page comments and posts,
  Messenger DMs, Instagram comments and DMs all create and update **CRM**
  records. Not Books. The CRM exists precisely so no inbound lead is missed.

That needs a second client with its own OAuth scope, alongside the Books one —
not an extension of `lib/zoho.ts`.

## Git workflow (absolute, permanent)

- **Nothing is coded directly in `dev`.** All work happens on a feature branch
  cut from `dev`, named `claude/…`.
- Never commit or push directly to `main` or `dev`.
- Feature branch → **PR into `dev`**. That PR is reviewed and merged within the
  working session — it does not go to David.
- **`dev` → `main` is the only thing that ever merges to `main`, and only David
  merges it.** Never you. Never anyone else. You may author that PR; you may
  not merge it.
- `main` is production. The custom domain `derwintergarten.com` points at it,
  and `main` is the repo's default branch.

### Before you touch a ref, check it is not stale

A force-push built from a stale local ref reverted `main` past ten merged PRs
and took the live order form back several releases. It happened because the
local `main` and `dev` branches were behind while only the remote-tracking refs
were current.

- Read the truth with `git ls-remote origin` immediately before any force
  operation. Do not trust `git rev-parse main` in a clone you have not just
  fetched into.
- Force-push with `--force-with-lease=<ref>:<sha read from ls-remote seconds
  ago>`, naming explicit SHAs rather than branch names.
- `git filter-repo` deletes the `origin` remote and its remote-tracking refs,
  so a later `--force-with-lease` has nothing to compare against and passes
  vacuously. It protects you from nothing after a rewrite.
- If there is any doubt about a clone, make a fresh one and work there.

## Escalate to David for exactly two things

Nothing else reaches him. Not decisions that are yours to make, not
confirmations, not progress updates, not menus of options. If you can do it, do
it. If you are choosing between two reasonable implementations, pick the one the
existing conventions imply and say so in the PR body.

1. **A `dev` → `main` merge.** Author the PR, hand it over, stop.
2. **A security matter where reading the value into a transcript would itself
   be the risk** — a secret that has to move by his hands, or a login.

For either, follow his standing rule: do not bury it. Open the relevant page so
it is on screen and ready, state the blocker in one sentence, name the one
action he needs to take, then wait.

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

**Preview is isolated from production as of 2026-08-21.** `DATABASE_URL` and the
three `STRIPE_*` variables each exist twice in Vercel — once scoped Production
only, once scoped Preview with no branch filter — so every preview on every
branch reads a separate test database and issues `cs_test_` Stripe sessions.
Verified by a preview and production disagreeing about the order-window state.

A **local** script still hits production, because `.env.local` holds the
production connection string. `scripts/clear-e2e-orders.mjs` reads it, so it
will report "nothing matches the marker" while your preview test rows sit
untouched in the preview database.

Notification credentials (`RESEND_API_KEY`, `ORDER_NOTIFY_EMAIL`, `ZOHO_*`,
`ZAPIER_WEBHOOK_URL`) are **not** scoped. A test order on a preview sends a real
email to the owner's real inbox and creates a real Zoho record.

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
