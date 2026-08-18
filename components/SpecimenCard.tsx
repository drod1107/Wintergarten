import Link from 'next/link';
import type { Product } from '@/lib/types';
import { TIER_LABEL } from '@/lib/types';

function formatPrice(cents: number, note: string) {
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return (
    <>
      ${dollars} {note && <span style={{ fontSize: 12, fontWeight: 400 }}>{note}</span>}
    </>
  );
}

export default function SpecimenCard({
  product,
  determination,
}: {
  product: Product;
  determination: string;
}) {
  const isReservat = product.type === 'reservat';
  const soldOut = product.capacity !== null && product.orderedCount >= product.capacity;
  const tier = TIER_LABEL[product.type];

  return (
    <article className={`plate${isReservat ? ' reservat' : ''}${soldOut ? ' sold-out' : ''}`}>
      <div className="tab typed">
        <span>{product.id}</span>
        <span>{tier || product.specs[0]?.value || ''}</span>
      </div>
      <div className="frame">
        {/* Drawn in-house; see public/images. Decorative — the name and specs
            below carry the meaning, so it stays out of the accessibility tree. */}
        <img src={`/images/${product.imageNote}.svg`} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <span className="det">{determination}</span>
      </div>
      {soldOut && <span className="badge">Sold out this window</span>}
      <h3>{product.name}</h3>
      <span className="binom">{product.subtitle}</span>
      <dl className="spec">
        {product.specs.slice(0, 3).map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
        <div>
          <dt>Price</dt>
          <dd className="fig">
            {product.pricePending ? (
              <span style={{ fontSize: 13, fontWeight: 400 }}>Coming soon</span>
            ) : (
              formatPrice(product.priceCents, product.priceNote)
            )}
          </dd>
        </div>
      </dl>
      {product.allergens && (
        <p style={{ fontSize: 12.5, marginTop: 10 }}>
          <strong>Also contains:</strong> {product.allergens}
        </p>
      )}
      <Link href="/kitchen-record" className="record-link">
        Read the kitchen record →
      </Link>
    </article>
  );
}
