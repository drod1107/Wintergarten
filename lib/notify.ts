import type { NotifyChannel, NotifyResult, OrderRecord } from './types';
import { claimOrderNotification } from './store';
import { buildOrderPayload, notifyZapier, type ZapierOrderEvent } from './zapier';
import { notifyOwnerByEmail } from './notify-email';
import { recordOrderInZoho } from './zoho';

// Why this exists
// ---------------
// All three outbound fanouts used to live in the Stripe webhook, inside the
// `payment_status === 'paid'` branch. Most of the ways an order can end never
// reach Stripe at all — wholesale and arrangement enquiries return before
// checkout by design, a waitlist order zeroes its charge and returns early, and
// a Stripe-less environment or a failed session creation stops there too — so
// those orders were written to the database and then went silent. No invoice,
// no Zap, no email.
//
// The rule now is: notify at the moment each path actually terminates.
//   * Card order  -> confirmed payment, from the Stripe webhook. Tax is settled
//                    by then, and a cart abandoned at Checkout notifies nothing.
//   * Everything else -> order creation, which for those paths is the end of it.
//
// That is one notification per order, no matter how it ends, and never two.
// The "never two" half is enforced by claimOrderNotification below rather than
// by trusting the call sites.

const CHANNELS: NotifyChannel[] = ['zapier', 'email', 'zoho'];

// A hard ceiling on how long a customer waits for integrations they cannot see.
// Each individual fanout already caps its own HTTP calls at 8s, but Zoho makes
// up to three of them in sequence, which would otherwise put ~24s between
// pressing Order and being redirected. Overrunning is logged, not swallowed.
const FANOUT_BUDGET_MS = 8000;

/**
 * Fan an order out to Zapier, the owner's email and Zoho, once and once only.
 *
 * Never throws: a dead integration must not turn a saved order into a 500 for
 * the customer, or make Stripe redeliver a settled payment. But every outcome is
 * returned and logged, so a silent failure no longer looks identical to success.
 */
export async function notifyNewOrder(
  order: OrderRecord | null,
  opts: { event?: ZapierOrderEvent } = {}
): Promise<NotifyResult[]> {
  if (!order) {
    // createOrder returns no row in demo mode (no DATABASE_URL). Nothing to send,
    // but say so out loud rather than looking like a successful fanout.
    console.error('[notify] no order record available — nothing was sent (demo mode?)');
    return [];
  }

  // One claim per order, won in the database. A redelivered Stripe webhook, or
  // any accidental second call, stops here.
  if (!(await claimOrderNotification(order.id))) {
    console.log(`[notify] order ${order.id} was already notified — skipping (duplicate delivery)`);
    return [];
  }

  const payload = buildOrderPayload(order, opts.event ?? 'order.created');

  const work = Promise.allSettled([
    notifyZapier(payload),
    notifyOwnerByEmail(payload),
    recordOrderInZoho(order),
  ]);

  const timedOut = Symbol('timeout');
  const raced = await Promise.race([
    work,
    new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), FANOUT_BUDGET_MS)),
  ]);

  if (raced === timedOut) {
    console.error(
      `[notify] order ${order.id} (${order.kind}/${order.branch}): fanout exceeded ${FANOUT_BUDGET_MS}ms — ` +
        'released the request without a result. The calls may still complete; check the integrations.'
    );
    // Keep draining in the background so a slow-but-working integration still
    // lands, and still log what it eventually said.
    void work.then((settled) => {
      for (const r of toResults(settled)) {
        console.error(`[notify] order ${order.id} (late): ${r.channel}=${r.status} ${r.detail ?? ''}`.trim());
      }
    });
    return CHANNELS.map((channel) => ({
      channel,
      status: 'failed' as const,
      detail: 'fanout budget exceeded; outcome unknown at response time',
    }));
  }

  const results = toResults(raced);

  for (const r of results) {
    if (r.status === 'failed') {
      console.error(`[notify] order ${order.id}: ${r.channel} FAILED — ${r.detail ?? 'no detail given'}`);
    }
  }

  const summary = results.map((r) => `${r.channel}=${r.status}`).join(' ');
  const line = `[notify] order ${order.id} (${order.kind}/${order.branch}) ${summary}`;
  if (results.some((r) => r.status === 'failed')) console.error(line);
  else console.log(line);

  return results;
}

function toResults(settled: PromiseSettledResult<NotifyResult>[]): NotifyResult[] {
  return settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : {
          channel: CHANNELS[i],
          status: 'failed' as const,
          // A fanout throwing at all is a bug — each is written not to. Surface it.
          detail: `threw: ${s.reason instanceof Error ? s.reason.message : String(s.reason)}`,
        }
  );
}
