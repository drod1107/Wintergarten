'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';

function ProductRow({ product }: { product: Product }) {
  const [price, setPrice] = useState((product.priceCents / 100).toFixed(2));
  const [active, setActive] = useState(product.active);
  const [capacity, setCapacity] = useState(product.capacity === null ? '' : String(product.capacity));
  const [msg, setMsg] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save() {
    setMsg('saving');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          priceCents: Math.round(parseFloat(price || '0') * 100),
          // Setting a real price is what resolves "coming soon" — otherwise
          // the item would stay unorderable after the owner had priced it.
          pricePending: product.pricePending && !(parseFloat(price || '0') > 0),
          active,
          capacity: capacity === '' ? null : Number(capacity),
        }),
      });
      if (!res.ok) throw new Error();
      setMsg('saved');
    } catch {
      setMsg('error');
    }
  }

  return (
    <tr>
      <td>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', fontSize: 13 }}>
          {product.name}
        </div>
        <div className="typed" style={{ color: 'var(--rust)' }}>
          {product.id}
          {product.pricePending && ' · price coming soon'}
        </div>
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ width: 80, border: '1px solid var(--hair)', padding: '4px 6px', fontSize: 14 }}
          aria-label={`Price for ${product.name}`}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          placeholder="∞"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          style={{ width: 64, border: '1px solid var(--hair)', padding: '4px 6px', fontSize: 14 }}
          aria-label={`Capacity for ${product.name}`}
        />
      </td>
      <td>{product.orderedCount}</td>
      <td>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          aria-label={`${product.name} active`}
          style={{ width: 18, height: 18 }}
        />
      </td>
      <td>
        <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 11 }} onClick={save}>
          {msg === 'saving' ? '…' : 'Save'}
        </button>
        {msg === 'saved' && <span className="status-msg-success" style={{ fontSize: 11, marginLeft: 6 }}>✓</span>}
        {msg === 'error' && <span className="status-msg-error" style={{ fontSize: 11, marginLeft: 6 }}>Failed</span>}
      </td>
    </tr>
  );
}

export default function ProductsEditor({ products }: { products: Product[] }) {
  return (
    <div className="admin-card" id="products">
      <h2>Products</h2>
      <p style={{ fontSize: 13, marginBottom: 14 }}>
        Price, batch capacity and whether an item is listed at all. Capacity resets when you open a new
        order window. An item marked &ldquo;price coming soon&rdquo; is shown on the site but can&apos;t
        be ordered — saving a price above zero makes it orderable.
      </p>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Price ($)</th>
              <th>Capacity</th>
              <th>Ordered</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
