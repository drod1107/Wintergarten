---
name: wintergarten-e2e-cleanup
description: Removes Wintergarten Bakehouse E2E test data from the preview database and Zoho Books in one command, by running a bundled script rather than reasoning through deletions call by call. Use this whenever a testing session on the Wintergarten site wraps up, or when the user mentions test orders, E2E orders, junk Zoho Books contacts or invoices, cleaning up after testing, the wintergarten-e2e.invalid marker, or asks what test data is still lying around. Also use it when asked whether Zapier task history or Resend emails can be cleaned up — the honest answer is documented here. Prefer this over deleting records by hand through Zoho MCP tools or ad-hoc API calls, even when those tools are available and look quicker.
---

# Wintergarten E2E cleanup

A test order on the Wintergarten site fans out to more places than the database.
It writes a real contact and a real invoice into Zoho Books, fires a Zapier
webhook, and sends a real email through Resend. Isolating the preview database
solves exactly one of those. The rest accumulates as junk in the books.

This skill exists so that clearing it costs one command, not a conversation.

## Run it

From the repo root:

```bash
node scripts/clear-e2e-external.mjs             # dry run — lists what would go
node scripts/clear-e2e-external.mjs --confirm   # deletes
```

Dry run is the default and it is not a formality: read the list before passing
`--confirm`. The output is designed to be scanned in one glance, so if a line in
it surprises you, stop rather than confirming.

Useful variants:

| Flag | Effect |
| --- | --- |
| `--only=zoho` | Zoho Books only, skip the database |
| `--only=db` | database only, skip Zoho |
| `--repo=<path>` | repo root, if you are not running from it |
| `--help` | usage |

Exit code is 0 on success and non-zero on any failure, so it drops into a shell
chain or a CI step without wrapping.

## What it cleans, and what it cannot

Be straight with the user about the second column. A cleanup tool that quietly
skips a platform is worse than one that names what it left behind, because the
user stops checking.

| Platform | Status |
| --- | --- |
| Preview database | **Cleaned.** Delegated to `scripts/clear-e2e-orders.mjs`, which already does this well — this script runs it rather than reimplementing it. |
| Zoho Books | **Cleaned.** Marker-matching contacts and every invoice attached to them. |
| Zapier | **Not cleanable.** Zapier exposes no API for deleting Zap run history — it is viewable and manually deletable in the web UI only. Test runs stay in history until they age out, which Zapier caps at roughly 60 days. |
| Resend | **Not cleanable.** Sent email cannot be unsent. Test emails go to `@wintergarten-e2e.invalid`, a reserved TLD that cannot resolve, so they bounce rather than reach anyone — but the send is logged in Resend and stays logged. |

The script prints both of those as explicit `NOT CLEANABLE` lines in its summary
every run. Leave that in. The point is that the user never has to remember which
platforms the tool silently ignores.

## The safety model — do not route around it

Test records carry **two** markers, and nothing is deleted unless **both** match
by exact equality:

- email domain is exactly `wintergarten-e2e.invalid` (reserved under RFC 2606, so
  no real customer can legitimately have one)
- name is exactly the `E2E_NAME` constant

Both come from `scripts/e2e-marker.mjs` in the repo. The script imports them; it
never retypes them. That matters more than it looks: `E2E_NAME` contains an em
dash (U+2014), and a hand-copied hyphen would match nothing while appearing to
work perfectly — a cleanup tool that silently finds zero records is the failure
mode nobody notices.

There is no `LIKE`, wildcard, prefix or fuzzy comparison anywhere in the
matching path. A typo in either field deletes nothing rather than something real.
Every candidate is checked twice, once through the repo's own `isE2eRow()` and
once through an independently written equality check; if the two ever disagree
the run aborts instead of guessing.

Two more guards: a sanity limit of 50 contacts and 500 invoices, above which the
run aborts rather than bulk-deleting, and a full-account scan instead of Zoho's
server-side `*_contains` search — because a substring filter is precisely the
fuzzy matching the marker rule forbids, and a server-side filter that silently
returns nothing would report a clean account that was not clean.

**A Zoho MCP connector may be available in the session. Do not use it to delete
these records.** Deleting contacts one at a time through tool calls is the cost
this skill exists to remove, and it bypasses every guard above. Read-only MCP
calls to independently verify the account afterwards are fine and welcome.

## Reading the result

The summary block is the deliverable:

```
── Summary ─────────────────────────────────────────────────
Preview database : cleaned (3 test order line(s) reported)
Zoho Books       : 2 contact(s), 2 invoice(s) deleted
Zapier           : NOT CLEANABLE — no delete API for Zap history; test runs stay until they age out
Resend           : NOT CLEANABLE — sent email cannot be unsent
────────────────────────────────────────────────────────────
```

A clean account reports `Zoho Books : nothing to clean` and exits 0 — that is
success, not an error. Running twice is safe; the second run should report
nothing to do.

Above the summary, every run prints how many contacts it scanned:

```
Zoho Books: scanned 47 contact(s); 0 matched the E2E marker.
```

Read that line before believing a zero. "0 matched" is only evidence of a clean
account next to the number it was matched against — a scan that silently
returned nothing looks identical otherwise, and that is the failure nobody
notices. A scanned count of 0 against a live organisation triggers a `WARN` and
means the organisation id is wrong, not that the books are clean.

Failures are prefixed `ABORT:` (a safety refusal before anything was touched) or
`CLEANUP_FAILED:` (something broke partway). Both exit non-zero. When a run fails
partway, whatever is left behind still carries the marker, so the next run
finishes the job — Zoho has no transactions across HTTP calls, which is why
idempotency carries the weight that atomicity carries in the database script.

For what to do about a specific failure, read `references/troubleshooting.md`.

## Installing it

The script is written to run from the repo root and reads
`scripts/e2e-marker.mjs`, `scripts/clear-e2e-orders.mjs` and `.env.local`
relative to it. Copy it into the repo:

```bash
cp scripts/clear-e2e-external.mjs <repo>/scripts/
```

Optionally add to `package.json` so it is one word to run:

```json
"scripts": { "clean:e2e": "node scripts/clear-e2e-external.mjs" }
```

Then `npm run clean:e2e` for the dry run and `npm run clean:e2e -- --confirm` to
delete.

It needs no dependencies beyond Node — the repo has no `dotenv`, so it parses
`.env.local` by hand exactly as `clear-e2e-orders.mjs` does. It reads
`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` and optionally
`ZOHO_ORG_ID` (defaulting to `933666561`), keeps them in process, and passes
every printed line through a redaction pass so a credential cannot reach the
terminal even inside an error message from Zoho.
