'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';

function ProductRow({ product }: { product: Product }) {
  const [price, setPrice] = useState((product.priceCents / 100).toFixed(2));
  const [active, setActive] = useState(product.active);
  const [capacity, setCapacity] = useState(product.capacity === null ? '' : String(product.capacity));
  const [ingredients, setIngredients] = useState(product.ingredients ?? '');
  const [allergens, setAllergens] = useState(product.allergens ?? '');
  const [expanded, setExpanded] = useState(false);
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
          ingredients,
          allergens,
        }),
      });
      if (!res.ok) throw new Error();
      setMsg('saved');
    } catch {
      setMsg('error');
    }
  }

  const hasIngredientContent = ingredients.trim().length > 0;

  return (
    <>
      <tr>
        <td>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', fontSize: 13 }}>
            {product.name}
          </div>
          <div className="typed" style={{ color: 'var(--rust)' }}>
            {product.id}
            {product.pricePending && ' · price coming soon'}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{ fontSize: 11, marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', padding: 0, fontFamily: 'var(--font-mono)' }}
          >
            {expanded ? '▲ hide ingredients' : `▼ ingredients${hasIngredientContent ? '' : ' (empty)'}`}
          </button>
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
      {expanded && (
        <tr>
          <td colSpan={6} style={{ paddingTop: 0, paddingBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4, color: 'var(--rust)' }}>
                  Ingredients (shown on kitchen record page)
                </label>
                <textarea
                  rows={3}
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="Gluten-free flour blend, sugar, eggs…"
                  style={{ width: '100%', border: '1px solid var(--hair)', padding: '6px 8px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
                  aria-label={`Ingredients for ${product.name}`}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4, color: 'var(--rust)' }}>
                  Allergens (shown on product card and kitchen record)
                </label>
                <textarea
                  rows={2}
                  value={allergens}
                  onChange={(e) => setAllergens(e.target.value)}
                  placeholder="Eggs. Plant-based butter may contain soy."
                  style={{ width: '100%', border: '1px solid var(--hair)', padding: '6px 8px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
                  aria-label={`Allergens for ${product.name}`}
                />
              </div>
              <p style={{ fontSize: 11, margin: 0, opacity: 0.7 }}>
                Hit Save on the row above to write both fields to the database.
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
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
