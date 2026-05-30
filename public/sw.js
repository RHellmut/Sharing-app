const CACHE = 'catriver-cost-v2';

// Cache the app shell on install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(['/', '/manifest.webmanifest'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for API calls, cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always fetch Supabase calls live — never cache them
  if (url.hostname.includes('supabase')) return;

  // Navigation requests: network first, fall back to cached root.
  // On success, refresh the cached shell so installed PWAs stay current.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put('/', clone));
          return response;
        })
        .catch(() => caches.match('/').then(r => r ?? Response.error()))
    );
    return;
  }

  // Static assets: cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
      return cached ?? network;
    })
  );
});
