import Link from 'next/link';
import type { EffectiveWindowState } from '@/lib/store';

// Rendered on the server, which runs in UTC. Without an explicit timeZone
// a 8PM Central close renders as "1 AM" the next day — the wrong deadline
// for every customer. The bakery's clock is the only one that matters here.
function formatClosesAt(iso: string) {
  const d = new Date(iso);
  const showMinutes =
    Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        minute: 'numeric',
      }).format(d)
    ) !== 0;
  return d.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: showMinutes ? '2-digit' : undefined,
  });
}

export default function OrderWindowBanner({ state }: { state: EffectiveWindowState }) {
  if (state.state === 'open') {
    return (
      <div className="stamp">
        Orders open
        <b>{state.closesAt ? `Closing ${formatClosesAt(state.closesAt)}` : 'Open now'}</b>
        <Link href="/order" style={{ display: 'block', marginTop: 4, textDecoration: 'underline' }}>
          Place an order →
        </Link>
      </div>
    );
  }
  if (state.state === 'sold-out') {
    return (
      <div className="stamp">
        Sold out
        <b>This window</b>
        Back next week
      </div>
    );
  }
  return (
    <div className="stamp">
      Orders closed
      <b>{state.reason === 'scheduled' ? 'Opening soon' : 'Check back'}</b>
      {state.notes || 'Watch the Sunday email for the next window.'}
    </div>
  );
}
