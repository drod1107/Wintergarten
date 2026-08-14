import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { isAdminRequest } from '@/lib/admin-guard';
import { isAdminConfigured } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdminRequest()) redirect('/admin/dashboard');

  return (
    <>
      <div className="shell">
        <Nav />
      </div>
      <main id="main">
        <div className="shell z" style={{ paddingTop: 20 }}>
          {!isAdminConfigured() && (
            <div className="placeholder-flag" style={{ maxWidth: 420, marginBottom: 20 }}>
              <span className="typed">Not configured</span>
              Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET as environment variables to enable admin login.
            </div>
          )}
          <AdminLoginForm />
        </div>
      </main>
      <div className="shell">
        <Footer />
      </div>
    </>
  );
}
