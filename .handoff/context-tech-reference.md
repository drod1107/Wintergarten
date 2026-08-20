# Wintergarten — Technical Reference for Fable 5

## Key File Paths (repo root: C:\Users\david_9uweb6c\code\Wintergarten)

| Purpose | Path |
|---|---|
| Order API (POST) | `app/api/orders/route.ts` |
| Stripe webhook (POST) | `app/api/stripe/webhook/route.ts` |
| Stripe client init | `lib/stripe.ts` |
| Site URL + constants | `lib/site.ts` |
| Auth (admin login) | `lib/auth.ts` |
| Seed data (demo mode) | `lib/seed-data.ts` |
| Admin login page | `app/admin/page.tsx` |
| Admin dashboard | `app/admin/dashboard/page.tsx` |
| Vercel project IDs | `.vercel/project.json` |

## Order API Flow (app/api/orders/route.ts)
1. Parse body → validate name/email
2. If wholesale kind → createOrder → return redirect (no payment)
3. Check order window state → reject if closed
4. Build lineItems from cart (validate product IDs, capacity)
5. Geocode address → determine branch (pickup/shipping/waitlist)
6. createOrder() in DB
7. If chargeCents == 0 → return redirect (no payment)
8. If !isStripeConfigured() → return redirect with payment=skipped
9. Try stripe.checkout.sessions.create() → catch → log + return 502
10. setOrderStripeSession(orderId, session.id)
11. Return { checkoutUrl: session.url }

## Stripe Module (lib/stripe.ts)
```typescript
let stripeClient: Stripe | null = null;
let attempted = false;
export function getStripe(): Stripe | null {
  if (attempted) return stripeClient;  // singleton per cold start
  attempted = true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient = new Stripe(key, { apiVersion: '2024-11-20.acacia' });
  return stripeClient;
}
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
```
Note: client init never throws — errors come from session creation.

## Stripe Webhook (app/api/stripe/webhook/route.ts)
- Requires: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- Listens for: `checkout.session.completed`
- On paid: calls `markOrderPaid(session.id)` then `notifyZapier(buildOrderPayload(order))`
- Returns 400 if either env var is missing
- Returns 400 if signature verification fails
- notifyZapier() swallows its own errors (never causes non-2xx response)

## Site URL (lib/site.ts)
```typescript
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'production' ? 'https://derwintergarten.com' : 'http://localhost:3000');
```
For Preview testing: NEXT_PUBLIC_SITE_URL should be set to the preview URL so Stripe
success_url/cancel_url resolve correctly. Without it, Stripe will redirect to
derwintergarten.com (which won't have this build) — checkout will still work but
confirmation page will 404 or show wrong build. Set it to:
`https://wintergarten-nho3q40l9-windrose.vercel.app`

## Vercel Deployments (as of last session — 19 Aug 2026)
| Commit | Message | Status | Environment |
|---|---|---|---|
| dce1a09 | chore: trigger redeploy for env var update | Ready | Preview |
| e437852 | Fix kitchen-record prerender crash: merge DB content with seed | Ready | Preview |
| 0075bd8 | Fix checkout 500: wrap Stripe in try/catch... | Error | Preview |
| 59neDJ3PW | Cool background, bump tiny text, add logo... | Ready | **Production (active)** |

Active preview URL for testing: `https://wintergarten-nho3q40l9-windrose.vercel.app`
Active production URL: deploys to `derwintergarten.com` post-merge

## Stripe Account
- Account: Windrose and Company, LLC
- Account ID: acct_1RFLr8BRqBqf7C2Q
- Mode: TEST for PR testing (switch to LIVE after production merge)
- Test card: 4242 4242 4242 4242 / any future date / any CVC / any ZIP
- Dashboard: https://dashboard.stripe.com/acct_1RFLr8BRqBqf7C2Q/test/

## Admin Authentication
- Route: `/admin` (page.tsx in app/admin/)
- Method: POST form to `/api/admin/login` with password field
- Compares against `process.env.ADMIN_PASSWORD` using timing-safe comparison
- Session stored via cookie using `process.env.ADMIN_SESSION_SECRET`
- Both env vars confirmed set in Vercel (fixed prior session)

## PowerShell Notes (user's machine is Windows)
- Use `;` not `&&` for command chaining
- Push empty commit: `git commit --allow-empty -m "message"; git push`
- Check build status via GitHub API:
  `Invoke-RestMethod "https://api.github.com/repos/drod1107/wintergarten/commits/<sha>/statuses"`
