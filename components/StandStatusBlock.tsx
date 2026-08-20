import type { StandStatus } from '@/lib/types';

export default function StandStatusBlock({ stand }: { stand: StandStatus }) {
  const showComingSoon = !stand.enabled || stand.comingSoon;

  if (showComingSoon) {
    return (
      <section className="stand" aria-labelledby="stand-heading">
        <span className="typed" style={{ color: 'var(--rust)' }}>
          The stand
        </span>
        <h2 id="stand-heading">Coming soon</h2>
        <p>
          A farm stand is in the works at 5312 Highway H. Walk-up sales, Saturday mornings.
          Sign up below to hear when it opens.
        </p>
      </section>
    );
  }

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
      {stand.todayText && (
        <div className="today">On the table today &mdash;<br />{stand.todayText}</div>
      )}
    </section>
  );
}
