'use client';

import { useState } from 'react';
import type { ScheduleEntry, StandStatus } from '@/lib/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildGrid(schedule: ScheduleEntry[]): { enabled: boolean; open: string; close: string }[] {
  return DAYS.map((_, i) => {
    const entry = schedule.find((e) => e.day === i);
    return entry
      ? { enabled: true, open: entry.open, close: entry.close }
      : { enabled: false, open: '08:00', close: '13:00' };
  });
}

export default function StandEditor({ initial }: { initial: StandStatus }) {
  const [enabled, setEnabled] = useState(initial.enabled ?? false);
  const [comingSoon, setComingSoon] = useState(initial.comingSoon ?? true);
  const [grid, setGrid] = useState(() => buildGrid(initial.schedule ?? []));
  const [hours, setHours] = useState(initial.hours);
  const [address, setAddress] = useState(initial.address);
  const [todayText, setTodayText] = useState(initial.todayText);
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
      const res = await fetch('/api/admin/stand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          comingSoon,
          isOpen: false,
          hours,
          address,
          todayText,
          hoursDayOfWeek: 'Saturday',
          hoursOpensTime: '08:00',
          hoursClosesTime: '13:00',
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
    <form onSubmit={save} className="admin-card" id="stand">
      <h2>Farm stand</h2>

      <div className="toggle-row form-row">
        <label htmlFor="stand-enabled" style={{ marginBottom: 0 }}>
          Farm stand enabled (master on/off)
        </label>
        <input
          id="stand-enabled"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          style={{ width: 20, height: 20 }}
        />
      </div>
      <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>
        When off, the public site shows a &ldquo;Coming Soon&rdquo; notice regardless of any schedule.
      </p>

      <div className="toggle-row form-row" style={{ opacity: enabled ? 1 : 0.45 }}>
        <label htmlFor="stand-coming-soon" style={{ marginBottom: 0 }}>
          Show &ldquo;Coming Soon&rdquo; publicly
        </label>
        <input
          id="stand-coming-soon"
          type="checkbox"
          checked={comingSoon}
          disabled={!enabled}
          onChange={(e) => setComingSoon(e.target.checked)}
          style={{ width: 20, height: 20 }}
        />
      </div>

      <div style={{ opacity: enabled && !comingSoon ? 1 : 0.45 }}>
        <p className="hint" style={{ marginBottom: 12 }}>
          Schedule (CST) &mdash; leave all days unchecked to keep stand off-schedule.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: 8 }}>Day</th>
              <th style={{ textAlign: 'left', paddingBottom: 8 }}>Opens (CST)</th>
              <th style={{ textAlign: 'left', paddingBottom: 8 }}>Closes (CST)</th>
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
                      disabled={!enabled || comingSoon}
                      onChange={(e) => updateRow(i, { enabled: e.target.checked })}
                    />
                    {day}
                  </label>
                </td>
                <td style={{ paddingBottom: 10, paddingRight: 16 }}>
                  <input
                    type="time"
                    value={grid[i].open}
                    disabled={!enabled || comingSoon || !grid[i].enabled}
                    onChange={(e) => updateRow(i, { open: e.target.value })}
                  />
                </td>
                <td style={{ paddingBottom: 10 }}>
                  <input
                    type="time"
                    value={grid[i].close}
                    disabled={!enabled || comingSoon || !grid[i].enabled}
                    onChange={(e) => updateRow(i, { close: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="form-row">
        <label htmlFor="stand-today">What&apos;s on the table (this weekend announcement)</label>
        <input id="stand-today" type="text" value={todayText} onChange={(e) => setTodayText(e.target.value)} />
        <p className="hint">Shown in the homepage announcement banner when non-empty.</p>
      </div>
      <div className="form-row">
        <label htmlFor="stand-hours">Hours display text (shown to customers)</label>
        <input id="stand-hours" type="text" value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="stand-address">Address</label>
        <input id="stand-address" type="text" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      <button type="submit" className="btn" disabled={saving}>
        {saving ? 'Saving\u2026' : 'Save stand settings'}
      </button>
      {msg && <p className={msg.kind === 'success' ? 'status-msg-success' : 'status-msg-error'}>{msg.text}</p>}
    </form>
  );
}
