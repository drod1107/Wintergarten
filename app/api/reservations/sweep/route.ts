import { NextRequest, NextResponse } from 'next/server';
import { sweepExpiredHolds } from '@/lib/reservations';

export const dynamic = 'force-dynamic';

/**
 * Release lapsed stock holds and expire their Checkout sessions.
 *
 * Availability already ignores expired holds, so a missed run can never keep
 * stock off the shelf. What this run is actually for is the other half: Stripe
 * refuses to expire a session sooner than 30 minutes, and our hold is 10, so
 * without this a customer could pay twenty minutes after their hold lapsed,
 * against a loaf already sold to someone else.
 *
 * Called by the Vercel cron in vercel.json. CRON_SECRET gates it when set, so
 * the endpoint cannot be used to hammer the Stripe API from outside.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
  }

  try {
    const { swept } = await sweepExpiredHolds();
    return NextResponse.json({ swept });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sweep failed.';
    console.error('[reservations] sweep failed:', message);
    return NextResponse.json({ error: 'Sweep failed.' }, { status: 500 });
  }
}
