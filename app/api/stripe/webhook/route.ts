import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { markOrderPaid } from '@/lib/store';
import { buildOrderPayload, notifyZapier } from '@/lib/zapier';
import { recordOrderInZoho } from '@/lib/zoho';

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
    const session = event.data.object as { id: string; payment_status: string };
    if (session.payment_status === 'paid') {
      const order = await markOrderPaid(session.id);
      // Fan the paid order out to Zapier when a hook URL is configured.
      // notifyZapier swallows its own failures, so a broken Zap can never
      // make us return non-2xx and have Stripe redeliver a settled payment.
      if (order) {
        // Both fanouts swallow their own failures — a broken integration can
        // never make us return non-2xx and have Stripe redeliver.
        await notifyZapier(buildOrderPayload(order));
        await recordOrderInZoho(order);
      }
    }
  }

  return NextResponse.json({ received: true });
}
