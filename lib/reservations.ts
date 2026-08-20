import { getPool } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

/**
 * Stock holds for the checkout window.
 *
 * Orders are written only when Stripe confirms payment, so nothing consumes
 * batch capacity while a customer is on the card form. A hold bridges that gap:
 * it takes the unit off the shelf for everyone else the moment checkout starts,
 * and gives it back if the customer never pays.
 *
 * The hold is deliberately exclusive. If someone holds the last loaf and walks
 * away, nobody else can buy it until the hold lapses -- that is the intended
 * trade, chosen over letting two people pay for one loaf.
 */

export const HOLD_MINUTES = 10;

/**
 * Take a hold for a checkout session.
 *
 * Capacity is re-checked inside the same statement that writes the hold, so two
 * simultaneous checkouts cannot both be told the last unit is theirs. Returns
 * the ids it could not hold; an empty array means the whole cart is held.
 */
export async function holdStock(
  sessionId: string,
  cart: { id: string; qty: number }[]
): Promise<{ ok: boolean; unavailable: string[]; expiresAt: Date | null }> {
  const pool = getPool();
  if (!pool) return { ok: true, unavailable: [], expiresAt: null };

  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
  const unavailable: string[] = [];

  const client = await pool.connect();
  try {
    await client.query('begin');
    // Serialise against other checkouts touching the same rows.
    for (const line of cart) {
      const { rows } = await client.query(
        `select p.capacity,
                p.ordered_count + coalesce((
                  select sum(qty)::int from reservations
                   where product_id = p.id and expires_at > now()
                ), 0) as taken
           from products p
          where p.id = $1
          for update`,
        [line.id]
      );
      const row = rows[0];
      if (!row) {
        unavailable.push(line.id);
        continue;
      }
      // A null capacity means unlimited -- nothing to run out of.
      if (row.capacity !== null && row.taken + line.qty > row.capacity) {
        unavailable.push(line.id);
        continue;
      }
      await client.query(
        `insert into reservations (stripe_session_id, product_id, qty, expires_at)
         values ($1, $2, $3, $4)
         on conflict (stripe_session_id, product_id)
         do update set qty = $3, expires_at = $4`,
        [sessionId, line.id, line.qty, expiresAt]
      );
    }

    if (unavailable.length > 0) {
      await client.query('rollback');
      return { ok: false, unavailable, expiresAt: null };
    }

    await client.query('commit');
    return { ok: true, unavailable: [], expiresAt };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

/** Give the units back. Safe to call on a session that holds nothing. */
export async function releaseHold(sessionId: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query('delete from reservations where stripe_session_id = $1', [sessionId]);
}

/** What a customer has left on the clock, for the countdown. */
export async function holdExpiry(sessionId: string): Promise<Date | null> {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    `select max(expires_at) as expires_at from reservations
      where stripe_session_id = $1 and expires_at > now()`,
    [sessionId]
  );
  return rows[0]?.expires_at ? new Date(rows[0].expires_at) : null;
}

/**
 * Clear lapsed holds, and expire their Checkout sessions with them.
 *
 * Stripe will not let a session expire sooner than 30 minutes, but the hold is
 * 10. Without this, a customer could sit on a dead hold and still pay twenty
 * minutes later, against stock already sold to someone else. Expiring the
 * session server-side keeps Stripe and the shelf telling the same story.
 *
 * Returns how many sessions it retired. Safe to run concurrently: the delete is
 * the source of truth and a session already expired or completed just throws,
 * which is swallowed per session.
 */
export async function sweepExpiredHolds(): Promise<{ swept: number }> {
  const pool = getPool();
  if (!pool) return { swept: 0 };

  const { rows } = await pool.query(
    `select distinct stripe_session_id from reservations where expires_at <= now()`
  );
  if (rows.length === 0) return { swept: 0 };

  const stripe = getStripe();
  for (const { stripe_session_id: sessionId } of rows) {
    if (!stripe) break;
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // Never touch one that already paid -- settle owns that row now.
      if (session.status === 'open') await stripe.checkout.sessions.expire(sessionId);
    } catch {
      // Already expired, already completed, or unknown to this account.
      // The hold still gets cleared below either way.
    }
  }

  await pool.query('delete from reservations where expires_at <= now()');
  return { swept: rows.length };
}
