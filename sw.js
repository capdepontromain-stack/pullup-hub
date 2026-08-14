// SW de nettoyage — vide les anciens caches une fois, sans forcer de rechargement
// (l'ancien FORCE_RELOAD + unregister provoquait une boucle de rechargement infinie)
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
