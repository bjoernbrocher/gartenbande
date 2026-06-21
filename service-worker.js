const CACHE_NAME = "gartenbande-pwa-v26";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=daily1",
  "./app.js?v=daily1",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./place-icons/aushang-tor.jpg",
  "./place-icons/helferbank.jpg",
  "./place-icons/tauschbeet.jpg",
  "./place-icons/blumenbeet.jpg",
  "./place-icons/geraeteschuppen.jpg",
  "./place-icons/pergola.jpg",
  "./place-icons/vogelhaus.jpg",
  "./place-icons/gartenbuch.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
