import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="site-footer typed z">
      <span>{SITE_NAME} · 5312 Highway H · Sullivan MO 63080</span>
      <span>Missouri cottage food · RSMo 196.298</span>
      <nav aria-label="Footer">
        <Link href="/kitchen-record">Kitchen record</Link>
        <Link href="/care-guides">Growing notes</Link>
        <Link href="/story">Story</Link>
        <Link href="/order">Order</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </footer>
  );
}
