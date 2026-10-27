/* Offline shell with hashed Next.js assets captured on the first successful visit. */
const CACHE = 'kagel-static-v3';
const ROOT = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const HOME = (ROOT || '') + '/';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const page = await fetch(HOME, { cache: 'reload' });
    if (!page.ok) throw new Error('Cannot prepare offline shell');
    await cache.put(HOME, page.clone());
    const html = await page.text();
    const assets = new Set([
      HOME + 'manifest.webmanifest', HOME + 'icon.svg',
      HOME + 'icons/icon-192.png', HOME + 'icons/icon-512.png',
      ...Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), (match) => match[1]),
    ]);
    await Promise.all(Array.from(assets, async (asset) => {
      try {
        const url = new URL(asset, self.location.origin);
        if (url.origin === self.location.origin && url.pathname.startsWith(HOME)) {
          await cache.add(url.href);
        }
      } catch { /* A nonessential asset should not block installation. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('kagel-') && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(HOME)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(HOME)) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
    }
    return response;
  })));
});
