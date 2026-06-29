// SW de nettoyage — vide tous les caches et force un rechargement de la PWA
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => clients.matchAll({ includeUncontrolled: true, type: 'window' }))
      .then(clientList => {
        // Forcer tous les onglets/PWA à recharger depuis le réseau
        clientList.forEach(client => {
          client.postMessage({ type: 'FORCE_RELOAD' });
        });
      })
      .then(() => self.registration.unregister())
  );
});
