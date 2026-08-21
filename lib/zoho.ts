import type { NotifyResult, OrderRecord } from './types';

// Zoho Books fanout, mirroring lib/zapier.ts: configuration is optional, and
// the site behaves identically whether or not the env vars are set. Wiring
// Zoho up is a matter of pasting four values into Vercel, no code change.
//
// Required env vars:
//   ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN — from a
//   "Self Client" created at https://api-console.zoho.com (scope:
//   ZohoBooks.fullaccess.all)
//   ZOHO_ORG_ID — optional, defaults to the Wintergarten org.

const ZOHO_ACCOUNTS = 'https://accounts.zoho.com';
const ZOHO_API = 'https://www.zohoapis.com/books/v3';
const DEFAULT_ORG_ID = '933666561'; // Wintergarten Bakehouse + Botanicals

export function isZohoConfigured(): boolean {
  return Boolean(
    (process.env.ZOHO_CLIENT_ID || '').trim() &&
      (process.env.ZOHO_CLIENT_SECRET || '').trim() &&
      (process.env.ZOHO_REFRESH_TOKEN || '').trim()
  );
}

function orgId(): string {
  return (process.env.ZOHO_ORG_ID || '').trim() || DEFAULT_ORG_ID;
}

async function getAccessToken(): Promise<string | null> {
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  });
  const res = await fetch(`${ZOHO_ACCOUNTS}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error(`[zoho] token refresh failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.access_token || null;
}

async function zohoFetch(token: string, path: string, init?: RequestInit) {
  const sep = path.includes('?') ? '&' : '?';
  return fetch(`${ZOHO_API}${path}${sep}organization_id=${orgId()}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  });
}

// Every invoice this code creates carries reference_number WEB-<orderId>, which
// makes that field the natural idempotency key. Without this check a replayed
// Stripe webhook — or a retried order submission — creates a second invoice for
// the same order, and Zoho will happily accept it.
async function findInvoiceByReference(token: string, reference: string): Promise<string | null> {
  const res = await zohoFetch(token, `/invoices?reference_number=${encodeURIComponent(reference)}`);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const hit = data?.invoices?.find(
    (inv: { reference_number?: string; invoice_id?: string }) =>
      inv.reference_number === reference
  );
  return hit?.invoice_id ?? null;
}

async function findOrCreateContact(token: string, order: OrderRecord): Promise<string | null> {
  // Search by email first so repeat customers accumulate history.
  if (order.email) {
    const res = await zohoFetch(token, `/contacts?email=${encodeURIComponent(order.email)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.contacts?.length) return data.contacts[0].contact_id;
    }
  }
  const create = await zohoFetch(token, '/contacts', {
    method: 'POST',
    body: JSON.stringify({
      contact_name: order.name,
      email: order.email || undefined,
      phone: order.phone || undefined,
      contact_type: 'customer',
    }),
  });
  if (create.ok) {
    const data = await create.json();
    return data.contact?.contact_id || null;
  }
  // "already exists" race: retry the search once by name.
  const retry = await zohoFetch(token, `/contacts?contact_name=${encodeURIComponent(order.name)}`);
  if (retry.ok) {
    const data = await retry.json();
    if (data.contacts?.length) return data.contacts[0].contact_id;
  }
  return null;
}

// Never throws, so Zoho being down cannot take down an order submission — but
// it now reports the outcome rather than swallowing it.
//
// Two things worth knowing about what this does and does not invoice:
//
//   * Wholesale and arrangement enquiries carry no priced line items, and a
//     waitlist order is explicitly not a sale. Zoho rejects an invoice with an
//     empty line_items array, so for those the contact is still recorded — which
//     is the part with CRM value — and the invoice is skipped, reported as such.
//   * An invoice raised at order-creation time is pre-tax, because Stripe Tax
//     does not calculate until checkout. The invoice total will therefore be the
//     subtotal, not what the customer eventually paid.
export async function recordOrderInZoho(order: OrderRecord): Promise<NotifyResult> {
  if (!isZohoConfigured()) {
    return { channel: 'zoho', status: 'skipped', detail: 'Zoho env vars not set' };
  }
  try {
    const token = await getAccessToken();
    if (!token) {
      return { channel: 'zoho', status: 'failed', detail: 'token refresh failed' };
    }

    const contactId = await findOrCreateContact(token, order);
    if (!contactId) {
      return {
        channel: 'zoho',
        status: 'failed',
        detail: `could not find or create contact for order ${order.id}`,
      };
    }

    const billable = order.items.filter((i) => i.priceCents > 0 && i.qty > 0);
    if (billable.length === 0 || order.chargeCents === 0) {
      return {
        channel: 'zoho',
        status: 'skipped',
        detail: `contact recorded; no invoice raised (${order.kind}/${order.branch} has nothing billable)`,
      };
    }

    const reference = `WEB-${order.id}`;
    const existing = await findInvoiceByReference(token, reference);
    if (existing) {
      return {
        channel: 'zoho',
        status: 'skipped',
        detail: `invoice ${reference} already exists (${existing}) — not duplicated`,
      };
    }

    const res = await zohoFetch(token, '/invoices', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: contactId,
        reference_number: reference,
        notes: [
          `Online order #${order.id} — ${
            order.stripeStatus === 'paid' ? 'paid via Stripe' : 'placed on the website; payment not yet confirmed'
          }.`,
          `Branch: ${order.branch}. Pickup/due: ${order.pickupDay || 'n/a'}.`,
          order.address ? `Address: ${order.address}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        line_items: billable.map((i) => ({
          name: i.name,
          description: i.name,
          rate: i.priceCents / 100,
          quantity: i.qty,
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        channel: 'zoho',
        status: 'failed',
        detail: `invoice create returned HTTP ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    return { channel: 'zoho', status: 'ok', detail: `invoice ${reference} created` };
  } catch (err) {
    return {
      channel: 'zoho',
      status: 'failed',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

