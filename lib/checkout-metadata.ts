import type { OrderBranch } from '@/lib/types';

/**
 * The order is not written to the database until Stripe confirms payment, so
 * everything needed to build it has to survive the round trip through Checkout.
 * Stripe metadata carries it: up to 50 keys, 500 characters per value.
 *
 * Only the customer's own words and the cart's shape travel here. Prices and
 * product names are deliberately NOT included -- they are re-derived from the
 * database when the order is settled, so a tampered session can never dictate
 * what something cost.
 */

export type CheckoutPayload = {
  branch: OrderBranch;
  name: string;
  email: string;
  phone: string;
  address: string;
  distanceMiles: number | null;
  referencePoint: string | null;
  pickupDay: string;
  notes: string;
  cart: { id: string; qty: number }[];
};

const CHUNK = 450; // under Stripe's 500-char ceiling, with headroom

/** Split a long value across numbered keys (notes_0, notes_1, ...). */
function chunked(prefix: string, value: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value) return out;
  for (let i = 0, part = 0; i < value.length; i += CHUNK, part += 1) {
    out[`${prefix}_${part}`] = value.slice(i, i + CHUNK);
  }
  return out;
}

/** Reassemble a value written by chunked(). */
function unchunked(prefix: string, meta: Record<string, string>): string {
  let out = '';
  for (let part = 0; ; part += 1) {
    const piece = meta[`${prefix}_${part}`];
    if (piece === undefined) return out;
    out += piece;
  }
}

/** Pack an order payload into Stripe Checkout session metadata. */
export function packCheckoutPayload(p: CheckoutPayload): Record<string, string> {
  return {
    wg_v: '1',
    wg_branch: p.branch,
    wg_email: p.email.slice(0, CHUNK),
    wg_phone: p.phone.slice(0, CHUNK),
    wg_distance: p.distanceMiles === null ? '' : String(p.distanceMiles),
    wg_pickup_day: p.pickupDay.slice(0, CHUNK),
    // "id:qty,id:qty" -- ids are short SKU codes, so a large cart still fits.
    wg_cart: p.cart.map((l) => `${l.id}:${l.qty}`).join(','),
    ...chunked('wg_name', p.name),
    ...chunked('wg_address', p.address),
    ...chunked('wg_ref', p.referencePoint || ''),
    ...chunked('wg_notes', p.notes),
  };
}

/**
 * Rebuild the payload from session metadata. Returns null when the metadata
 * did not come from packCheckoutPayload -- an older session created before
 * this change, or anything else that lacks the version marker.
 */
export function unpackCheckoutPayload(
  meta: Record<string, string> | null | undefined
): CheckoutPayload | null {
  if (!meta || meta.wg_v !== '1') return null;

  const cart = (meta.wg_cart || '')
    .split(',')
    .filter(Boolean)
    .map((pair) => {
      const [id, qty] = pair.split(':');
      return { id, qty: Number(qty) || 0 };
    })
    .filter((l) => l.id && l.qty > 0);

  const distance = meta.wg_distance;

  return {
    branch: (meta.wg_branch || 'pickup') as OrderBranch,
    name: unchunked('wg_name', meta),
    email: meta.wg_email || '',
    phone: meta.wg_phone || '',
    address: unchunked('wg_address', meta),
    distanceMiles: distance ? Number(distance) : null,
    referencePoint: unchunked('wg_ref', meta) || null,
    pickupDay: meta.wg_pickup_day || '',
    notes: unchunked('wg_notes', meta),
    cart,
  };
}
