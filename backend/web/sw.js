/* Service worker tuned for slow rural 3G.

   Shell (HTML/CSS/JS/icon): cache-first, so a repeat visit paints instantly.
   Photos: cache-first, they never change once uploaded.
   API: network-first with a cached fallback, so the last-seen listings are
   still readable when the signal drops mid-bazaar. */

var VERSION = 'db-v1';
var SHELL = VERSION + '-shell';
var PHOTOS = VERSION + '-photos';
var DATA = VERSION + '-data';

var SHELL_FILES = ['/', '/styles.css', '/app.js', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      return c.addAll(SHELL_FILES).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(VERSION) !== 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      });
    });
  });
}

function networkFirst(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return fetch(req).then(function (res) {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function () {
      return cache.match(req).then(function (hit) {
        return hit || new Response(JSON.stringify({ detail: 'offline' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Never cache authenticated or mutating traffic.
  if (url.pathname.indexOf('/api/auth') === 0 || url.pathname.indexOf('/api/my') === 0 ||
      url.pathname.indexOf('/api/admin') === 0) {
    return;
  }

  if (url.pathname.indexOf('/media/') === 0 || url.pathname.indexOf('/api/photo/') === 0) {
    e.respondWith(cacheFirst(req, PHOTOS));
    return;
  }
  if (url.pathname.indexOf('/api/') === 0) {
    e.respondWith(networkFirst(req, DATA));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match('/').then(function (hit) {
          return hit || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }
  e.respondWith(cacheFirst(req, SHELL));
});
