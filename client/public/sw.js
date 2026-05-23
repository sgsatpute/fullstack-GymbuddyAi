/**
 * PROMPT 10: Service Worker
 * Caching strategy, offline support, background sync
 */

const CACHE_NAME = "gymbuddy-v1";
const ASSETS_CACHE = "gymbuddy-assets-v1";
const DYNAMIC_CACHE = "gymbuddy-dynamic-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Cache-first for assets, network-first for API
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Cache-first for static assets
  if (url.pathname.includes("/static/") || url.pathname.includes(".js") || url.pathname.includes(".css")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return (
          response ||
          fetch(event.request).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(ASSETS_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // Network-first for API
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "GymBuddy", {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-96.png",
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windows) => {
      for (const w of windows) {
        if (w.url === "/") return w.focus();
      }
      return clients.openWindow("/");
    })
  );
});

console.log("[SW] Service Worker ready");
