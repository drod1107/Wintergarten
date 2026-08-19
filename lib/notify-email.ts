import type { ZapierOrderPayload } from './zapier';

// Owner order alert by email via Resend's HTTP API (no SDK dependency).
// Deliberately no-ops until RESEND_API_KEY and ORDER_NOTIFY_EMAIL are set in
// the environment, so the site behaves identically with or without it.
// Tip: ORDER_NOTIFY_EMAIL can also be a carrier email-to-SMS gateway address
// (e.g. number@vtext.com) to get these as text messages for free.

export function isEmailNotifyConfigured(): boolean {
  return Boolean(
    (process.env.RESEND_API_KEY || '').trim() &&
      (process.env.ORDER_NOTIFY_EMAIL || '').trim(),
  );
}

// Never throws and never blocks the caller's own success path: a mail
// provider outage must not cause Stripe's webhook to fail and retry.
export async function notifyOwnerByEmail(payload: ZapierOrderPayload): Promise<void> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const to = (process.env.ORDER_NOTIFY_EMAIL || '').trim();
  if (!apiKey || !to) return;

  const from =
    (process.env.ORDER_NOTIFY_FROM || '').trim() ||
    'Wintergarten Orders <onboarding@resend.dev>';

  const lines = payload.items.map((i) => `${i.qty} × ${i.name} — $${i.lineTotal}`);
  const text = [
    `Order #${payload.orderId} paid — $${payload.total}`,
    '',
    ...lines,
    '',
    `Customer: ${payload.customerName}`,
    `Phone: ${payload.customerPhone}`,
    `Email: ${payload.customerEmail}`,
    `Branch: ${payload.branch}`,
    `Pickup: ${payload.pickupDay}`,
    payload.address ? `Address: ${payload.address}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        subject: `Wintergarten order #${payload.orderId}: ${payload.itemsSummary} — $${payload.total}`,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Order email returned ${res.status} for order ${payload.orderId}: ${body}`);
    }
  } catch (err) {
    console.error(`Order email failed for order ${payload.orderId}:`, err);
  }
}
