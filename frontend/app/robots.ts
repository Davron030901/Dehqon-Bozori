import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dehqonbozori.uz').replace(/\/$/, '');

/**
 * Buyers should find listings and sellers in search; the private seller pages
 * (cabinet, edit forms, admin) and a device's saved list should not be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/sotuvchi/kabinet',
        '/sotuvchi/admin',
        '/sotuvchi/tahrirlash/',
        '/sotuvchi/elon-qoshish',
        '/saqlangan',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
