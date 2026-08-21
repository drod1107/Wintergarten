import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import OrderForm from '@/components/OrderForm';
import { getProducts, getEffectiveWindowState, getOrderWindow, isOrderable } from '@/lib/store';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Order',
  description: 'Pre-order baked goods and plants for pickup or shipping, or send a wholesale enquiry.',
  alternates: { canonical: `${SITE_URL}/order` },
};

export const dynamic = 'force-dynamic';

export default async function OrderPage() {
  const [products, windowState, orderWindow] = await Promise.all([
    getProducts(),
    getEffectiveWindowState(),
    getOrderWindow(),
  ]);

  return (
    <>
      <div className="shell">
        <Nav current="/order" />
      </div>
      <main id="main">
        <div className="shell z">
          <header className="page-head">
            <span className="typed">One form</span>
            <h1>Order</h1>
            <p className="dek">
              {windowState.state === 'open' && 'This window is open. Add what you want below.'}
              {windowState.state === 'closed' &&
                'This window is closed right now — by-arrangement bookings, wholesale and café enquiries still go through below.'}
              {windowState.state === 'sold-out' &&
                "This window has sold out — by-arrangement bookings and wholesale enquiries still go through below, and we'll open again next week."}
            </p>
          </header>

          <div style={{ maxWidth: 640 }}>
            <OrderForm
              products={products.filter(isOrderable)}
              byArrangement={products.filter((p) => !isOrderable(p))}
              pickupDaysDefault={orderWindow.pickupDays}
              windowOpen={windowState.state === 'open'}
            />
          </div>
        </div>
      </main>
      <div className="shell">
        <Footer />
      </div>
    </>
  );
}
