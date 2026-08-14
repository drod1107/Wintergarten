import Stripe from 'stripe';

let stripeClient: Stripe | null = null;
let attempted = false;

export function getStripe(): Stripe | null {
  if (attempted) return stripeClient;
  attempted = true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient = new Stripe(key, { apiVersion: '2024-11-20.acacia' });
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
