/** @type {import('next').NextConfig} */

// Photos are served by the Dehqon Bozori API (both website uploads and photos
// that sellers sent through the Telegram bot). next/image needs that host
// whitelisted, so derive it from the same env var the API client uses instead
// of hard-coding a domain that will differ per environment.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

/** @type {import('next').NextConfig['images']['remotePatterns']} */
const remotePatterns = [
  { protocol: 'http', hostname: 'localhost' },
  { protocol: 'http', hostname: '127.0.0.1' },
  { protocol: 'https', hostname: '**.onrender.com' },
];

if (apiUrl) {
  try {
    const { protocol, hostname, port } = new URL(apiUrl);
    remotePatterns.push({
      protocol: protocol.replace(':', ''),
      hostname,
      ...(port ? { port } : {}),
    });
  } catch {
    console.warn(`[next.config] NEXT_PUBLIC_API_URL is not a valid URL: ${apiUrl}`);
  }
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns,
    // Buyers are on cheap Android phones over rural 3G — serve small, modern files.
    formats: ['image/webp'],
    deviceSizes: [360, 420, 640, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 200, 256, 384],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
