import type { StandStatus } from '@/lib/types';

export default function StandStatusBlock({ stand }: { stand: StandStatus }) {
  return (
    <section className="stand" aria-labelledby="stand-heading">
      <span className="typed" style={{ color: 'var(--rust)' }}>
        The stand
      </span>
      <h2 id="stand-heading">Pull onto the grass by the barn</h2>
      <p>
        <span className={`status-pill${stand.isOpen ? ' is-open' : ''}`}>
          <span className="dot" aria-hidden="true" />
          {stand.isOpen ? 'Open now' : 'Closed now'}
        </span>
      </p>
      <p>{stand.address}. {stand.hours}</p>
      <div className="today">On the table today —<br />{stand.todayText || 'check back Saturday morning'}</div>
    </section>
  );
}
