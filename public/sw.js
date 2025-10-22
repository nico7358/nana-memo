const CACHE_NAME = "nana-memo-cache-v4";
// FIX: Use absolute paths for all assets to ensure correct caching.
// Added icon-192.png for offline notification support.
const APP_SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-badge.png",
  "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&family=Dela+Gothic+One&family=Kiwi+Maru&display=swap",
];

self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching app shell");
        return cache.addAll(APP_SHELL_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  console.log("Service Worker: Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker: Claiming clients...");
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  // We only handle GET requests.
  if (event.request.method !== "GET") {
    return;
  }

  // 💡 FIX: Bypass cache for .wasm files to ensure they are always fetched from network.
  if (event.request.url.endsWith(".wasm")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For navigation requests, use a network-first strategy to get the latest app version.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For all other requests, use a cache-first strategy.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Check for a valid response
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Don't cache chrome extension requests
        if (event.request.url.startsWith("chrome-extension://")) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const noteId = event.notification.data?.noteId;
  const urlToOpen = noteId
    ? `${self.location.origin}/?noteId=${noteId}`
    : self.location.origin;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          // すでに開いているタブをフォーカス
          if ("focus" in client) {
            client.focus();
            // メモIDをアプリ側に送る
            if (noteId) {
              client.postMessage({ type: "OPEN_NOTE", noteId });
            }
            return;
          }
        }

        // もしアプリが開いていなければ新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTE_NOTIFICATION") {
    const { title, body, noteId } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-badge.png",
      tag: `note-${noteId}`,
      requireInteraction: true,
      data: { noteId },
      actions: [{ action: "open_note", title: "開く" }],
    });
  }
});
