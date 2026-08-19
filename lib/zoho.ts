import type { OrderRecord } from './types';

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
  console.error(`[zoho] could not find or create contact for order ${order.id}`);
  return null;
}

// Never throws and never blocks the caller: Zoho being down must not cause
// Stripe's webhook to fail and redeliver a settled payment.
export async function recordOrderInZoho(order: OrderRecord): Promise<void> {
  if (!isZohoConfigured()) return;
  try {
    const token = await getAccessToken();
    if (!token) return;

    const contactId = await findOrCreateContact(token, order);
    if (!contactId) return;

    const res = await zohoFetch(token, '/salesorders', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: contactId,
        reference_number: `WEB-${order.id}`,
        notes: [
          `Online order #${order.id} — paid via Stripe.`,
          `Branch: ${order.branch}. Pickup/due: ${order.pickupDay || 'n/a'}.`,
          order.address ? `Address: ${order.address}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        line_items: order.items.map((i) => ({
          name: i.name,
          description: i.name,
          rate: i.priceCents / 100,
          quantity: i.qty,
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[zoho] sales order create failed for order ${order.id}: ${res.status} ${body.slice(0, 300)}`);
    }
  } catch (err) {
    console.error(`[zoho] fanout failed for order ${order.id}:`, err);
  }
}
