// Minimal service worker — just enough to satisfy PWA installability
// requirements (Chrome/PWABuilder require an active fetch handler) and
// to let the app open once when offline.
const CACHE_NAME = 'novbatam-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((res) => res || caches.match('./'))
    )
  );
});
