// Offline cache for the app shell. Bump VERSION when files change.
importScripts('./version.js');
const PREFIX = 'qrcards-';
const VERSION = PREFIX + globalThis.QRCUBE_VERSION;
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'version.js', 'utils.js', 'formats.js', 'storage.js', 'surfaces.js', 'vendor/qrcode.js', 'vendor/jsQR.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never stores stale copies.
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // Other apps on this site keep their own caches: delete only QR Cards' old versions.
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Same-origin: network first, always revalidated (so updates show up), cache as offline fallback.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    // Revalidate with the server (skip the HTTP cache). Navigations can't be copied with
    // options, so rebuild those from the URL.
    fetch(e.request.mode === 'navigate' ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' })
                                        : new Request(e.request, { cache: 'no-cache' }))
      .then(res => {
        // Only complete, successful answers are kept for offline use (no errors or partial ranges).
        if (res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          // waitUntil keeps the worker alive until the copy is stored.
          e.waitUntil(caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {}));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
