// Keeps the app shell on the device so it opens instantly, even offline.
// Bump VERSION after you change index.html so phones pick up the new copy.
const VERSION = 'mvd-v3';
const FONTS = VERSION + '-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // sync requests to Google go straight to the network
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Serve the cached copy at once, refresh it in the background.
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      });
      if (hit) {
        e.waitUntil(net.catch(() => {}));
        return hit;
      }
      return net;
    })());
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })());
  }
});
