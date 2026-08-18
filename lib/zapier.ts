import type { OrderRecord } from './types';

// Outbound notification hook. ZAPIER_WEBHOOK_URL is deliberately allowed to
// be unset or empty — that is the normal state until the owner creates the
// Zap, and the site must behave identically either way. Wiring Zapier up
// later is then a matter of pasting a URL into Vercel, with no code change.

export function isZapierConfigured(): boolean {
  return Boolean((process.env.ZAPIER_WEBHOOK_URL || '').trim());
}

export type ZapierOrderPayload = {
  event: 'order.paid';
  orderId: number;
  timestamp: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  branch: string;
  pickupDay: string;
  address: string;
  items: { name: string; qty: number; priceEach: string; lineTotal: string }[];
  itemsSummary: string;
  total: string;
  totalCents: number;
  currency: 'usd';
};

export function buildOrderPayload(order: OrderRecord): ZapierOrderPayload {
  const money = (cents: number) => (cents / 100).toFixed(2);
  return {
    event: 'order.paid',
    orderId: order.id,
    timestamp: new Date().toISOString(),
    customerName: order.name,
    customerEmail: order.email,
    customerPhone: order.phone,
    branch: order.branch,
    pickupDay: order.pickupDay,
    address: order.address,
    items: order.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      priceEach: money(i.priceCents),
      lineTotal: money(i.priceCents * i.qty),
    })),
    // Zapier's simpler actions (a text message, a spreadsheet cell) can't
    // walk an array, so ship a flat summary alongside the structured items.
    itemsSummary: order.items.map((i) => `${i.qty} × ${i.name}`).join(', '),
    total: money(order.chargeCents),
    totalCents: order.chargeCents,
    currency: 'usd',
  };
}

// Never throws and never blocks the caller's own success path: a Zap being
// down must not cause Stripe's webhook to fail and retry a paid order.
export async function notifyZapier(payload: ZapierOrderPayload): Promise<void> {
  const url = (process.env.ZAPIER_WEBHOOK_URL || '').trim();
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`Zapier webhook returned ${res.status} for order ${payload.orderId}.`);
    }
  } catch (err) {
    console.error(`Zapier webhook failed for order ${payload.orderId}:`, err);
  }
}
