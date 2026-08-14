import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wintergarten',
    short_name: 'Wintergarten',
    description: 'Gluten-free, mammal-free bakery and houseplants in Sullivan, Missouri.',
    start_url: '/',
    display: 'standalone',
    background_color: '#E0D6C0',
    theme_color: '#E0D6C0',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
