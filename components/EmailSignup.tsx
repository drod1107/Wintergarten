'use client';

import { useId, useState } from 'react';

export default function EmailSignup({ source = 'homepage' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const inputId = useId();
  const statusId = useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('done');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor={inputId} className="visually-hidden">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@somewhere.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={statusId}
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Joining…' : 'Join'}
        </button>
      </div>
      <p id={statusId} className="status-msg" role="status" aria-live="polite">
        {status === 'done' && "You're on the list. One email a week."}
        {status === 'error' && 'Something went wrong — try again in a moment.'}
      </p>
    </form>
  );
}
