import Link from 'next/link';

const LINKS = [
  { href: '/order', label: 'Order' },
  { href: '/kitchen-record', label: 'Kitchen Record', accent: true },
  { href: '/care-guides', label: 'Growing Notes' },
  { href: '/story', label: 'Story' },
];

export default function Nav({ current }: { current?: string }) {
  return (
    <nav className="site-nav z" aria-label="Primary">
      <Link href="/" className="brand">
        <span className="brand-mark">
          Winter<em>garten</em>
        </span>
        <span className="brand-tagline typed">Bakehouse + Botanicals</span>
      </Link>
      <ul className="nav-links">
        {LINKS.map((l) => (
          <li key={l.href} className={l.accent ? 'nav-record' : undefined}>
            <Link href={l.href} aria-current={current === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
