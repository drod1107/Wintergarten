'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';

type BranchInfo =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'pickup'; nearest: string; miles: number }
  | { status: 'shipping'; nearest: string; miles: number }
  | { status: 'unresolved' };

export default function OrderForm({
  products,
  byArrangement,
  pickupDaysDefault,
  windowOpen,
}: {
  products: Product[];
  // Reservat items and anything without a settled price: listed so nobody
  // wonders where they went, but arranged by conversation instead of bought.
  byArrangement: Product[];
  pickupDaysDefault: string;
  windowOpen: boolean;
}) {
  const [kind, setKind] = useState<'order' | 'wholesale'>(windowOpen ? 'order' : 'wholesale');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [branch, setBranch] = useState<BranchInfo>({ status: 'idle' });
  const [manualBranch, setManualBranch] = useState<'pickup' | 'shipping' | null>(null);
  const [pickupDay, setPickupDay] = useState(pickupDaysDefault);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [wholesaleBusiness, setWholesaleBusiness] = useState('');
  const [wholesaleQty, setWholesaleQty] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkAddress() {
    if (address.trim().length < 5) {
      setBranch({ status: 'idle' });
      return;
    }
    setBranch({ status: 'checking' });
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      const b = data.branch;
      if (b.branch === 'pickup' || b.branch === 'shipping') {
        setBranch({ status: b.branch, nearest: b.nearest.name, miles: Math.round(b.nearest.miles * 10) / 10 });
      } else {
        setBranch({ status: 'unresolved' });
      }
    } catch {
      setBranch({ status: 'unresolved' });
    }
  }

  const effectiveBranch: 'pickup' | 'shipping' | null =
    branch.status === 'pickup' || branch.status === 'shipping' ? branch.status : manualBranch;

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, qty })),
    [cart]
  );

  const subtotalCents = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      const p = products.find((pp) => pp.id === line.id);
      return sum + (p ? p.priceCents * line.qty : 0);
    }, 0);
  }, [cartLines, products]);

  function setQty(id: string, qty: number) {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (kind === 'wholesale') {
      if (!name || !email) {
        setError('Name and email are required.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, name, email, phone, wholesaleBusiness, wholesaleQty, notes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong.');
        window.location.href = data.redirect;
      } catch (err: any) {
        setError(err.message);
        setSubmitting(false);
      }
      return;
    }

    if (!name || !email) {
      setError('Name and email are required.');
      return;
    }
    if (cartLines.length === 0) {
      setError('Add at least one item to your order.');
      return;
    }
    if (address.trim().length >= 5 && !effectiveBranch) {
      setError('We couldn’t confirm that address automatically — choose pickup or shipping below.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'order',
          name,
          email,
          phone,
          address,
          manualBranch,
          pickupDay,
          items: cartLines,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.redirect) {
        window.location.href = data.redirect;
      }
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-section">
        <h2>What is this?</h2>
        <p className="section-note">One form handles a pre-order, an out-of-area enquiry, and wholesale.</p>
        <div className="radio-group" role="radiogroup" aria-label="Order type">
          <label>
            <input
              type="radio"
              name="kind"
              checked={kind === 'order'}
              onChange={() => setKind('order')}
              disabled={!windowOpen}
            />
            Pre-order for pickup or shipping{!windowOpen && ' (window closed)'}
          </label>
          <label>
            <input type="radio" name="kind" checked={kind === 'wholesale'} onChange={() => setKind('wholesale')} />
            Wholesale or café enquiry
          </label>
        </div>
      </div>

      <div className="form-section">
        <h2>Who to reach</h2>
        <div className="form-row">
          <label htmlFor="of-name">Name</label>
          <input
            id="of-name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="of-email">Email</label>
          <input
            id="of-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="of-phone">Phone</label>
          <input
            id="of-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      {kind === 'order' ? (
        <>
          <div className="form-section">
            <h2>Where it's going</h2>
            <p className="section-note">
              Within 20 miles of Washington, Rolla, Sullivan or St. Louis, it&apos;s pickup. Further out, it
              ships. Typing an address never loses anything else on this form — correct it as many times as
              you need.
            </p>
            <div className="form-row">
              <label htmlFor="of-address">Address</label>
              <input
                id="of-address"
                type="text"
                autoComplete="street-address"
                placeholder="Street, city, state"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setBranch({ status: 'idle' });
                  setManualBranch(null);
                }}
                onBlur={checkAddress}
              />
              <p className="hint">We check this against Sullivan, Washington, Rolla and St. Louis — nothing is stored until you submit.</p>
            </div>

            {branch.status === 'checking' && <p className="hint">Checking distance…</p>}

            {branch.status === 'pickup' && (
              <div className="branch-banner pickup">
                <span className="typed">Pickup available</span>
                {branch.miles} miles from {branch.nearest}. Pickup is {pickupDaysDefault || 'by arrangement'}.
              </div>
            )}

            {branch.status === 'shipping' && (
              <div className="branch-banner">
                <span className="typed">This one ships</span>
                {branch.nearest} is {branch.miles} miles away — outside our 20-mile pickup range, so this order
                ships instead.
              </div>
            )}

            {branch.status === 'unresolved' && (
              <div className="branch-banner">
                <span className="typed">Couldn&apos;t confirm that address</span>
                <p style={{ marginBottom: 10 }}>Choose how you&apos;d like this order to reach you:</p>
                <div className="radio-group" role="radiogroup" aria-label="Delivery method">
                  <label>
                    <input
                      type="radio"
                      name="manual-branch"
                      checked={manualBranch === 'pickup'}
                      onChange={() => setManualBranch('pickup')}
                    />
                    Pickup
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="manual-branch"
                      checked={manualBranch === 'shipping'}
                      onChange={() => setManualBranch('shipping')}
                    />
                    Shipping
                  </label>
                </div>
              </div>
            )}

            {effectiveBranch === 'pickup' && (
              <div className="form-row" style={{ marginTop: 14 }}>
                <label htmlFor="of-pickup-day">Pickup day</label>
                <input id="of-pickup-day" type="text" value={pickupDay} onChange={(e) => setPickupDay(e.target.value)} />
              </div>
            )}
          </div>

          <div className="form-section">
            <h2>What you'd like</h2>
            {products.map((p) => {
              const remaining = p.capacity === null ? null : Math.max(0, p.capacity - p.orderedCount);
              const soldOut = remaining !== null && remaining <= 0;
              const shipBlocked = effectiveBranch === 'shipping' && !p.ships;
              return (
                <div className="item-row" key={p.id}>
                  <div>
                    <div className="item-name">{p.name}</div>
                    <div className="item-price">
                      ${(p.priceCents / 100).toFixed(2)}
                      {soldOut && ' · sold out this window'}
                      {!soldOut && shipBlocked && " · doesn't ship — you'll be added to a waitlist"}
                    </div>
                  </div>
                  <div className="qty-input">
                    <button
                      type="button"
                      aria-label={`Fewer ${p.name}`}
                      onClick={() => setQty(p.id, (cart[p.id] || 0) - 1)}
                      disabled={soldOut}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={remaining ?? undefined}
                      value={cart[p.id] || 0}
                      aria-label={`Quantity of ${p.name}`}
                      onChange={(e) => setQty(p.id, Number(e.target.value) || 0)}
                      disabled={soldOut}
                    />
                    <button
                      type="button"
                      aria-label={`More ${p.name}`}
                      onClick={() => setQty(p.id, (cart[p.id] || 0) + 1)}
                      disabled={soldOut}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="order-total">
              <span className="typed">Total</span>
              <span className="amount">${(subtotalCents / 100).toFixed(2)}</span>
            </div>

            {byArrangement.length > 0 && (
              <div className="branch-banner" style={{ marginTop: 18 }}>
                <span className="typed">By arrangement</span>
                <p style={{ marginBottom: 0 }}>
                  {byArrangement.map((p) => p.name).join(', ')} —{' '}
                  {byArrangement.length === 1 ? 'this one is' : 'these are'} arranged directly rather
                  than added to a cart. Say what you have in mind in the notes below and we&apos;ll come
                  back to you.
                </p>
              </div>
            )}
          </div>

          <div className="form-section">
            <h2>Anything else</h2>
            <div className="form-row">
              <label htmlFor="of-notes">Notes</label>
              <textarea id="of-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </>
      ) : (
        <div className="form-section">
          <h2>Wholesale details</h2>
          <div className="form-row">
            <label htmlFor="of-business">Business name</label>
            <input
              id="of-business"
              type="text"
              autoComplete="organization"
              value={wholesaleBusiness}
              onChange={(e) => setWholesaleBusiness(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="of-qty">What you&apos;re looking for</label>
            <textarea
              id="of-qty"
              placeholder="Items, quantities, frequency"
              value={wholesaleQty}
              onChange={(e) => setWholesaleQty(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="of-notes-w">Notes</label>
            <textarea id="of-notes-w" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      )}

      {error && (
        <p className="form-row error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-block" disabled={submitting}>
        {submitting
          ? 'Sending…'
          : kind === 'wholesale'
          ? 'Send enquiry'
          : subtotalCents > 0
          ? 'Continue to payment'
          : 'Submit'}
      </button>
    </form>
  );
}
