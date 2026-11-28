// J.A.R.V.I.S. Mark VII PWA service worker
// Network-first for fresh application content, with a bounded offline fallback.
const CACHE_NAME = 'jarvis-mark7-os-v5';
const APP_SHELL = ['./', './index.html', './app.js', './manifest.json', './favicon.png', './icon-512.png', './privacy.html', './terms.html', './404.html'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('jarvis-mark7-os-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      const shellFallback = await caches.match('./index.html');
      if (shellFallback && (url.pathname === '/' || url.pathname.endsWith('/index.html'))) {
        return shellFallback;
      }
      return new Response('J.A.R.V.I.S. is offline and this resource is not cached.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
