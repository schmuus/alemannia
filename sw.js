// Minimaler Service Worker fürs Wörterbuech Alemannia Cryptologia
// Cached nur die App-Hülle (HTML/Icons), NICHT die Firebase-Daten.
// Die Wörter, Votes und Sätze bruuched immer e Internetverbindig.

const CACHE_NAME = 'alemannia-shell-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Cache-first für die App-Hülle, alles andere (v.a. Firebase) geht normal übers Netz.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAppShellRequest = APP_SHELL.some((path) => url.pathname.endsWith(path.replace('./', '/')));

  if (event.request.method !== 'GET' || !isAppShellRequest) {
    return; // Firebase & sonstige Requests unangetastet lassen
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
