const VERSION = 'mountkh-v7'
const SHELL_CACHE = `shell-${VERSION}`
const TILE_CACHE = `tiles-${VERSION}`
const SHELL_URLS = ['/', '/index.html', '/manifest.json', '/mountains-kh.json', '/favicon.ico']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== TILE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && (response.type === 'basic' || response.type === 'opaque')) {
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match('/index.html')) || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never intercept third-party APIs or tile providers with a custom strategy.
  if (url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('.google.com')) {
    event.respondWith(cacheFirst(request, TILE_CACHE))
    return
  }
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/maps/') || url.pathname.includes('nominatim')) return

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(cacheFirst(request, SHELL_CACHE))
})
