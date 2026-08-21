import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getCareGuides } from '@/lib/store';
import { SITE_URL } from '@/lib/site';

// Owner-editable content: must read the database on each request rather
// than being frozen into the build. See app/page.tsx for the full note.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Growing Notes — Houseplant Care Guides',
  description:
    'Care guides for pothos, philodendron, ZZ plant, monstera, spider plant and aloe — plus propagation and taking cuttings. Written to be useful whether or not you ever buy anything.',
  alternates: { canonical: `${SITE_URL}/care-guides` },
};

export default async function CareGuidesIndex() {
  const guides = await getCareGuides();

  return (
    <>
      <div className="shell">
        <Nav current="/care-guides" />
      </div>
      <main id="main">
        <div className="shell z">
          <header className="page-head">
            <span className="typed">Growing notes</span>
            <h1>What We&apos;ve Learned Growing These</h1>
            <p className="dek">
              Written for whoever landed here from a search, whether or not they ever buy a plant.
            </p>
          </header>

          <section className="notes" style={{ marginLeft: 0, maxWidth: 640 }}>
            <ul>
              {guides.map((g, i) => (
                <li key={g.slug}>
                  <Link href={`/care-guides/${g.slug}`}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="t" style={{ display: 'block' }}>
                        {g.title}
                      </span>
                      <span style={{ fontSize: 13, opacity: 0.8 }}>{g.dek}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <div className="shell">
        <Footer />
      </div>
    </>
  );
}
