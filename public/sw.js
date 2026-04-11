const CACHE = 'samadhaan-v2'
const PRECACHE = [
  '/dashboard/submit-new',
  '/dashboard/my-submissions',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/auth')) return
  
  // Skip service worker for navigation requests to allow middleware redirects
  if (e.request.mode === 'navigate') return
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request, { redirect: 'follow' }).catch((err) => {
        console.debug('[SW] Fetch failed natively (likely network/aborted):', e.request.url);
        throw err;
      });
    })
  )
})
