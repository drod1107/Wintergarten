import type { NotifyResult } from './types';
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

// What kind of thing this is, in plain words, for the subject line and the
// first line of the body. An enquiry is not a sale and must not read like one.
function headline(payload: ZapierOrderPayload): string {
  if (payload.orderKind === 'wholesale') return `Wholesale enquiry #${payload.orderId}`;
  if (payload.orderKind === 'arrangement') return `Arrangement request #${payload.orderId}`;
  if (payload.branchIsWaitlist) return `Waitlist order #${payload.orderId} — nothing charged`;
  if (payload.event === 'order.paid') return `Order #${payload.orderId} paid — $${payload.total}`;
  return `Order #${payload.orderId} placed — $${payload.total} (payment not yet confirmed)`;
}

// Never throws, so a mail provider outage cannot take down an order
// submission — but it now reports the outcome rather than swallowing it.
export async function notifyOwnerByEmail(payload: ZapierOrderPayload): Promise<NotifyResult> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const to = (process.env.ORDER_NOTIFY_EMAIL || '').trim();
  if (!apiKey || !to) {
    return {
      channel: 'email',
      status: 'skipped',
      detail: 'RESEND_API_KEY and/or ORDER_NOTIFY_EMAIL not set',
    };
  }

  const from =
    (process.env.ORDER_NOTIFY_FROM || '').trim() ||
    'Wintergarten Orders <onboarding@resend.dev>';

  const lines = payload.items.map((i) => `${i.qty} × ${i.name} — $${i.lineTotal}`);
  const text = [
    headline(payload),
    '',
    ...(lines.length ? lines : ['(no line items — enquiry)']),
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
        subject: `Wintergarten — ${headline(payload)}${
          payload.itemsSummary ? `: ${payload.itemsSummary}` : ''
        }`,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        channel: 'email',
        status: 'failed',
        detail: `Resend returned HTTP ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    return { channel: 'email', status: 'ok' };
  } catch (err) {
    return {
      channel: 'email',
      status: 'failed',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
