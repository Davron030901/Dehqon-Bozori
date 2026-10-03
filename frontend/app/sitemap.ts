import type { MetadataRoute } from 'next';

import { getSitemapListings } from '@/lib/api';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dehqonbozori.uz').replace(/\/$/, '');

// Rebuilt at most once an hour — search engines do not need it fresher, and the
// backend should not page through every listing for each crawler visit.
export const revalidate = 3600;

/**
 * Every active listing gets a URL a search engine can find: "pomidor Urgut"
 * typed into Google should be able to land on the grower who has it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await getSitemapListings();
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/sotuvchi/royxatdan-otish`, changeFrequency: 'monthly', priority: 0.3 },
    ...listings.map((listing) => ({
      url: `${SITE_URL}/mahsulot/${listing.id}`,
      lastModified: listing.createdAt,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
