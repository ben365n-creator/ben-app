// EA Jobs — Service Worker v2
// Minimal SW for PWA installability — no caching (always fresh data)
// v2: cache:no-store added to bypass HTTP cache on all requests

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  // Bypass HTTP cache on every request so updated HTML/JS is always served fresh
  e.respondWith(fetch(e.request, {cache: 'no-store'}));
});
