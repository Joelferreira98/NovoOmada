const CACHE_NAME = 'omada-login-v1';
const urlsToCache = [
  '/auth',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-72x72.svg'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto para PWA de Login');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Event - foca apenas na página de login
self.addEventListener('fetch', (event) => {
  // Só faz cache da página de login
  if (event.request.url.includes('/auth') || event.request.url.includes('manifest.json') || event.request.url.includes('/icons/')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Activate Event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});