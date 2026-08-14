'use client';

import { useState } from 'react';
import type { StandStatus } from '@/lib/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StandEditor({ initial }: { initial: StandStatus }) {
  const [isOpen, setIsOpen] = useState(initial.isOpen);
  const [hours, setHours] = useState(initial.hours);
  const [address, setAddress] = useState(initial.address);
  const [todayText, setTodayText] = useState(initial.todayText);
  const [hoursDayOfWeek, setHoursDayOfWeek] = useState(initial.hoursDayOfWeek);
  const [hoursOpensTime, setHoursOpensTime] = useState(initial.hoursOpensTime);
  const [hoursClosesTime, setHoursClosesTime] = useState(initial.hoursClosesTime);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/stand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen, hours, address, todayText, hoursDayOfWeek, hoursOpensTime, hoursClosesTime }),
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
    <form onSubmit={save} className="admin-card" id="stand">
      <h2>Farm stand status</h2>
      <div className="toggle-row form-row">
        <label htmlFor="stand-open" style={{ marginBottom: 0 }}>
          Open right now
        </label>
        <input id="stand-open" type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} style={{ width: 20, height: 20 }} />
      </div>
      <div className="form-row">
        <label htmlFor="stand-today">On the table today</label>
        <input id="stand-today" type="text" value={todayText} onChange={(e) => setTodayText(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="stand-hours">Hours (shown to customers)</label>
        <input id="stand-hours" type="text" value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="stand-address">Address</label>
        <input id="stand-address" type="text" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="stand-day">Structured hours (for Google/Maps)</label>
        <select id="stand-day" value={hoursDayOfWeek} onChange={(e) => setHoursDayOfWeek(e.target.value)}>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row" style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="opens-time">Opens</label>
          <input id="opens-time" type="time" value={hoursOpensTime} onChange={(e) => setHoursOpensTime(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="closes-time">Closes</label>
          <input id="closes-time" type="time" value={hoursClosesTime} onChange={(e) => setHoursClosesTime(e.target.value)} />
        </div>
      </div>
      <button type="submit" className="btn" disabled={saving}>
        {saving ? 'Saving…' : 'Save stand status'}
      </button>
      {msg && <p className={msg.kind === 'success' ? 'status-msg-success' : 'status-msg-error'}>{msg.text}</p>}
    </form>
  );
}
