'use client';

import { useId, useState } from 'react';
import type { CareGuide } from '@/lib/types';

type Draft = Omit<CareGuide, 'createdAt' | 'updatedAt'>;

function emptyDraft(): Draft {
  return { slug: '', title: '', plantAccession: '', dek: '', body: '', published: true };
}

function GuideForm({ initial, onSaved }: { initial: Draft; onSaved: (slug: string) => void }) {
  const [draft, setDraft] = useState(initial);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = !initial.slug;
  const uid = useId();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      setMsg({ kind: 'success', text: 'Saved.' });
      onSaved(data.slug);
      if (isNew) setDraft(emptyDraft());
    } catch (err: any) {
      setMsg({ kind: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft.slug || !confirm(`Delete "${draft.title}"?`)) return;
    await fetch(`/api/admin/guides?slug=${encodeURIComponent(draft.slug)}`, { method: 'DELETE' });
    onSaved('');
  }

  return (
    <form onSubmit={save} style={{ borderTop: '1px solid var(--hair)', paddingTop: 16, marginTop: 16 }}>
      <div className="form-row">
        <label htmlFor={`${uid}-title`}>Title</label>
        <input
          id={`${uid}-title`}
          type="text"
          required
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value, slug: isNew ? draft.slug : draft.slug })}
        />
      </div>
      {isNew && (
        <div className="form-row">
          <label htmlFor={`${uid}-slug`}>URL slug</label>
          <input
            id={`${uid}-slug`}
            type="text"
            placeholder="auto-generated-from-title-if-blank"
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          />
        </div>
      )}
      <div className="form-row">
        <label htmlFor={`${uid}-dek`}>Dek (one-line summary)</label>
        <input id={`${uid}-dek`} type="text" value={draft.dek} onChange={(e) => setDraft({ ...draft, dek: e.target.value })} />
      </div>
      <div className="form-row">
        <label htmlFor={`${uid}-accession`}>Related product accession (optional)</label>
        <input
          id={`${uid}-accession`}
          type="text"
          placeholder="WG·P·001"
          value={draft.plantAccession}
          onChange={(e) => setDraft({ ...draft, plantAccession: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label htmlFor={`${uid}-body`}>Body</label>
        <textarea id={`${uid}-body`} rows={8} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
      </div>
      <div className="toggle-row form-row">
        <label htmlFor={`${uid}-published`} style={{ marginBottom: 0 }}>Published</label>
        <input
          id={`${uid}-published`}
          type="checkbox"
          checked={draft.published}
          onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
          style={{ width: 18, height: 18 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Add guide' : 'Save changes'}
        </button>
        {!isNew && (
          <button type="button" className="btn btn-outline" onClick={remove}>
            Delete
          </button>
        )}
      </div>
      {msg && <p className={msg.kind === 'success' ? 'status-msg-success' : 'status-msg-error'}>{msg.text}</p>}
    </form>
  );
}

export default function GuidesEditor({ guides }: { guides: CareGuide[] }) {
  function handleSaved() {
    window.location.reload();
  }

  return (
    <div className="admin-card" id="guides">
      <h2>Care guides</h2>
      <p style={{ fontSize: 13 }}>{guides.length} guide{guides.length === 1 ? '' : 's'}. Saving reloads this section.</p>

      <details>
        <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', fontSize: 13, margin: '14px 0' }}>
          Add a new guide
        </summary>
        <GuideForm initial={emptyDraft()} onSaved={handleSaved} />
      </details>

      {guides.map((g) => (
        <details key={g.slug}>
          <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', fontSize: 13, margin: '14px 0' }}>
            {g.title} {!g.published && '(unpublished)'}
          </summary>
          <GuideForm initial={g} onSaved={handleSaved} />
        </details>
      ))}
    </div>
  );
}
