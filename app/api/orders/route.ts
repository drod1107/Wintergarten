import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, branchForPoint } from '@/lib/geo';
import {
  createOrder,
  getEffectiveWindowState,
  getProducts,
  isOrderable,
  setOrderStripeSession,
} from '@/lib/store';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { SITE_URL } from '@/lib/site';
import type { OrderBranch, OrderItem } from '@/lib/types';

type CartLine = { id: string; qty: number };

type OrderRequestBody = {
  kind: 'order' | 'wholesale';
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
    const { id } = await createOrder({
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
    return NextResponse.json({ redirect: `/order/confirmation?orderId=${id}&kind=wholesale` });
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
        `${product.name} is arranged directly rather than bought from the cart — send it as an enquiry and we'll come back to you.`
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

  const { id: orderId } = await createOrder({
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

  if (chargeCents === 0) {
    return NextResponse.json({ redirect: `/order/confirmation?orderId=${orderId}&branch=${branch}` });
  }

  if (!isStripeConfigured()) {
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
      line_items: lineItems.map((li) => ({
        quantity: li.qty,
        price_data: {
          currency: 'usd',
          unit_amount: li.priceCents,
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
    return NextResponse.json({ error: 'Payment setup failed — please try again.' }, { status: 502 });
  }

  await setOrderStripeSession(orderId, session.id);
  return NextResponse.json({ checkoutUrl: session.url });
}
