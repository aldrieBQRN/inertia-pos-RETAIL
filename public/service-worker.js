const CACHE_NAME = 'inertia-pos-v2';
const urlsToCache = [
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        // Ignore files not found during initial install
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // Skip cross-origin extensions, analytics, or third-party APIs
  if (url.origin !== self.location.origin) {
    return;
  }

  // Always fetch dynamic HTML, PHP, API, or Inertia page requests live from network
  const isDynamicRoute = request.headers.get('accept')?.includes('text/html') ||
                         request.headers.get('x-inertia') ||
                         url.pathname === '/' ||
                         url.pathname.endsWith('.php') ||
                         url.pathname.startsWith('/api/') ||
                         url.pathname.startsWith('/artisan-migrate');

  if (isDynamicRoute) {
    event.respondWith(
      fetch(request).catch(() => new Response('Offline', { status: 503, statusText: 'Service Unavailable' }))
    );
    return;
  }

  // Cache-first strategy for static assets (images, fonts, build chunks)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => {});
          });

          return networkResponse;
        })
        .catch(() => {
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
    })
  );
});
