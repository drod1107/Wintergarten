import type { Metadata, Viewport } from 'next';
import { fontDisplay, fontBody, fontMono, fontSerif } from './fonts';
import { isDemoMode, getStandStatus } from '@/lib/store';
import { SITE_NAME, SITE_TAGLINE, SITE_URL, BUSINESS_ADDRESS } from '@/lib/site';
import DemoBanner from '@/components/DemoBanner';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Gluten-free, mammal-free bakery & houseplants`, template: `%s — ${SITE_NAME}` },
  description: SITE_TAGLINE,
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E0D6C0',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [demo, stand] = await Promise.all([Promise.resolve(isDemoMode()), getStandStatus()]);

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: SITE_NAME,
    url: SITE_URL,
    address: { '@type': 'PostalAddress', ...BUSINESS_ADDRESS },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${stand.hoursDayOfWeek}`,
        opens: stand.hoursOpensTime,
        closes: stand.hoursClosesTime,
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} ${fontSerif.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {demo && <DemoBanner />}
        {children}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
      </body>
    </html>
  );
}
