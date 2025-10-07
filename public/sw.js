const CACHE_NAME = 'tenten-ai-v2.0.8';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/tenten-icon.png',
];

// Install event
self.addEventListener('install', (event) => {
  // Activate this Service Worker immediately on install
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urlsToCache);
      } catch (err) {
        // Don't block activation if a precache URL is missing or fails
        console.warn('SW install: precache failed', err);
      }
    })()
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Network-first for app shell navigations (prevents stale index.html)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        // Refresh cached shell for offline use
        await cache.put('/index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return caches.match('/index.html');
      }
    })());
    return;
  }

  // Only handle same-origin GET requests; skip APIs
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // Stale-while-revalidate for static assets
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => undefined);
    return cached || networkPromise || fetch(req);
  })());
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );

      // Take control of all open clients immediately
      await self.clients.claim();

      // Optionally notify clients that a new SW is active
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientList.forEach((client) => client.postMessage({ type: 'SW_ACTIVATED' }));
    })()
  );
});