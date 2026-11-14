/* =========================================================================
   sw.js — service worker for offline use & installability

   Strategy:
     • Precache the app shell on install so the game opens instantly offline,
       then precache every deck (questions + logo) listed in data/decks.json
       so decks that were never opened still work offline.
     • Navigation requests and the manifest: network-first, falling back to
       the cached copy. (A cached manifest would keep an old app id / scope,
       which breaks installing.)
     • Deck data (data/…): stale-while-revalidate — served from cache at once,
       refreshed in the background, so edited questions arrive on the next
       visit without bumping CACHE.
     • Everything else (same-origin): cache-first, then network, and newly
       fetched responses are cached for next time.

   All paths are relative so the worker behaves correctly when the site is
   served from a GitHub Pages sub-path (username.github.io/repo/).
   Bump VERSION when you change shell files (HTML/CSS/JS) to force an update.
   ========================================================================= */

// Caches are shared by the whole origin, so each app variant owns a prefix
// and only ever cleans up its own old caches.
const CACHE_PREFIX = "bigtalk-v";
const VERSION = "1.1.0";
const CACHE = CACHE_PREFIX + VERSION;

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

/** Cache the shell (required), then every registered deck (best effort). */
async function precache() {
  // cache: "reload" skips the browser's HTTP cache (GitHub Pages keeps files
  // for 10 min), so a new version never re-caches stale copies of old files.
  const fresh = (url) => new Request(url, { cache: "reload" });
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL.map(fresh));
  try {
    const registry = await cache.match("./data/decks.json");
    const { decks = [] } = await registry.json();
    const urls = decks.flatMap((d) => [d.file, d.logo]).filter(Boolean);
    await Promise.all(urls.map((u) => cache.add(fresh(u)).catch(() => {})));
  } catch {
    /* a deck that fails here is simply cached the first time it is opened */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Fetch from the network and store a successful response in the cache. */
function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  });
}

const DATA_PATH = new URL("./data/", self.location).pathname;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // leave cross-origin requests alone

  // The manifest: always prefer a fresh copy so the app id / scope stay current.
  if (url.pathname.endsWith(".webmanifest")) {
    event.respondWith(
      fetch(request, { cache: "no-cache" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request, { cacheName: CACHE }))
        .then((response) => response || Response.error())
    );
    return;
  }

  // Page navigations: prefer fresh, fall back to cache when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("./index.html", { cacheName: CACHE }))
        .then((response) => response || Response.error())
    );
    return;
  }

  // Deck data: answer from cache immediately, refresh it in the background.
  if (url.pathname.startsWith(DATA_PATH)) {
    event.respondWith(
      caches.match(request, { cacheName: CACHE }).then((cached) => {
        const fresh = fetchAndCache(request);
        if (!cached) return fresh;
        event.waitUntil(fresh.catch(() => {}));
        return cached;
      })
    );
    return;
  }

  // Static assets: cache-first, populate cache on miss.
  event.respondWith(
    caches
      .match(request, { cacheName: CACHE })
      .then((cached) => cached || fetchAndCache(request))
  );
});
