const CACHE_NAME = 'nana-memo-cache-v1';
// Pre-caching has been removed to make installation more robust.
// Assets will be cached at runtime by the fetch handler.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // By removing pre-caching, the installation is more resilient.
  // self.skipWaiting() forces the waiting service worker to become the
  // active service worker.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients...');
      // self.clients.claim() allows an active service worker to take control of
      // all clients within its scope that are not currently controlled.
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Use a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // We don't cache POST requests or chrome extension requests
                if (event.request.method !== 'POST' && !event.request.url.startsWith('chrome-extension://')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Fetch failed', error);
          // Here you could return an offline fallback page, but for this app,
          // letting the browser handle it is fine as core functionality is cached.
        });
      })
  );
});
