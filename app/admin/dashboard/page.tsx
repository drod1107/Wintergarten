import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import WindowEditor from '@/components/admin/WindowEditor';
import StandEditor from '@/components/admin/StandEditor';
import ProductsEditor from '@/components/admin/ProductsEditor';
import GuidesEditor from '@/components/admin/GuidesEditor';
import KitchenRecordEditor from '@/components/admin/KitchenRecordEditor';
import SubscribersImport from '@/components/admin/SubscribersImport';
import LogoutButton from '@/components/admin/LogoutButton';
import { isAdminRequest } from '@/lib/admin-guard';
import {
  getOrderWindow,
  getStandStatus,
  getProducts,
  getCareGuides,
  getKitchenRecord,
  getStory,
  getOrders,
  getSubscriberCount,
  isDemoMode,
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  if (!(await isAdminRequest())) redirect('/admin');

  const [orderWindow, stand, products, guides, kitchenRecord, story, orders, subscriberCount] =
    await Promise.all([
      getOrderWindow(),
      getStandStatus(),
      getProducts({ includeInactive: true }),
      getCareGuides({ includeUnpublished: true }),
      getKitchenRecord(),
      getStory(),
      getOrders(),
      getSubscriberCount(),
    ]);

  return (
    <>
      <div className="shell">
        <Nav />
      </div>
      <main id="main">
        <div className="admin-shell">
          <nav className="admin-nav" aria-label="Admin sections">
            <a href="#window">Window</a>
            <a href="#stand">Stand</a>
            <a href="#products">Products</a>
            <a href="#guides">Guides</a>
            <a href="#kitchen-record">Kitchen record</a>
            <a href="#orders">Orders</a>
            <a href="#subscribers">Email list</a>
            <LogoutButton />
          </nav>

          {isDemoMode() && (
            <div className="placeholder-flag" style={{ marginBottom: 24 }}>
              <span className="typed">Demo mode</span>
              No database connected — every save below succeeds in the UI but nothing persists. Attach
              Postgres (see SETUP.md) to make this real.
            </div>
          )}

          <WindowEditor initial={orderWindow} />
          <StandEditor initial={stand} />
          <ProductsEditor products={products} />
          <GuidesEditor guides={guides} />
          <KitchenRecordEditor initial={kitchenRecord} initialStory={story} />

          <section className="admin-card" id="orders">
            <h2>Orders</h2>
            <p style={{ fontSize: 13, marginBottom: 14 }}>
              {orders.length} order{orders.length === 1 ? '' : 's'} recorded.{' '}
              <a href="/api/admin/orders/export" className="record-link">
                Export CSV →
              </a>
            </p>
            {orders.length > 0 && (
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Kind</th>
                      <th>Branch</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 25).map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</td>
                        <td>{o.name}</td>
                        <td>{o.kind}</td>
                        <td>{o.branch}</td>
                        <td>${(o.chargeCents / 100).toFixed(2)}</td>
                        <td>{o.stripeStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-card" id="subscribers">
            <h2>Email list</h2>
            <p style={{ fontSize: 13, marginBottom: 14 }}>
              {subscriberCount} subscriber{subscriberCount === 1 ? '' : 's'}.{' '}
              <a href="/api/admin/subscribers" className="record-link">
                Export CSV →
              </a>
            </p>
            <SubscribersImport />
          </section>
        </div>
      </main>
      <div className="shell">
        <Footer />
      </div>
    </>
  );
}
