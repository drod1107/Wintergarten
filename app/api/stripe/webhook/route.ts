import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { markOrderPaid } from '@/lib/store';
import { notifyNewOrder } from '@/lib/notify';

// This file is the ONLY place a payable order is ever announced.
//
// The rule: no SALE notification of any kind — email, Zap, Zoho, anything —
// unless Stripe has confirmed the money. Abandoned, expired, failed and pending-payment
// checkouts keep their database row for pipeline tracking and accounting, and
// send nothing. An "order" in the owner's inbox when no money has moved creates
// a false obligation to bake and an argument with a customer who never paid.
//
// Confirmed payment is also the right moment on its own merits: the tax is
// settled by then, so the figure the owner sees is what was actually collected.
//
// This governs SALE notifications only. Leads are a different rule: wholesale
// enquiries, arrangement requests and waitlist signups never reach Stripe, notify
// at creation in app/api/orders/route.ts, and must never be gated on payment or
// silenced — they are what feeds Zoho. Settled; see issue #22.
//
// Double-firing is prevented in the database rather than here: notifyNewOrder
// claims the order's notified_at before sending, so a Stripe redelivery of the
// same event finds it already claimed and sends nothing.

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 400 });
  }

  const signature = req.headers.get('stripe-signature');
  const payload = await req.text();
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  // The only two events that may ever produce a notification.
  //
  // `checkout.session.completed` alone is NOT proof of payment: for delayed
  // payment methods — ACH bank debit, Klarna, bank transfer, all of which this
  // account currently offers at Checkout — it fires immediately with
  // `payment_status: 'unpaid'` and the money lands minutes or days later. That
  // is why the `=== 'paid'` check below exists and must never be removed.
  //
  // `checkout.session.async_payment_succeeded` is the event that fires when a
  // delayed payment finally clears. Without it, an ACH or Klarna order that is
  // genuinely paid notifies nobody, ever — the mirror-image failure of the one
  // this file is being changed to fix, and the worse of the two.
  //
  // Everything else is deliberately unhandled and returns 200 without sending:
  // checkout.session.expired (abandoned cart), checkout.session.async_payment_failed,
  // payment_intent.payment_failed, payment_intent.canceled, charge.failed. Those
  // orders keep their row for pipeline tracking and accounting and notify nothing.
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as {
      id: string;
      payment_status: string;
      amount_total: number | null;
      total_details: { amount_tax: number | null } | null;
    };
    if (session.payment_status === 'paid') {
      // amount_total is the taxed total Stripe actually charged; the order row
      // was written pre-tax, so settle it against these rather than leaving
      // charge_cents understating the payment by the tax amount.
      const order = await markOrderPaid(session.id, {
        amountTotalCents: session.amount_total,
        taxCents: session.total_details?.amount_tax ?? null,
      });
      if (order) {
        console.log(
          `[stripe] order ${order.id} settled: charge=${order.chargeCents} tax=${order.taxCents}`
        );
        // notifyNewOrder never throws, so a broken integration cannot make this
        // return non-2xx and have Stripe redeliver a settled payment.
        await notifyNewOrder(order, { event: 'order.paid' });
      } else {
        // A paid session that matches no order row is a real problem — the money
        // arrived and there is nothing to fulfil against. Never silent.
        console.error(
          `[stripe] paid session ${session.id} matched no order row — payment received with nothing to fulfil.`
        );
      }
    } else {
      // The trap this whole change exists around: `checkout.session.completed`
      // with payment_status 'unpaid' (delayed method still clearing) or
      // 'no_payment_required' (fully discounted). Recorded, never announced.
      // If it is a delayed method that later clears, async_payment_succeeded
      // brings it back here with payment_status 'paid' and it notifies then.
      console.log(
        `[stripe] session ${session.id} ${event.type} with payment_status=${session.payment_status} ` +
          '— not paid, recorded only, no notification sent'
      );
    }
  }

  return NextResponse.json({ received: true });
}
