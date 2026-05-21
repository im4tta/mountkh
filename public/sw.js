const CACHE = 'mountkh-v4';
const URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mountains-kh.json',
  '/favicon.ico',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  if (request.url.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open('tiles-v1').then((c) =>
        c.match(request).then(
          (r) =>
            r ||
            fetch(request)
              .then((res) => {
                if (res.ok) {
                  c.put(request, res.clone());
                }
                return res;
              })
              .catch(() => new Response('', { status: 408 }))
        )
      )
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(
      (r) =>
        r ||
        fetch(request)
          .then((res) => {
            if (res.ok && res.type === 'basic') {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
          .catch(() => {
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
          })
    )
  );
});
