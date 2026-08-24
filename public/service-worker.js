const CACHE_NAME = 'inertia-pos-v1';
const urlsToCache = [
  '/',
  '/index.php',
  '/css/app.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        // Ignore errors for files that don't exist yet
        console.log('Some files failed to cache during install');
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
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Always fetch fresh for HTML pages and API (never cache)
  const isHtmlRequest = request.headers.get('accept')?.includes('text/html') ||
                        url.pathname === '/' ||
                        url.pathname.endsWith('.php') ||
                        url.pathname.startsWith('/api/');

  if (isHtmlRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          // Return offline response (no cached fallback)
          return new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Cache-first for static assets (images, build files, CSS, JS)
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch((err) => {
        console.warn('Service worker asset fetch failed:', err);
        return new Response('', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});
