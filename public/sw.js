const CACHE_NAME = 'tenten-ai-v2.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/tenten-icon.png',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  // Activate this Service Worker immediately on install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
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