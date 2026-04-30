/* Service worker (safe for dev + static serve).
   Goals:
   - Never break Vite/HMR/dev assets (/@vite, /src, etc.)
   - Never block startup if cache misses: always fallback to network
   - Purge older caches on update to avoid serving stale HTML that references Vite */

const CACHE_NAME = 'qhse-control-sw-v1';

function isDev() {
  // "serve" runs on 5173 in this repo; also treat localhost as dev.
  return (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    self.location.port === '5173'
  );
}

function shouldBypass(requestUrl) {
  // Never intercept dev tooling / HMR / module requests.
  return (
    requestUrl.pathname.startsWith('/@vite/') ||
    requestUrl.pathname.startsWith('/@fs/') ||
    requestUrl.pathname.startsWith('/src/') ||
    requestUrl.pathname.startsWith('/node_modules/') ||
    requestUrl.pathname.startsWith('/__vite_ping') ||
    requestUrl.pathname.endsWith('.map')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Don't pre-cache aggressively; avoid trapping stale HTML.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Purge ALL caches to evict any legacy SW caches that served old Vite HTML.
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (_e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirstWithNetworkFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (_e) {
    // Critical: never reject respondWith(), always return a Response.
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin GET requests.
  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  // In dev, bypass anything related to tooling / modules.
  if (isDev() && shouldBypass(url)) return;

  // Never cache-bust service-worker file itself.
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Navigations: prefer network to avoid stale HTML that points to Vite assets.
  const isNav = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (isNav) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: cache-first + network fallback.
  event.respondWith(cacheFirstWithNetworkFallback(request));
});

