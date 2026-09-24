const CACHE_NAME = 'cmoa-kasse-v14';

const KASSE_FILES = [
  './kasse.html',
  './manifest-kasse.json',
  './kasse-icon-192.png',
  './kasse-icon-512.png',
  './kasse-apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(KASSE_FILES))
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith('cmoa-kasse-') &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  const isSameOrigin =
    url.origin === self.location.origin;

  const isKasseNavigation =
    event.request.mode === 'navigate' &&
    /\/kasse(?:\.html)?$/.test(url.pathname);

  if (isKasseNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put('./kasse.html', copy);
            });
          }

          return response;
        })
        .catch(() => caches.match('./kasse.html'))
    );

    return;
  }

  // Wichtig:
  // Die CMOA index.html darf niemals durch
  // die Kassen-App ersetzt werden.
  if (event.request.mode === 'navigate') {
    return;
  }

  if (
    isSameOrigin &&
    KASSE_FILES.some(file =>
      url.pathname.endsWith(file.replace('./', ''))
    )
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request);
      })
    );
  }
});
