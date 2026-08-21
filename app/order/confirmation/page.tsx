import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import EmailSignup from '@/components/EmailSignup';
import { markOrderPaid } from '@/lib/store';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

async function resolvePaymentStatus(sessionId: string | undefined) {
  if (!sessionId) return null;
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      await markOrderPaid(sessionId);
    }
    return session.payment_status;
  } catch {
    return null;
  }
}

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const paymentStatus = await resolvePaymentStatus(params.session_id);
  const branch = params.branch;
  const kind = params.kind;
  const paymentSkipped = params.payment === 'skipped';

  let heading = 'Order received';
  let body = "We've got it. A confirmation is on its way to your inbox.";

  if (kind === 'wholesale') {
    heading = 'Enquiry received';
    body = "We'll be in touch about wholesale within a couple of days.";
  } else if (kind === 'arrangement') {
    heading = 'Request received';
    body = "Nothing has been charged. We'll come back to you to settle the details, and take payment once it's agreed.";
  } else if (branch === 'waitlist') {
    heading = "You're on the list";
    body = "We don't ship this item to your area yet — we'll reach out the moment that changes.";
  } else if (branch === 'pickup') {
    heading = 'Order received — pickup';
    body = "We'll confirm your pickup day by email.";
  } else if (branch === 'shipping') {
    heading = 'Order received — shipping';
    body = "We'll email a shipping confirmation once it's on its way.";
  }

  return (
    <>
      <div className="shell">
        <Nav />
      </div>
      <main id="main">
        <div className="shell z">
          <div className="confirm-panel">
            <div className="stamp">
              {heading}
              <b>{paymentStatus === 'paid' ? 'Payment received' : ''}</b>
            </div>
            <p style={{ marginTop: 20, fontSize: 16 }}>{body}</p>
            {paymentSkipped && (
              <p className="placeholder-flag" style={{ maxWidth: '56ch' }}>
                <span className="typed">Demo note</span>
                Stripe test keys aren&apos;t configured in this environment, so payment was skipped. The
                order itself was recorded normally — wire up STRIPE_SECRET_KEY to take real test-mode
                payments.
              </p>
            )}
            <p style={{ marginTop: 24 }}>
              <Link href="/kitchen-record" className="btn btn-outline">
                Read the kitchen record
              </Link>
            </p>

            <section style={{ marginTop: 48, maxWidth: 420 }}>
              <h2 style={{ fontSize: 22, marginBottom: 8 }}>One email a week</h2>
              <p style={{ fontSize: 14, marginBottom: 16 }}>
                What&apos;s baking, what&apos;s rooted, whether the stand is open.
              </p>
              <EmailSignup source="post-order" />
            </section>
          </div>
        </div>
      </main>
      <div className="shell">
        <Footer />
      </div>
    </>
  );
}
