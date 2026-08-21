import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { getKitchenRecord, getProducts } from '@/lib/store';
import { SITE_URL, SITE_NAME } from '@/lib/site';

// Owner-editable content: must read the database on each request rather
// than being frozen into the build. See app/page.tsx for the full note.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kitchen Record',
  description:
    "What's never in this building — gluten, mammal-derived ingredients, artificial colour and flavour — plus every ingredient, allergen and cross-contact detail, ingredient by ingredient. Missouri cottage food law RSMo 196.298.",
  alternates: { canonical: `${SITE_URL}/kitchen-record` },
  openGraph: {
    title: `${SITE_NAME} — Kitchen Record`,
    description: "What's never in this building, and the full ingredient list for every product.",
    url: `${SITE_URL}/kitchen-record`,
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} — Kitchen Record`,
    description: "What's never in this building, and the full ingredient list for every product.",
  },
};

function PlaceholderFlag({ text }: { text: string }) {
  return (
    <div className="placeholder-flag">
      <span className="typed">Awaiting content from owner</span>
      {text}
    </div>
  );
}

export default async function KitchenRecordPage() {
  const [record, allProducts] = await Promise.all([
    getKitchenRecord(),
    getProducts({ includeInactive: true }),
  ]);
  // This section is the food allergen record kept under Missouri cottage food
  // law. Houseplants have no ingredient list, so listing them here only ever
  // produced a placeholder asking the owner for one that cannot exist.
  const products = allProducts.filter((p) => p.type !== 'plant');

  return (
    <>
      <div className="shell">
        <Nav current="/kitchen-record" />
      </div>

      <main id="main">
        <div className="shell z">
          <header className="page-head">
            <span className="typed">Kitchen record</span>
            <h1>What Has Never Been In This Building</h1>
            <p className="dek">
              This is the page to send to a support group chat. It states plainly what this kitchen never
              uses, why eggs are the exception, what allergens do appear in some items, how cross-contact
              is handled, and the full ingredient list for every product this business sells.
            </p>
          </header>

          <section className="content-block" aria-labelledby="never-heading">
            <h2 id="never-heading" className="display" style={{ fontSize: 22, marginBottom: 14 }}>
              Never in this building
            </h2>
            <dl style={{ margin: 0 }}>
              {record.neverInBuilding.map((item) => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <dt className="typed" style={{ color: 'var(--rust)', marginBottom: 4 }}>
                    {item.label}
                  </dt>
                  <dd style={{ margin: 0, fontSize: 15 }}>{item.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="content-block" aria-labelledby="eggs-heading">
            <h2 id="eggs-heading" className="display" style={{ fontSize: 22, marginBottom: 14 }}>
              Why eggs are the exception
            </h2>
            <p style={{ fontSize: 15 }}>{record.eggsStatement.text}</p>
          </section>

          <section className="content-block" aria-labelledby="present-heading">
            <h2 id="present-heading" className="display" style={{ fontSize: 22, marginBottom: 14 }}>
              Allergens present in some items
            </h2>
            {record.presentAllergens.placeholder ? (
              <PlaceholderFlag text={record.presentAllergens.text} />
            ) : (
              <p style={{ fontSize: 15 }}>{record.presentAllergens.text}</p>
            )}
          </section>

          <section className="content-block" aria-labelledby="cross-heading">
            <h2 id="cross-heading" className="display" style={{ fontSize: 22, marginBottom: 14 }}>
              How cross-contact is handled
            </h2>
            {record.crossContact.placeholder ? (
              <PlaceholderFlag text={record.crossContact.text} />
            ) : (
              <p style={{ fontSize: 15 }}>{record.crossContact.text}</p>
            )}
          </section>

          <section className="content-block" aria-labelledby="legal-heading">
            <h2 id="legal-heading" className="display" style={{ fontSize: 22, marginBottom: 14 }}>
              Legal basis of operation
            </h2>
            <p style={{ fontSize: 15 }}>{record.legalBasis.text}</p>
          </section>

          <section aria-labelledby="ingredients-heading" style={{ margin: '56px 0' }}>
            <div className="marker">
              <h2 id="ingredients-heading">Ingredients, product by product</h2>
              <span className="typed">{products.length}</span>
            </div>

            {record.ingredientsIntro.placeholder && <PlaceholderFlag text={record.ingredientsIntro.text} />}

            <div style={{ marginTop: 24 }}>
              {products.map((p) => (
                <article key={p.id} className="content-block" style={{ marginLeft: 0, marginRight: 0 }}>
                  <div className="typed" style={{ color: 'var(--rust)', marginBottom: 6 }}>
                    {p.id}
                  </div>
                  <h3 style={{ fontSize: 20, marginBottom: 8 }}>{p.name}</h3>
                  {p.allergens && (
                    <p style={{ fontSize: 14 }}>
                      <strong>Contains:</strong> {p.allergens}
                    </p>
                  )}
                  {p.ingredients ? (
                    <p style={{ fontSize: 14 }}>{p.ingredients}</p>
                  ) : (
                    <PlaceholderFlag text="[Owner to supply: full ingredient list, ingredient by ingredient, for this product.]" />
                  )}
                </article>
              ))}
            </div>
          </section>

          <p className="no-print" style={{ marginBottom: 60 }}>
            <Link href="/order" className="btn btn-outline">
              Ready to order →
            </Link>
          </p>
        </div>
      </main>

      <div className="shell">
        <Footer />
      </div>
    </>
  );
}
