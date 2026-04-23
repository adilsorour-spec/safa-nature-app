// Service Worker minimal - pas de cache pour éviter les problèmes
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
// Pas de cache - tout passe par le réseau
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
