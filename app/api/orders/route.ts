import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, branchForPoint } from '@/lib/geo';
import {
  createOrder,
  getEffectiveWindowState,
  getProducts,
  isOrderable,
  setOrderStripeSession,
} from '@/lib/store';
import { notifyNewOrder } from '@/lib/notify';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { SITE_URL } from '@/lib/site';
import type { OrderBranch, OrderItem } from '@/lib/types';

type CartLine = { id: string; qty: number };

type OrderRequestBody = {
  kind: 'order' | 'wholesale' | 'arrangement';
  name: string;
  email: string;
  phone: string;
  address: string;
  manualBranch?: 'pickup' | 'shipping';
  pickupDay?: string;
  items?: CartLine[];
  wholesaleBusiness?: string;
  wholesaleQty?: string;
  notes?: string;
  // Ids of the by-arrangement (reservat) items the enquiry is about.
  arrangementItems?: string[];
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: OrderRequestBody;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid request body.');
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name) return badRequest('Name is required.');
  if (!emailPattern.test(email)) return badRequest('A valid email is required.');

  // --- Wholesale: always accepted as an enquiry, independent of the order window ---
  if (body.kind === 'wholesale') {
    const { id, order } = await createOrder({
      kind: 'wholesale',
      branch: 'n/a',
      name,
      email,
      phone: (body.phone || '').trim(),
      address: (body.address || '').trim(),
      distanceMiles: null,
      referencePoint: null,
      pickupDay: '',
      items: [],
      subtotalCents: 0,
      chargeCents: 0,
      wholesaleBusiness: (body.wholesaleBusiness || '').trim(),
      wholesaleQty: (body.wholesaleQty || '').trim(),
      notes: (body.notes || '').trim(),
    });
    // A wholesale enquiry never reaches Stripe, so this is its only chance to
    // be notified. It used to have none.
    await notifyNewOrder(order);
    return NextResponse.json({ redirect: `/order/confirmation?orderId=${id}&kind=wholesale` });
  }

  // --- By arrangement: Der Smoking, occasion cakes and anything else booked by
  // conversation. These carry their own lead time, so they are accepted whether
  // or not a bake window is open, and no payment is taken here. ---
  if (body.kind === 'arrangement') {
    const wanted = (body.arrangementItems || []).filter(Boolean);
    if (wanted.length === 0) return badRequest('Choose at least one item to arrange.');

    const allProducts = await getProducts();
    const chosen: OrderItem[] = [];
    for (const id of wanted) {
      const product = allProducts.find((p) => p.id === id);
      if (!product) return badRequest(`Unknown item: ${id}`);
      if (isOrderable(product)) {
        return badRequest(`${product.name} is bought from the cart, not arranged.`);
      }
      chosen.push({ id: product.id, name: product.name, qty: 1, priceCents: 0 });
    }

    const { id, order } = await createOrder({
      kind: 'arrangement',
      branch: 'n/a',
      name,
      email,
      phone: (body.phone || '').trim(),
      address: (body.address || '').trim(),
      distanceMiles: null,
      referencePoint: null,
      pickupDay: '',
      items: chosen,
      subtotalCents: 0,
      chargeCents: 0,
      wholesaleBusiness: '',
      wholesaleQty: '',
      notes: (body.notes || '').trim(),
      reserveCapacity: false,
    });
    // Same again: an arrangement request returns before Stripe by design.
    await notifyNewOrder(order);
    return NextResponse.json({ redirect: `/order/confirmation?orderId=${id}&kind=arrangement` });
  }

  // --- Regular pre-order ---
  const windowState = await getEffectiveWindowState();
  if (windowState.state !== 'open') {
    return badRequest(
      windowState.state === 'sold-out'
        ? "This window is sold out. We'll be back next week — join the email list to hear when."
        : 'Ordering is currently closed. Check the homepage for the next window.'
    );
  }

  const cartLines = (body.items || []).filter((l) => l.qty > 0);
  if (cartLines.length === 0) return badRequest('Add at least one item.');

  const products = await getProducts();
  const lineItems: OrderItem[] = [];
  for (const line of cartLines) {
    const product = products.find((p) => p.id === line.id);
    if (!product) return badRequest(`Unknown item: ${line.id}`);
    if (!isOrderable(product)) {
      return badRequest(
        `${product.name} is arranged directly rather than bought from the cart — send it as an enquiry and we'll get back to you.`
      );
    }
    if (product.capacity !== null && product.orderedCount + line.qty > product.capacity) {
      const remaining = Math.max(0, product.capacity - product.orderedCount);
      return badRequest(
        remaining > 0
          ? `Only ${remaining} of ${product.name} left this window — lower the quantity and try again.`
          : `${product.name} just sold out for this window.`
      );
    }
    lineItems.push({ id: product.id, name: product.name, qty: line.qty, priceCents: product.priceCents });
  }

  const address = (body.address || '').trim();
  let branch: OrderBranch = 'shipping';
  let distanceMiles: number | null = null;
  let referencePoint: string | null = null;

  if (address) {
    const geocoded = await geocodeAddress(address);
    const result = branchForPoint(geocoded ? { lat: geocoded.lat, lng: geocoded.lng } : null);
    if (result.branch === 'pickup') {
      branch = 'pickup';
      distanceMiles = Math.round(result.nearest.miles * 10) / 10;
      referencePoint = result.nearest.name;
    } else if (result.branch === 'shipping') {
      branch = 'shipping';
      distanceMiles = Math.round(result.nearest.miles * 10) / 10;
      referencePoint = result.nearest.name;
    } else if (body.manualBranch) {
      branch = body.manualBranch;
    } else {
      branch = 'shipping';
    }
  } else if (body.manualBranch) {
    branch = body.manualBranch;
  }

  // An item that doesn't ship, ordered from outside pickup range, is never a
  // dead end — it becomes a waitlist entry instead of a rejection.
  const unshippable = branch === 'shipping' && lineItems.some((li) => {
    const p = products.find((pp) => pp.id === li.id);
    return p && !p.ships;
  });
  if (unshippable) branch = 'waitlist';

  const subtotalCents = lineItems.reduce((sum, li) => sum + li.priceCents * li.qty, 0);
  const chargeCents = branch === 'waitlist' ? 0 : subtotalCents;

  const { id: orderId, order } = await createOrder({
    kind: 'order',
    branch,
    name,
    email,
    phone: (body.phone || '').trim(),
    address,
    distanceMiles,
    referencePoint,
    pickupDay: (body.pickupDay || '').trim(),
    items: lineItems,
    subtotalCents,
    chargeCents,
    wholesaleBusiness: '',
    wholesaleQty: '',
    notes: (body.notes || '').trim(),
  });

  // From here on, notify at the moment this order actually terminates.
  //
  // A waitlist order is never charged, so creation is the end of it.
  if (chargeCents === 0) {
    await notifyNewOrder(order);
    return NextResponse.json({ redirect: `/order/confirmation?orderId=${orderId}&branch=${branch}` });
  }

  // No Stripe in this environment: the order is recorded and that is all that
  // will ever happen to it.
  if (!isStripeConfigured()) {
    await notifyNewOrder(order);
    return NextResponse.json({
      redirect: `/order/confirmation?orderId=${orderId}&branch=${branch}&payment=skipped`,
    });
  }

  const stripe = getStripe()!;
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      // Sales tax is Stripe's job, not ours. Stripe Tax resolves the rate from
      // the buyer's address and the account's product tax code, which is what
      // keeps Missouri's reduced food rate correct as local rates change and
      // as jurisdictions differ between pickup and delivery.
      //
      // Requires Stripe Tax to be enabled on the account with an origin address
      // and a Missouri registration. Without those, session creation fails and
      // the catch below returns "Payment setup failed" — it does not silently
      // fall through to an untaxed charge.
      automatic_tax: { enabled: true },
      // automatic_tax cannot compute a rate without an address to compute it
      // against, so Checkout has to collect one.
      billing_address_collection: 'required',
      line_items: lineItems.map((li) => ({
        quantity: li.qty,
        price_data: {
          currency: 'usd',
          unit_amount: li.priceCents,
          // 'exclusive' — the listed $4 slice / $20 loaf are pre-tax prices and
          // tax is added on top. Switching this to 'inclusive' would keep the
          // shelf price as the all-in total and take the tax out of margin.
          tax_behavior: 'exclusive',
          product_data: { name: li.name },
        },
      })),
      success_url: `${SITE_URL}/order/confirmation?orderId=${orderId}&branch=${branch}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/order?resume=${orderId}`,
      metadata: { orderId: String(orderId) },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment setup failed.';
    console.error('[orders] Stripe session creation failed:', message);
    // The row is written but the customer can never pay it — this order ends
    // here, so it notifies here.
    await notifyNewOrder(order);
    return NextResponse.json({ error: 'Payment setup failed — please try again.' }, { status: 502 });
  }

  // Deliberately no notification on this path. The customer is on their way to
  // Stripe Checkout and the order has not terminated yet: it either gets paid,
  // in which case the webhook notifies with the settled, taxed total, or the
  // cart is abandoned and nothing should ever be sent. Notifying here is what
  // would produce bakes for carts that were never paid for.
  await setOrderStripeSession(orderId, session.id);
  return NextResponse.json({ checkoutUrl: session.url });
}
