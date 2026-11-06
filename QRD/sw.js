// Offline cache for the app shell. Bump VERSION when files change.
const VERSION = 'qrcube-v8';
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'vendor/qrcode.js', 'vendor/jsQR.js',
  'vendor/three/three.module.js', 'vendor/three/three.core.js',
  'vendor/three/RoundedBoxGeometry.js', 'vendor/three/RoomEnvironment.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
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
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
