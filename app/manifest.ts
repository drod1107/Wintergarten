import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_NAME_SHORT } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME_SHORT,
    description: 'Gluten-free, mammal-free bakery and houseplants in Sullivan, Missouri.',
    start_url: '/',
    display: 'standalone',
    background_color: '#E6E9DF',
    theme_color: '#E6E9DF',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
