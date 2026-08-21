import type { NotifyChannel, NotifyResult, OrderRecord } from './types';
import { claimOrderNotification, releaseOrderNotification } from './store';
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
// The rule is: no notification without money Stripe has confirmed.
//   * Anything payable -> Stripe confirms payment, or nothing is sent. Ever.
//     A checkout that is abandoned, expired, failed, or still pending is
//     recorded for pipeline tracking and accounting and notifies nobody.
//   * Non-payable enquiries (wholesale, arrangement, waitlist) -> notify at
//     creation, labelled as enquiries rather than sales, because no payment is
//     ever expected on those paths.
//
// Why: anything that reads as an "order" when no money has moved creates a
// false obligation to bake, and a conversation with a customer who never paid.
//
// That is one notification per order, no matter how it ends, and never two.
// The "never two" half is enforced by claimOrderNotification below rather than
// by trusting the call sites; the "never unpaid" half is enforced by the
// payable-order guard in notifyNewOrder, for the same reason.

const CHANNELS: NotifyChannel[] = ['zapier', 'email', 'zoho'];

// A ceiling on how long a caller waits for integrations it cannot see. Each
// fanout caps its own HTTP calls at 8s, but Zoho makes up to three in sequence,
// so a pathological Zoho could otherwise hold a request for ~24s.
//
// Deliberately above the 8s per-call ceiling rather than equal to it: at 8s the
// budget would race the per-call timeout and fire spuriously every time a single
// channel used its full allowance. At 10s it only fires when something is
// genuinely pathological. Overrunning is logged, never swallowed.
const FANOUT_BUDGET_MS = 10_000;

// A claim is worth keeping only if something actually got delivered.
//
//   * any 'ok'                 -> keep the claim. Something went out; sending it
//                                 again would be the duplicate we are avoiding.
//   * no 'ok', some 'failed'   -> release. Nothing was delivered and the failure
//                                 is the retryable kind.
//   * everything 'skipped'     -> keep. Nothing was delivered, but nothing is
//                                 configured either, so there is nothing to
//                                 retry and releasing would just churn the row
//                                 on every redelivery.
function deliveredSomething(results: NotifyResult[]): boolean {
  if (results.some((r) => r.status === 'ok')) return true;
  return !results.some((r) => r.status === 'failed');
}

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

  // The paid-only rule, enforced here rather than at the call sites.
  //
  // A payable order — anything with a charge on it — may only be announced once
  // Stripe has confirmed the money, which is the one place 'order.paid' is set
  // (app/api/stripe/webhook/route.ts, behind payment_status === 'paid').
  // Abandoned, expired, failed and pending-payment checkouts all reach the end
  // of their request with a row in the database and nothing sent, which is the
  // point: they are captured for pipeline tracking and accounting, silently.
  //
  // Deliberately before claimOrderNotification, so refusing to send does not
  // burn the order's one claim. If the same order is later genuinely paid, the
  // webhook still finds notified_at null and notifies properly.
  if (order.chargeCents > 0 && opts.event !== 'order.paid') {
    console.log(
      `[notify] order ${order.id} (${order.kind}/${order.branch}) is payable but unpaid ` +
        `(event=${opts.event ?? 'none'}, charge=${order.chargeCents}) — recorded, nothing sent`
    );
    return [];
  }

  // One claim per order, won in the database. A redelivered Stripe webhook, or
  // any accidental second call, stops here.
  if (!(await claimOrderNotification(order.id))) {
    console.log(`[notify] order ${order.id} was already notified — skipping (duplicate delivery)`);
    return [];
  }

  // Anything reaching this line is either 'order.paid' — money confirmed by
  // Stripe — or a non-payable enquiry with chargeCents === 0. The guard above
  // makes it impossible for a payable order to be described as 'order.created',
  // which is what previously let an unpaid attempt reach Zapier and Zoho looking
  // like a sale. The literal is kept rather than renamed because David's live Zap
  // matches on it; the guarantee is enforced above, not by the string.
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
    // Release the claim now rather than holding it on a guess.
    //
    // At this point the outcome is genuinely unknown, and the two mistakes are
    // not symmetrical. Holding a claim that turns out to have delivered nothing
    // strands the order permanently, unretryable — the bug this change exists to
    // fix. Releasing one that turns out to have delivered leaves a row looking
    // un-notified, which costs a duplicate only if something later retries it.
    //
    // The late drain below then corrects the record either way: if a slow but
    // working integration does land, it re-claims, so a subsequent redelivery or
    // sweep will not send twice. If the process is frozen by the runtime before
    // that runs, the row stays released — visible as needing attention, which is
    // the side to fail on.
    await releaseOrderNotification(order.id);
    console.error(
      `[notify] order ${order.id} (${order.kind}/${order.branch}): fanout exceeded ${FANOUT_BUDGET_MS}ms — ` +
        'claim released, outcome unknown. The calls may still complete; watch for a "(late)" line.'
    );
    void work.then(async (settled) => {
      const late = toResults(settled);
      for (const r of late) {
        console.error(`[notify] order ${order.id} (late): ${r.channel}=${r.status} ${r.detail ?? ''}`.trim());
      }
      if (deliveredSomething(late)) {
        await claimOrderNotification(order.id);
        console.log(`[notify] order ${order.id} (late): delivered after all — claim re-taken`);
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

  // Nothing got through and something is retryable: hand the claim back so this
  // order is not stranded as permanently notified.
  if (!deliveredSomething(results)) {
    await releaseOrderNotification(order.id);
    console.error(
      `[notify] order ${order.id}: nothing was delivered — claim released, order can be notified again`
    );
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
