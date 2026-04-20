// TUGON Service Worker — stale-while-revalidate for static assets only.
// API routes (/api/*) are ALWAYS network-only — server-side geofencing must
// never be bypassed by serving a cached response offline.

const CACHE = 'tugon-static-v2';

self.addEventListener('install', (event) => {
  // Pre-cache the app shell and critical fonts so they load from cache on repeat visits.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([
      '/',
      '/fonts/ibm-plex-sans-400.woff2',
      '/fonts/public-sans-700.woff2',
      '/fonts/ibm-plex-mono-400.woff2',
    ])),
  );
  // Activate immediately — don't wait for old tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete any stale caches from previous SW versions.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests — POST/PUT/DELETE go straight to the network.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API calls: bypass the cache entirely. Geofencing validation, pin routing,
  // and all RBAC decisions must reach the server. A cached response could
  // allow an offline report to pass client-side checks with stale boundary data.
  if (url.pathname.startsWith('/api/')) return;

  // Cross-origin requests (e.g., tile servers, CDN fonts): let them through.
  if (url.origin !== self.location.origin) return;

  // Static assets: stale-while-revalidate.
  // Serve from cache immediately if available, then update the cache in the
  // background so the next visit gets fresh assets.
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
        .catch(() => cached); // If offline, fall back to whatever we have.

      return cached ?? networkFetch;
    }),
  );
});
