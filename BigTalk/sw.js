/* =========================================================================
   sw.js — service worker for offline use & installability

   Strategy:
     • Precache the app shell on install so the game opens instantly offline.
     • Navigation requests: network-first, falling back to the cached page.
     • Everything else (same-origin): cache-first, then network, and newly
       fetched responses (deck JSON, logos) are cached for next time.

   All paths are relative so the worker behaves correctly when the site is
   served from a GitHub Pages sub-path (username.github.io/repo/).
   Bump CACHE when you change shell files to force an update.
   ========================================================================= */

const CACHE = "bigtalk-v1.0.0";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/store.js",
  "./js/decks.js",
  "./data/decks.json",
  "./assets/img/decks/_fallback.svg",
  "./assets/img/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // leave cross-origin requests alone

  // Page navigations: prefer fresh, fall back to cache when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets & data: cache-first, populate cache on miss.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
