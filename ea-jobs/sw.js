// EA Jobs — Service Worker v1
// Minimal SW for PWA installability — no caching (always fresh data)

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  // Pass all requests through — no offline cache needed
  e.respondWith(fetch(e.request));
});