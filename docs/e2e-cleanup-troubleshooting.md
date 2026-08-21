# Troubleshooting

Read this when a run exits non-zero. Every message the script emits is listed
here with what actually causes it, because the useful thing is knowing which
failures are the script protecting you and which are a real problem.

## Contents

- [ABORT — the script refused before touching anything](#abort)
- [CLEANUP_FAILED — something broke partway](#cleanup_failed)
- [It ran fine but found nothing, and you expected matches](#found-nothing)
- [Zoho API reference](#zoho-api-reference)
- [Known gaps](#known-gaps)

---

## ABORT

Nothing was deleted. The script stopped before or instead of acting.

**`cannot find <repo>/scripts/e2e-marker.mjs`**
You are not in the repo root. Run from the repo root, or pass `--repo=<path>`.
The script imports the marker constants from the repo deliberately rather than
carrying its own copy, so it cannot run without that file — a marker defined in
two places drifts, and a drifted marker matches nothing while looking healthy.

**`scripts/e2e-marker.mjs does not export <name>`**
The marker file changed shape. The script needs `E2E_EMAIL_DOMAIN`, `E2E_NAME`
and `isE2eRow`. If the exports were renamed, update the check rather than
reintroducing a local copy of the constants.

**`missing Zoho credentials in environment or .env.local: ...`**
Names only are printed, never values. Either `.env.local` is absent, or those
keys are. The parser takes everything after the first `=`, trims it, and strips
one layer of surrounding quotes — same as `clear-e2e-orders.mjs`. A value
containing `=` is fine; a value spanning multiple lines is not.

**`could not reach Zoho accounts endpoint` / `Zoho token refresh rejected with HTTP 401`**
The Self Client refresh token is dead or the client credentials are wrong. Zoho
refresh tokens do not expire on a timer but are revoked when the Self Client is
regenerated, when the scope changes, or after long disuse. Regenerate with scope
`ZohoBooks.fullaccess.all` and update `.env.local`. The body of a token response
is never printed, because that is exactly where a credential would be — so the
status code is all you get here by design.

**`N Zoho contacts matched the E2E marker, over the sanity limit of 50`**
This is the guard doing its job. Either a test loop ran away, or the marker is
matching something it should not, or `ZOHO_ORG_ID` points at the wrong
organisation. Nothing was deleted. Confirm what those records actually are
before raising the limit — and if they are genuinely all test data, delete a
batch through the Zoho UI rather than editing the limit, so the guard stays
meaningful.

**`marker checks disagree for Zoho contact <id>`**
The repo's `isE2eRow()` and the script's independent equality check reached
different conclusions about the same record. In practice this means an address
with more than one `@` — `a@wintergarten-e2e.invalid@elsewhere.example` reads as
a match to `split('@')[1]` and as a non-match to a whole-remainder read. That is
the shape of a deliberately crafted address, so the run stops. Inspect the
contact by hand; do not loosen the check.

**`contacts listing exceeded 50 pages`**
Over 10,000 contacts in the organisation. The script refuses to continue on a
partial view rather than risk reporting a false "nothing to clean". Raise
`MAX_CONTACT_PAGES` if the account has legitimately grown that far.

---

## CLEANUP_FAILED

Some deletions may have succeeded before this. Re-running is safe and is usually
the right next step — whatever remains still carries the marker.

**`Zoho /invoices/<id>: Invoice has payments applied and cannot be deleted.`**
Zoho will not delete an invoice with a payment recorded against it, and will not
delete a contact that still has transactions — so the contact is reported as
left in place too. Remove the payment in the Zoho UI, then re-run. A test
invoice with a payment on it means something recorded a payment against test
data, which is worth understanding before deleting.

**`Only draft or void invoices can be deleted.`**
You should not normally see this: the script voids a sent invoice and retries
the delete automatically. Seeing it means the void was refused as well, which
in practice means a payment or a locked accounting period. Check the invoice in
the Zoho UI.

**`Contact has transactions and cannot be deleted.`**
Something is attached to the contact that the script does not enumerate —
estimates, credit notes, sales orders, recurring invoices. The script deliberately
cleans invoices only, since that is what the checkout creates. Delete the extra
records in the Zoho UI and re-run.

**`Preview database : FAILED — clear-e2e-orders.mjs exited N`**
The failure is in that script, not this one. Its own output is echoed above the
summary, prefixed `[db]`. Zoho cleanup still runs regardless, so the two
platforms do not block each other.

---

## Found nothing

`Zoho Books: nothing to clean` with an exit code of 0 is a success. Check the
scanned count on the line above it first:

```
Zoho Books: scanned 47 contact(s); 0 matched the E2E marker.
```

A healthy non-zero scanned count means the credentials, token refresh and
contact listing all worked and the account really is clean. A scanned count of
`0` against a live organisation is not a clean account — it is a wrong
organisation id, and the script raises a `WARN` saying so.

If the scan is healthy but you believe test records exist:

1. Confirm the marker in the running site matches the marker in the repo. A test
   order created before `scripts/e2e-marker.mjs` last changed carries the old
   marker and will not match. Those need deleting by hand.
2. Confirm the organisation. `ZOHO_ORG_ID` overrides the default `933666561`.
3. Check the name field character by character. The em dash in `E2E_NAME` is
   U+2014. If the order form or a fixture typed a hyphen-minus, the record was
   written with a hyphen and no longer matches the constant.
4. Verify independently with a read-only Zoho MCP call or the Zoho UI — searching
   contacts for the email domain will show whether anything is genuinely there.

---

## Zoho API reference

US datacentre. Accounts `https://accounts.zoho.com`, API
`https://www.zohoapis.com/books/v3`. Every call appends
`organization_id=<org>` and sends `Authorization: Zoho-oauthtoken <token>`, with
an 8 second timeout — matching `lib/zoho.ts`.

| Purpose | Call |
| --- | --- |
| Refresh token | `POST /oauth/v2/token` — form-encoded `refresh_token`, `client_id`, `client_secret`, `grant_type=refresh_token` |
| List contacts | `GET /contacts?per_page=200&page=N` |
| Invoices for a contact | `GET /invoices?customer_id=<id>&per_page=200&page=N` |
| Void an invoice | `POST /invoices/<id>/status/void` |
| Delete an invoice | `DELETE /invoices/<id>` |
| Delete a contact | `DELETE /contacts/<id>` |

Order matters: invoices before the contact, because Zoho refuses to delete a
contact with transactions attached.

Invoices raised by the site carry `reference_number` of the form `WEB-<orderId>`.
The script does **not** use that prefix to decide what to delete — a prefix match
is the fuzzy comparison the marker rule forbids. The safety boundary is the
contact: an invoice is only in scope because the contact it belongs to already
matched both markers. Anything on such a contact with an unexpected reference is
still deleted, but is printed as a `WARN` line, because it means something other
than the checkout wrote there and that is worth seeing.

---

## Known gaps

**Zoho deletion is not transactional.** The database script wraps its work in a
single transaction and rolls back on error. There is no equivalent across HTTP
calls, so a run that dies halfway leaves some records deleted and some not. This
is why the script is ordered invoices-then-contact and why idempotency is
enforced: what survives still carries the marker, so the next run completes the
job.

**Test endpoint override.** Setting `E2E_CLEANUP_TEST_ENDPOINTS=1` allows
`ZOHO_ACCOUNTS_BASE` and `ZOHO_API_BASE` to redirect the script at a mock server,
which is how the deletion path is exercised without touching a real account.
Without that flag the overrides are ignored entirely, so a stray environment
variable cannot silently redirect a real run. When the flag is on, the script
prints a `WARN` saying so.
