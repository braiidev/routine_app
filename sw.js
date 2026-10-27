const CACHE_NAME = 'gymrutina-v0.10.0';
const ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './css/main.css',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './js/app.js',
  './js/config.js',
  './js/icons.js',
  './js/state/schema.js',
  './js/state/normalize.js',
  './js/state/store.js',
  './js/state/selectors.js',
  './js/state/view.js',
  './js/features/sessions.js',
  './js/features/actions.js',
  './js/features/backup.js',
  './js/features/timer.js',
  './js/ui/render.js',
  './js/ui/groups.js',
  './js/ui/history.js',
  './js/ui/menu.js',
  './js/ui/reset.js',
  './js/ui/backup.js',
  './js/ui/toast.js',
  './js/utils/date.js',
  './js/utils/dom.js',
  './js/utils/time.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if(request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if(cached) return cached;
      return fetch(request).then((response) => {
        if(!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
