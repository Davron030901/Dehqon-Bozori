/* Dehqon Bozori service worker — tuned for slow rural connections.
 *
 * Next.js fingerprints its build assets, so those are safe to cache forever.
 * Pages are network-first (listings change all day), with the last successful
 * response kept as a fallback so a dropped signal mid-bazaar still shows
 * something useful. Photos are cache-first — they never change once uploaded.
 */

const VERSION = 'db-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const IMAGE_CACHE = `${VERSION}-images`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(['/', '/icon.svg', '/manifest.webmanifest']))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        }),
    ),
  );
}

function networkFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    fetch(request)
      .then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => cache.match(request).then((hit) => hit || caches.match('/'))),
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache the seller's own data or auth traffic.
  if (url.pathname.includes('/api/auth') || url.pathname.includes('/api/my')) return;

  // Photos from the backend, and Next's optimized image endpoint.
  if (
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/media/') ||
    url.pathname.startsWith('/api/photo/') ||
    /\.(?:png|jpe?g|webp|avif|svg|gif)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Fingerprinted build output — immutable.
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGE_CACHE));
  }
});
