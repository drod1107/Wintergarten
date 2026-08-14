'use client';

import { useState } from 'react';
import type { OrderWindow } from '@/lib/types';

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function WindowEditor({ initial }: { initial: OrderWindow }) {
  const [status, setStatus] = useState(initial.status);
  const [closesAt, setClosesAt] = useState(toLocalInputValue(initial.closesAt));
  const [pickupDays, setPickupDays] = useState(initial.pickupDays);
  const [notes, setNotes] = useState(initial.notes);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
          opensAt: null,
          pickupDays,
          notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed.');
      setMsg({ kind: 'success', text: 'Saved.' });
    } catch (err: any) {
      setMsg({ kind: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="admin-card" id="window">
      <h2>Order window</h2>
      <div className="radio-group" role="radiogroup" aria-label="Window status" style={{ marginBottom: 16 }}>
        {(['open', 'closed', 'scheduled'] as const).map((s) => (
          <label key={s}>
            <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} />
            {s === 'open' ? 'Open' : s === 'closed' ? 'Closed' : 'Scheduled'}
          </label>
        ))}
      </div>
      <div className="form-row">
        <label htmlFor="closes-at">Closes at</label>
        <input id="closes-at" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        <p className="hint">Leave blank for no automatic close time.</p>
      </div>
      <div className="form-row">
        <label htmlFor="pickup-days">Pickup days (shown to customers)</label>
        <input id="pickup-days" type="text" value={pickupDays} onChange={(e) => setPickupDays(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="window-notes">Notes shown when closed</label>
        <input id="window-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button type="submit" className="btn" disabled={saving}>
        {saving ? 'Saving…' : 'Save window'}
      </button>
      {msg && <p className={msg.kind === 'success' ? 'status-msg-success' : 'status-msg-error'}>{msg.text}</p>}
    </form>
  );
}
