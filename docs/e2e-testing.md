# End-to-end testing against the shared database

Preview and production share one Neon database. Every test order placed against
any deployment is a real row in the real orders table. The convention below
exists so those rows can always be told apart from real ones, and removed.

## The marker

Every record created by a test carries **both** of these
(`scripts/e2e-marker.mjs` is the single source of truth):

| Field | Value |
|---|---|
| `email` domain | `wintergarten-e2e.invalid` |
| `name` | `E2E TEST — do not fulfil` |

`.invalid` is reserved by RFC 2606. It can never be registered and never
resolves, so no genuine customer can legitimately submit an address in it. The
order form's own validator accepts it, so nothing in the application needs a
special case.

**Nothing is deleted unless both match.** A typo in one field deletes nothing
rather than something real.

### What the marker does not do

It does **not** stop the owner being emailed. The order notification goes to
`ORDER_NOTIFY_EMAIL` — the owner's inbox — not to the customer's address. The
`.invalid` domain only guarantees the *customer* is never mailed. Every test
order that gets as far as a working Resend configuration puts a real message in
the owner's inbox. That is deliberate: it is the only way the email fanout is
exercised at all.

## Placing test orders

```
node scripts/place-e2e-orders.mjs <base-url> <paths...> --confirm
```

Paths: `wholesale`, `arrangement`, `waitlist`, `card`. Without `--confirm` it
prints the request bodies and sends nothing. It refuses to run against
`derwintergarten.com`.

**These fan out for real.** A real Zapier task fires, a real Zoho contact — and
for a billable order a real invoice, referenced `WEB-<orderId>` — is created,
and a real email is sent. Zoho records must be removed by hand; nothing in this
repo touches the Zoho API destructively.

### Which paths are reachable when

`wholesale` and `arrangement` bypass the order window by design and can be run
at any time. `waitlist` and `card` go through the regular pre-order branch,
which returns 400 unless the order window is **open** — so they cannot be tested
while ordering is closed. Opening the window to test also opens it to real
customers, since preview and production share the database.

The Stripe-not-configured path and the failed-session-creation path cannot be
reached on a deployment where Stripe is configured and working. Testing them
means deliberately breaking the Stripe environment variables, which is not worth
doing on a shared environment.

## Cleaning up

```
node scripts/clear-e2e-orders.mjs             # dry run: lists, deletes nothing
node scripts/clear-e2e-orders.mjs --confirm   # deletes what the dry run listed
```

It reads `DATABASE_URL` in-process from `.env.local` and never prints it. It
compares the email domain with `split_part(email,'@',2) = $1` — an exact
equality, not a `LIKE`, so there is no pattern that can widen — and the name
with `=`. It prints every row before touching anything, aborts if more than 50
rows match, and runs all writes in one transaction.

It also hands back the batch capacity the orders reserved. `createOrder`
increments `products.ordered_count`, and deleting the order row does not undo
that; left alone the count drifts upward until a real product reads as sold out.
Only `kind='order'` rows reserved anything — wholesale orders carry no items and
arrangements are created with `reserveCapacity: false`.

## What testing cannot prove

A test order proves the fanout *ran* and what each channel *reported*. It cannot
prove the owner received anything. Check `[notify]` lines in the Vercel runtime
logs for the actual per-channel outcome, and `orders.notified_at` for whether
the claim was kept:

* `notified_at` set → at least one channel delivered.
* `notified_at` null after a fanout → nothing was delivered and the claim was
  released, so the order can be notified again.
