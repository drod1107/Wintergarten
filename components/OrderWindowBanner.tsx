import Link from 'next/link';
import type { EffectiveWindowState } from '@/lib/store';

function formatClosesAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: d.getMinutes() === 0 ? undefined : '2-digit',
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
