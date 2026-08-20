import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ProseBody from '@/components/ProseBody';
import { getCareGuide, getCareGuides, getProduct } from '@/lib/store';
import { SITE_URL, SITE_NAME } from '@/lib/site';

// Owner-editable content: must read the database on each request rather
// than being frozen into the build. See app/page.tsx for the full note.
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const guides = await getCareGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getCareGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.dek,
    alternates: { canonical: `${SITE_URL}/care-guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.dek,
      type: 'article',
      publishedTime: guide.createdAt,
      modifiedTime: guide.updatedAt,
    },
  };
}

export default async function CareGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getCareGuide(slug);
  if (!guide || !guide.published) notFound();

  const relatedProduct = guide.plantAccession ? await getProduct(guide.plantAccession) : null;
  const isDraft = guide.body.trim().startsWith('DRAFT');
  const body = isDraft ? guide.body.replace(/^DRAFT[^\n]*\n\n?/, '') : guide.body;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.dek,
    datePublished: guide.createdAt,
    dateModified: guide.updatedAt,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: `${SITE_URL}/care-guides/${guide.slug}`,
  };

  return (
    <>
      <div className="shell">
        <Nav current="/care-guides" />
      </div>
      <main id="main">
        <div className="shell z">
          <header className="page-head">
            <span className="typed">
              <Link href="/care-guides">Growing notes</Link>
            </span>
            <h1>{guide.title}</h1>
            <p className="dek">{guide.dek}</p>
            {isDraft && (
              <p className="placeholder-flag" style={{ maxWidth: '60ch', marginTop: 16 }}>
                <span className="typed">Draft</span>
                Written as a working example of this guide format â€” not yet reviewed in the owner&apos;s
                own words.
              </p>
            )}
          </header>

          <article className="prose">
            <ProseBody text={body} />
          </article>

          {relatedProduct && (
            <p style={{ margin: '40px 0 60px' }}>
              <Link href="/order" className="btn btn-outline">
                {relatedProduct.name} is {relatedProduct.priceCents > 0 ? `$${(relatedProduct.priceCents / 100).toFixed(0)}` : 'available'} â†’
              </Link>
            </p>
          )}
        </div>
      </main>
      <div className="shell">
        <Footer />
      </div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
    </>
  );
}
