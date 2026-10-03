// Offline shell for the installed app (PWA). Data is never cached here:
// /api is left to the network, and only same-origin GETs with a 200 are stored.
const CACHE = 'dafinance-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  const store = (res) => {
    // Skip redirects (e.g. the sign-in page) and errors.
    if (res.ok && res.type === 'basic' && !res.redirected) {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? '/' : req, copy))
    }
    return res
  }

  if (req.mode === 'navigate') {
    // Network first so a deploy shows up at once; the cached page when offline.
    event.respondWith(fetch(req).then(store).catch(() => caches.match('/')))
  } else if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    // Hashed build files: cache first.
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(store)))
  }
})

// Budget alert tapped: bring the app to the front.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('/'))),
  )
})
