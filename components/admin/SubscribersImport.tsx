'use client';

import { useState } from 'react';

export default function SubscribersImport() {
  const [emails, setEmails] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      setMsg(`Added ${data.added}, skipped ${data.skipped} (duplicates or invalid).`);
      setEmails('');
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="form-row">
        <label htmlFor="bulk-emails">Paste addresses — one per line, or comma-separated</label>
        <textarea
          id="bulk-emails"
          rows={5}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder={'jane@example.com\njohn@example.com'}
        />
      </div>
      <button type="submit" className="btn" disabled={saving || !emails.trim()}>
        {saving ? 'Importing…' : 'Import list'}
      </button>
      {msg && <p className="status-msg-success">{msg}</p>}
    </form>
  );
}
