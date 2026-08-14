import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { STOCK_PHOTOS } from '@/lib/stock-photos';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Photo Credits',
  robots: { index: false },
  alternates: { canonical: `${SITE_URL}/photo-credits` },
};

export default function PhotoCreditsPage() {
  const entries = Object.entries(STOCK_PHOTOS);

  return (
    <>
      <div className="shell">
        <Nav />
      </div>
      <main id="main">
        <div className="shell z">
          <header className="page-head">
            <span className="typed">Sourcing</span>
            <h1>Photo Credits</h1>
            <p className="dek">
              Every product photo on this site right now is placeholder stock imagery, standing in for
              the owner&apos;s own photography. Sourced from Wikimedia Commons under open licenses — follow
              each source link for the photographer&apos;s exact credit and license terms.
            </p>
          </header>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: 640 }}>
            {entries.map(([key, p]) => (
              <li key={key} style={{ borderTop: '1px solid var(--hair)', padding: '14px 0' }}>
                <div className="typed" style={{ color: 'var(--rust)', marginBottom: 4 }}>
                  {key}
                </div>
                <div style={{ marginBottom: 4 }}>{p.description}</div>
                <a href={p.sourcePage} className="record-link" target="_blank" rel="noopener noreferrer">
                  Source & license on Wikimedia Commons →
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <div className="shell">
        <Footer />
      </div>
    </>
  );
}
