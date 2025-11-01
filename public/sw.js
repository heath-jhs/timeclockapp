// public/sw.js
const CACHE_NAME = 'timeclock-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/manifest.json'
];

// Install: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        return new Response('Offline — check connection', {
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// Optional: Handle clock-in when offline
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'OFFLINE_CLOCKIN') {
    // Store in IndexedDB or localStorage via client message
    // For now, just acknowledge
    event.ports[0].postMessage({ status: 'saved-offline' });
  }
});
