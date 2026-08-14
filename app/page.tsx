import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import SpecimenCard from '@/components/SpecimenCard';
import EmailSignup from '@/components/EmailSignup';
import OrderWindowBanner from '@/components/OrderWindowBanner';
import StandStatusBlock from '@/components/StandStatusBlock';
import { getProducts, getEffectiveWindowState, getStandStatus, getCareGuides } from '@/lib/store';
import { determinationFor } from '@/lib/determinations';

export default async function HomePage() {
  const [products, windowState, stand, guides] = await Promise.all([
    getProducts(),
    getEffectiveWindowState(),
    getStandStatus(),
    getCareGuides(),
  ]);

  const bakery = products.filter((p) => p.type === 'bakery' || p.type === 'occasion');
  const plants = products.filter((p) => p.type === 'plant');

  return (
    <>
      <div className="shell">
        <div className="holes" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <i key={i} />
          ))}
        </div>
        <Nav current="/" />
      </div>

      <main id="main">
        <div className="shell z">
          <header className="hero">
            <div className="filed typed">
              <span>Sullivan · Franklin Co. · Missouri</span>
              <span>Sheet 01</span>
            </div>

            <h1 className="big">
              <span className="split">Winter</span>
              <span className="split">garten</span>
            </h1>

            <p className="strapline">
              A small bakery and a small collection of plants, kept under one roof on Highway H.
            </p>

            <OrderWindowBanner state={windowState} />

            <div className="order-line">
              <p>Gluten-free, mammal-free, real eggs. {stand.hours}</p>
              <Link href="/order" className="btn">
                Place an order
              </Link>
            </div>
          </header>

          <div className="marker">
            <h2>From the oven</h2>
            <span className="typed">{bakery.length}</span>
          </div>
          <div className="plates">
            {bakery.map((p) => (
              <SpecimenCard key={p.id} product={p} determination={determinationFor(p.imageNote)} />
            ))}
          </div>

          <div className="marker">
            <h2>From the bench</h2>
            <span className="typed">Rooted in soil</span>
          </div>
          <div className="plates">
            {plants.map((p) => (
              <SpecimenCard key={p.id} product={p} determination={determinationFor(p.imageNote)} />
            ))}
          </div>

          <div className="lower">
            <StandStatusBlock stand={stand} />

            <section className="notes" aria-labelledby="notes-heading">
              <span className="typed" style={{ color: 'var(--rust)' }} id="notes-heading">
                Growing notes
              </span>
              <ul>
                {guides.slice(0, 4).map((g, i) => (
                  <li key={g.slug}>
                    <Link href={`/care-guides/${g.slug}`}>
                      <span className="n">{String(i + 1).padStart(2, '0')}</span>
                      <span className="t">{g.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="record" aria-labelledby="record-heading">
              <span className="typed">Kitchen record</span>
              <h2 id="record-heading">What has never been in this building</h2>
              <dl>
                <div>
                  <dt>Gluten</dt>
                  <dd>Never on the premises</dd>
                </div>
                <div>
                  <dt>Mammal</dt>
                  <dd>No dairy, gelatin, tallow or rendered fat</dd>
                </div>
                <div>
                  <dt>Artificial</dt>
                  <dd>No colour, no flavour</dd>
                </div>
                <div>
                  <dt>Eggs</dt>
                  <dd>Real, and the reason any of this works</dd>
                </div>
              </dl>
              <Link className="link" href="/kitchen-record">
                Read the full record
              </Link>
            </section>

            <section className="register" id="register" aria-labelledby="register-heading">
              <span className="typed" style={{ color: 'var(--rust)' }}>
                Sunday note
              </span>
              <h2 id="register-heading">One email a week</h2>
              <p>What&apos;s baking, what&apos;s rooted, whether the stand is open. Nothing else, and nothing sold on.</p>
              <EmailSignup source="homepage" />
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
