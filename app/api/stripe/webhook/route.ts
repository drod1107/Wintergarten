import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { markOrderPaid } from '@/lib/store';
import { notifyNewOrder } from '@/lib/notify';

// Every order notifies exactly once, at the moment its own path terminates.
//
// For a card order that moment is confirmed payment, which is here: the tax is
// settled by now, so the owner is told what was actually collected, and a cart
// abandoned at Checkout correctly notifies nothing at all.
//
// The paths that never reach Stripe — wholesale and arrangement enquiries,
// waitlist orders, a Stripe-less environment, and a failed session creation —
// terminate at order creation and notify there instead, in
// app/api/orders/route.ts. That is the bug this arrangement fixes: those four
// used to write a row and then go silent, because the fanouts only ever ran in
// the branch below.
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

  if (event.type === 'checkout.session.completed') {
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
    }
  }

  return NextResponse.json({ received: true });
}
