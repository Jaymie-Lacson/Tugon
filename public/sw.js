// TUGON Service Worker — network-first for HTML so deploys propagate
// immediately, stale-while-revalidate for hashed static assets, network-only
// for /api/* (server-side geofencing must never be bypassed by stale data).
//
// __BUILD_ID__ is replaced at build time by scripts/stamp-sw.mjs so a fresh
// deploy invalidates the previous cache via the activate handler below.

const CACHE = 'tugon-static-__BUILD_ID__';

self.addEventListener('install', (event) => {
  // Pre-cache only the immutable font files. The homepage HTML is no longer
  // pre-cached because that froze stale prerendered content into the cache
  // until the next SW version bump.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([
      '/fonts/public-sans-400.woff2',
      '/fonts/public-sans-700.woff2',
      '/fonts/ibm-plex-sans-400.woff2',
      '/fonts/ibm-plex-mono-400.woff2',
    ])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API calls bypass the cache entirely — geofencing, RBAC and pin routing
  // decisions must always reach the server with fresh boundary data.
  if (url.pathname.startsWith('/api/')) return;

  // Cross-origin requests (tile servers, third-party CDNs) pass through.
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigations: the latest deploy is served as soon
  // as the user is online; cached copies are only used when the network fails.
  const isNavigation = request.mode === 'navigate' || request.destination === 'document';
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        }),
    );
    return;
  }

  // Static assets: stale-while-revalidate. Hashed filenames are content-
  // addressed so stale chunks are safe; fonts are versioned by URL.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok && response.type !== 'opaque') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);

      return cached ?? networkFetch;
    }),
  );
});
