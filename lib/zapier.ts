import type { NotifyResult, OrderRecord } from './types';

// Outbound notification hook. ZAPIER_WEBHOOK_URL is deliberately allowed to
// be unset or empty — that is the normal state until the owner creates the
// Zap, and the site must behave identically either way. Wiring Zapier up
// later is then a matter of pasting a URL into Vercel, with no code change.

export function isZapierConfigured(): boolean {
  return Boolean((process.env.ZAPIER_WEBHOOK_URL || '').trim());
}

// Orders are notified when they are created, which is the only moment every
// kind of order has in common — wholesale and arrangement enquiries never reach
// Stripe at all, and waitlist orders are never charged. 'order.paid' is kept
// for a later payment-confirmation fanout, if one is ever added.
export type ZapierOrderEvent = 'order.created' | 'order.paid';

export type ZapierOrderPayload = {
  event: ZapierOrderEvent;
  // 'order' is a real sale; 'wholesale' and 'arrangement' are enquiries with no
  // money attached. A Zap that routes these differently needs this field.
  orderKind: OrderRecord['kind'];
  branchIsWaitlist: boolean;
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
  subtotal: string;
  subtotalCents: number;
  tax: string;
  taxCents: number;
  total: string;
  totalCents: number;
  currency: 'usd';
};

export function buildOrderPayload(
  order: OrderRecord,
  event: ZapierOrderEvent = 'order.created'
): ZapierOrderPayload {
  const money = (cents: number) => (cents / 100).toFixed(2);
  return {
    event,
    orderKind: order.kind,
    branchIsWaitlist: order.branch === 'waitlist',
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
    // Broken out so bookkeeping can post the tax line separately. NOTE: at
    // order-creation time tax is not known yet — Stripe Tax calculates it at
    // checkout — so taxCents is 0 and total equals subtotal on an 'order.created'
    // payload. markOrderPaid settles the real figures onto the row afterwards.
    subtotal: money(order.subtotalCents),
    subtotalCents: order.subtotalCents,
    tax: money(order.taxCents),
    taxCents: order.taxCents,
    total: money(order.chargeCents),
    totalCents: order.chargeCents,
    currency: 'usd',
  };
}

// Never throws, so one dead integration cannot take down an order submission —
// but it now *reports* what happened instead of swallowing it. The caller
// (lib/notify.ts) is responsible for logging the result.
export async function notifyZapier(payload: ZapierOrderPayload): Promise<NotifyResult> {
  const url = (process.env.ZAPIER_WEBHOOK_URL || '').trim();
  if (!url) return { channel: 'zapier', status: 'skipped', detail: 'ZAPIER_WEBHOOK_URL not set' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { channel: 'zapier', status: 'failed', detail: `webhook returned HTTP ${res.status}` };
    }
    return { channel: 'zapier', status: 'ok' };
  } catch (err) {
    return {
      channel: 'zapier',
      status: 'failed',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
