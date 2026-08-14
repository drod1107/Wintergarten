import type { MetadataRoute } from 'next';
import { getCareGuides } from '@/lib/store';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guides = await getCareGuides();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/kitchen-record`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/order`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/care-guides`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/story`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const guideRoutes: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${SITE_URL}/care-guides/${g.slug}`,
    lastModified: g.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...guideRoutes];
}
