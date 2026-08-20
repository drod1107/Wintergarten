# Operating rules for Claude sessions

Read `MASTER-PLAN.md` first — it is the single source of truth for active
work and the bug queue. `HISTORY-LOG.md` is the append-only audit trail of
past decisions and false starts; read it before concluding anything is
"wrong", because several dead ends are already documented there.

## Git workflow (non-negotiable)

- Feature branches only: `claude/feature-name`
- PR to `dev`. **Never** commit or push directly to `main` or `dev`.
- The owner merges `dev` → `main`.
- Vercel builds every branch push automatically. No PR or merge is needed to
  get a preview deployment.

## Testing changes

Test locally first — `npm run dev` is a sub-second loop. Do not use the
push → wait-for-Vercel → reload cycle for debugging; it costs minutes per
iteration. The Vercel preview is the final gate before opening a PR, not
the development loop.

When you do check a preview, use the **branch alias**:

```
https://wintergarten-git-claude-<branch-name>-windrose.vercel.app
```

Each individual deployment also gets its own immutable URL
(`wintergarten-<hash>-windrose.vercel.app`). Those pin to one commit — if
you grab one and keep reloading it after pushing again, you are re-testing
stale code. This has caused wasted cycles before.

## Database

`DATABASE_URL` is set in Vercel for Production and Preview as an encrypted
variable. It **cannot** be read back:

- `vercel env pull` returns it blank.
- The Vercel dashboard does not re-display secret values once saved.

Preview and production share the same database, so any write from a preview
deploy or a local script hits real data. Migrations in `lib/schema.sql` are
idempotent (`add column if not exists`) and safe to re-run.

Before assuming you are connected to the wrong database, verify with a
distinguishing query rather than by eye. Compare against what
`https://www.derwintergarten.com` actually serves.

Neon supports branching, and a project can hold several branches with
different endpoints and different data. A connection string that points at
the right *project* may still point at the wrong *branch*.

## Content rules

- Never invent product copy, ingredients, allergen statements, or prices.
  Anything not supplied by the owner is flagged, not guessed.
- Never place personal names in generated files, code, or documents.
- Prices and ingredients live in the database. Editing `lib/seed-data.ts`
  alone has no effect on the live site.
