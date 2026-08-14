'use client';

import { useState } from 'react';
import type { KitchenRecordContent } from '@/lib/types';

export default function KitchenRecordEditor({ initial, initialStory }: { initial: KitchenRecordContent; initialStory: string }) {
  const [record, setRecord] = useState(initial);
  const [story, setStory] = useState(initialStory);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function updateNever(i: number, field: 'label' | 'detail', value: string) {
    const next = [...record.neverInBuilding];
    next[i] = { ...next[i], [field]: value, placeholder: false };
    setRecord({ ...record, neverInBuilding: next });
  }

  function updateText(key: 'eggsStatement' | 'presentAllergens' | 'crossContact' | 'legalBasis' | 'ingredientsIntro', value: string) {
    setRecord({ ...record, [key]: { text: value, placeholder: false } });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/kitchen-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record, story }),
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
    <form onSubmit={save} className="admin-card" id="kitchen-record">
      <h2>Kitchen record &amp; story</h2>
      <p style={{ fontSize: 13, marginBottom: 16 }}>
        This is the page a skeptical customer pastes into a group chat. Get it right, and don&apos;t leave
        anything half-written — the site marks empty sections as awaiting content.
      </p>

      <h3 style={{ fontSize: 15, marginBottom: 8 }}>Never in this building</h3>
      {record.neverInBuilding.map((item, i) => (
        <div className="form-row" key={i} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={item.label}
            onChange={(e) => updateNever(i, 'label', e.target.value)}
            style={{ maxWidth: 140 }}
            aria-label={`Label ${i + 1}`}
          />
          <input
            type="text"
            value={item.detail}
            onChange={(e) => updateNever(i, 'detail', e.target.value)}
            aria-label={`Detail ${i + 1}`}
          />
        </div>
      ))}

      <div className="form-row">
        <label htmlFor="kr-eggs">Why eggs are the exception</label>
        <textarea id="kr-eggs" value={record.eggsStatement.text} onChange={(e) => updateText('eggsStatement', e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="kr-present">Allergens present in some items</label>
        <textarea id="kr-present" value={record.presentAllergens.text} onChange={(e) => updateText('presentAllergens', e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="kr-cross">Cross-contact handling</label>
        <textarea id="kr-cross" value={record.crossContact.text} onChange={(e) => updateText('crossContact', e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="kr-legal">Legal basis</label>
        <textarea id="kr-legal" value={record.legalBasis.text} onChange={(e) => updateText('legalBasis', e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="kr-ingredients-intro">Ingredients section intro</label>
        <textarea id="kr-ingredients-intro" value={record.ingredientsIntro.text} onChange={(e) => updateText('ingredientsIntro', e.target.value)} />
      </div>
      <p className="hint" style={{ marginBottom: 16 }}>
        Per-product ingredient lists are edited on the Products section below (not yet exposed here — edit
        via the database or extend the admin form).
      </p>

      <h3 style={{ fontSize: 15, marginBottom: 8 }}>Story page</h3>
      <div className="form-row">
        <label htmlFor="kr-story">Story</label>
        <textarea id="kr-story" rows={8} value={story} onChange={(e) => setStory(e.target.value)} />
      </div>

      <button type="submit" className="btn" disabled={saving}>
        {saving ? 'Saving…' : 'Save kitchen record & story'}
      </button>
      {msg && <p className={msg.kind === 'success' ? 'status-msg-success' : 'status-msg-error'}>{msg.text}</p>}
    </form>
  );
}
