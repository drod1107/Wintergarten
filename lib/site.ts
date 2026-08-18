// Full legal/business name — use this wherever the name appears prominently
// (titles, structured data, footer, masthead). SITE_NAME_SHORT is for
// regular body copy, where "Wintergarten" alone reads better.
export const SITE_NAME = 'Wintergarten Bakehouse + Botanicals';
export const SITE_NAME_SHORT = 'Wintergarten';
export const SITE_TAGLINE = 'A small bakery and a small collection of plants, kept under one roof on Highway H.';
// Canonical URLs, sitemap entries and Stripe return URLs are all built from
// this. NEXT_PUBLIC_SITE_URL is the setting that matters in production; the
// production domain is the fallback so a missing variable can never publish
// localhost canonicals to a live deployment.
export const PRODUCTION_URL = 'https://derwintergarten.com';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_URL : 'http://localhost:3000');
export const BUSINESS_ADDRESS = {
  streetAddress: '5312 Highway H',
  addressLocality: 'Sullivan',
  addressRegion: 'MO',
  postalCode: '63080',
  addressCountry: 'US',
};
