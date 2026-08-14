import Link from 'next/link';
import type { Product } from '@/lib/types';
import { specimenIcon } from './specimen-icons';
import { stockPhotoFor } from '@/lib/stock-photos';

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
  const isOccasion = product.type === 'occasion';
  const soldOut = product.capacity !== null && product.orderedCount >= product.capacity;
  const photo = stockPhotoFor(product.imageNote);

  return (
    <article className={`plate${isOccasion ? ' occasion' : ''}${soldOut ? ' sold-out' : ''}`}>
      <div className="tab typed">
        <span>{product.id}</span>
        <span>{product.specs[2]?.value || product.specs[0]?.value || ''}</span>
      </div>
      <div className="frame">
        {photo ? (
          <img src={photo.url} alt={`${product.name}, ${product.subtitle}`} loading="lazy" decoding="async" />
        ) : (
          specimenIcon(product.imageNote, isOccasion)
        )}
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
          <dd className="fig">{formatPrice(product.priceCents, product.priceNote)}</dd>
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
