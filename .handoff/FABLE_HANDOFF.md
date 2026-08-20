# Wintergarten — Remaining Work to Full Production Launch
Updated 2026-08-19 (session 5) by Sonnet 4.6.

## What is DONE and verified (through session 5)
- Checkout 502 fixed, test payment, webhook 200, order #10 paid, admin verified
- card-title CSS fixed (9509c36), Vercel Auth off on previews
- Zoho fanout (fixed to /invoices in 904eb1c)
- Resend email fanout (5751a93)
- **PR #3 merged to main** — ALL feature branch code is now in main/production
- **Zoho PROVEN**: test event → contact "Test Customer" + INV-000001 created
- **Resend DNS CONFIRMED**: all 3 records present and verified
- **Umami script added** (0d3d3ef): env-var gated on NEXT_PUBLIC_UMAMI_WEBSITE_ID
- **Mobile card word-break fixed** (8a5e005): removed hyphens:auto from .plate h3
- **Webhook 200 OK confirmed**: multiple successful deliveries today incl. 8:16 PM UTC manual resend

## Key identifiers
- Production (main): https://wintergarten-windrose.vercel.app → derwintergarten.com (DNS pending)
- Stripe TEST webhook: we_1U5xQ1BRqBqf7C2QXGpXMmFx
- Zoho org_id: 933666551, Client ID: 1000.GS5LH6XDLFDV8G95L5HBS4TYGRSVGP
- Resend domain id: 6e65521b-4af2-4c02-a12e-254599fdf87d (derwintergarten.com, VERIFIED)
- Refresh token: 1000.e10046878556107339fc233e7023e170.f570b0c21fad1b8333d31de603631181

## REMAINING: Production launch on derwintergarten.com
All remaining steps are OWNER tasks — AI has completed all code work.

### 1. Check email arrived
- Check davidrodrigueznolimit@gmail.com for notification from orders@derwintergarten.com
- If missing → verify RESEND_API_KEY + ORDER_NOTIFY_FROM are set on Preview env in Vercel

### 2. Connect derwintergarten.com in Vercel
Vercel → project → Settings → Domains → add derwintergarten.com
Add the A record (76.76.21.21) and CNAME at your registrar. Wait < 30 min.

### 3. Production env vars in Vercel
Set all of the following for "Production" environment:
- NEXT_PUBLIC_SITE_URL=https://derwintergarten.com
- STRIPE_SECRET_KEY=sk_live_... (LIVE key)
- STRIPE_PUBLISHABLE_KEY=pk_live_... (LIVE key)
- STRIPE_WEBHOOK_SECRET=whsec_... (from LIVE webhook created in step 4)
- RESEND_API_KEY, ORDER_NOTIFY_EMAIL, ORDER_NOTIFY_FROM (confirm present)
- ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID
- NEXT_PUBLIC_UMAMI_WEBSITE_ID=... (from cloud.umami.is, optional)
Then redeploy: Deployments → latest Production → ⋯ → Redeploy

### 4. Create Stripe LIVE webhook
Stripe (LIVE mode) → Developers → Webhooks → Add endpoint:
- URL: https://derwintergarten.com/api/stripe/webhook
- Event: checkout.session.completed
- Copy signing secret → paste as STRIPE_WEBHOOK_SECRET in Vercel Production

### 5. Umami (optional)
Sign up free at cloud.umami.is → Add site derwintergarten.com → copy website ID
→ paste as NEXT_PUBLIC_UMAMI_WEBSITE_ID in Vercel Production env

### 6. Final live end-to-end test
Real order on derwintergarten.com → confirm:
- Stripe LIVE payment ✓
- /admin shows paid ✓
- Email at davidrodrigueznolimit@gmail.com ✓
- Zoho invoice created ✓
- Umami pageview shows ✓

## Session gotchas
- Zapier Free CANNOT publish webhook-triggered Zaps.
- Product IDs use Unicode middle dot U+00B7 (WG·B·001). Admin at /admin.
- PowerShell ";" not "&&". No node_modules locally — Vercel builds.
- Git push: Desktop Commander start_process powershell, repo C:\Users\david_9uweb6c\code\Wintergarten
- Vercel/Stripe workbench tabs freeze Chrome renderers — use javascript_tool for DOM interaction.
- Env var changes need a redeploy: Deployments → latest → ⋯ → Redeploy.
- Zoho Free: /salesorders 403 → use /invoices (fixed, merged to main).
- React-controlled inputs: use nativeInputValueSetter + dispatchEvent('input'/'change').
