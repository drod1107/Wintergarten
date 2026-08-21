// Place marked end-to-end test orders against a deployment.
//
//   node scripts/place-e2e-orders.mjs <base-url> <path...> --confirm
//   node scripts/place-e2e-orders.mjs https://wintergarten-git-dev-windrose.vercel.app wholesale arrangement --confirm
//
// Paths: wholesale | arrangement | waitlist | card
//
// Every order carries the marker in scripts/e2e-marker.mjs, so
// scripts/clear-e2e-orders.mjs can remove it again afterwards. There is no way
// to place an unmarked order through this script.
//
// READ THIS BEFORE RUNNING. These are real orders against a real database, and
// they fan out for real:
//   * a real Zapier task fires, if a hook URL is configured
//   * a real Zoho contact is created, named by the marker, and for a billable
//     order a real invoice referenced WEB-<orderId>
//   * a real email lands in ORDER_NOTIFY_EMAIL — the owner's inbox. The
//     .invalid customer address does not prevent this; the notification is not
//     sent to the customer.
// Clean up with scripts/clear-e2e-orders.mjs, and remove the Zoho records by
// hand.
import { E2E_NAME, e2eEmail } from './e2e-marker.mjs';

const [, , baseUrl, ...rest] = process.argv;
const confirm = rest.includes('--confirm');
const paths = rest.filter((a) => !a.startsWith('--'));

if (!baseUrl || paths.length === 0) {
  console.error('usage: node scripts/place-e2e-orders.mjs <base-url> <wholesale|arrangement|waitlist|card...> --confirm');
  process.exit(1);
}
if (baseUrl.includes('derwintergarten.com')) {
  console.error('ABORT: refusing to place test orders against the production domain.');
  process.exit(1);
}

const bodies = {
  wholesale: () => ({
    kind: 'wholesale',
    name: E2E_NAME,
    email: e2eEmail('wholesale'),
    phone: '555-0100',
    address: '',
    wholesaleBusiness: 'E2E harness',
    wholesaleQty: 'n/a — automated test',
    notes: 'Automated end-to-end test of the wholesale notification path. Do not fulfil.',
  }),
  arrangement: () => ({
    kind: 'arrangement',
    name: E2E_NAME,
    email: e2eEmail('arrangement'),
    phone: '555-0101',
    address: '',
    arrangementItems: ['WG·O·001'],
    notes: 'Automated end-to-end test of the arrangement notification path. Do not fulfil.',
  }),
  // Needs the order window OPEN, and an item that does not ship, ordered from
  // outside the pickup radius, so branch flips to waitlist and chargeCents is 0.
  waitlist: () => ({
    kind: 'order',
    name: E2E_NAME,
    email: e2eEmail('waitlist'),
    phone: '555-0102',
    address: 'Anchorage, AK',
    manualBranch: 'shipping',
    pickupDay: '',
    items: [{ id: 'WG·O·001', qty: 1 }],
    notes: 'Automated end-to-end test of the waitlist notification path. Do not fulfil.',
  }),
  // Needs the order window OPEN. Stops at the Stripe Checkout redirect: this
  // script never completes a payment.
  card: () => ({
    kind: 'order',
    name: E2E_NAME,
    email: e2eEmail('card'),
    phone: '555-0103',
    address: '5312 Highway H, Sullivan, MO 63080',
    manualBranch: 'pickup',
    pickupDay: 'Saturday',
    items: [{ id: 'WG·B·001', qty: 1 }],
    notes: 'Automated end-to-end test of the card notification path. Do not fulfil.',
  }),
};

for (const p of paths) {
  if (!bodies[p]) {
    console.error(`unknown path: ${p}`);
    process.exit(1);
  }
}

if (!confirm) {
  for (const p of paths) {
    console.log(`--- ${p} ---`);
    console.log(JSON.stringify(bodies[p](), null, 2));
  }
  console.log('\nDry run. Nothing was sent. Re-run with --confirm to place these.');
  process.exit(0);
}

for (const p of paths) {
  const body = bodies[p]();
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`${p}: HTTP ${res.status} in ${Date.now() - started}ms`);
    console.log(`  ${text.slice(0, 400)}`);
  } catch (err) {
    console.error(`${p}: request failed — ${err.message}`);
  }
}
