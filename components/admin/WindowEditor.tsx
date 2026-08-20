'use client';

import { useState } from 'react';
import type { OrderWindow, ScheduleEntry } from '@/lib/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildGrid(schedule: ScheduleEntry[]): { enabled: boolean; open: string; close: string }[] {
  return DAYS.map((_, i) => {
    const entry = schedule.find((e) => e.day === i);
    return entry
      ? { enabled: true, open: entry.open, close: entry.close }
      : { enabled: false, open: '08:00', close: '20:00' };
  });
}

export default function WindowEditor({ initial }: { initial: OrderWindow }) {
  const [grid, setGrid] = useState(() => buildGrid(initial.schedule ?? []));
  const [pickupDays, setPickupDays] = useState(initial.pickupDays);
  const [notes, setNotes] = useState(initial.notes);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function updateRow(i: number, patch: Partial<{ enabled: boolean; open: string; close: string }>) {
    setGrid((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const schedule: ScheduleEntry[] = grid
      .map((row, i) => (row.enabled ? { day: i, open: row.open, close: row.close } : null))
      .filter((x): x is ScheduleEntry => x !== null);
    try {
      const res = await fetch('/api/admin/window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'closed',
          opensAt: null,
          closesAt: null,
          pickupDays,
          notes,
          schedule,
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
      <h2>Order window schedule</h2>
      <p className="hint" style={{ marginBottom: 16 }}>
        Check any days to define the recurring window. The window opens on the <strong>earliest</strong> checked
        day at its open time and closes on the <strong>latest</strong> checked day at its close time — all days
        in between are implicitly open. Example: check Sunday (open 8AM) and Thursday (close 8PM) to get a
        Sun–Thu window with no other days needed. Repeats weekly until changed.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingBottom: 8 }}>Day</th>
            <th style={{ textAlign: 'left', paddingBottom: 8 }}>Open (CST)</th>
            <th style={{ textAlign: 'left', paddingBottom: 8 }}>Close (CST)</th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, i) => (
            <tr key={day} style={{ opacity: grid[i].enabled ? 1 : 0.45 }}>
              <td style={{ paddingBottom: 10, paddingRight: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={grid[i].enabled}
                    onChange={(e) => updateRow(i, { enabled: e.target.checked })}
                  />
                  {day}
                </label>
              </td>
              <td style={{ paddingBottom: 10, paddingRight: 16 }}>
                <input
                  type="time"
                  value={grid[i].open}
                  disabled={!grid[i].enabled}
                  onChange={(e) => updateRow(i, { open: e.target.value })}
                />
              </td>
              <td style={{ paddingBottom: 10 }}>
                <input
                  type="time"
                  value={grid[i].close}
                  disabled={!grid[i].enabled}
                  onChange={(e) => updateRow(i, { close: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="form-row">
        <label htmlFor="pickup-days">Pickup days (shown to customers)</label>
        <input id="pickup-days" type="text" value={pickupDays} onChange={(e) => setPickupDays(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="window-notes">Notes shown when closed</label>
        <input id="window-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button type="submit" className="btn" disabled={saving}>
        {saving ? 'Saving\u2026' : 'Save schedule'}
      </button>
      {msg && <p className={msg.kind === 'success' ? 'status-msg-success' : 'status-msg-error'}>{msg.text}</p>}
    </form>
  );
}
