const CACHE = 'samadhaan-v3'
const PRECACHE = [
  // Remove routes that redirect - only cache static assets
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
  // Skip non-GET requests
  if (e.request.method !== 'GET') return
  
  // Skip auth routes
  if (e.request.url.includes('/api/auth')) return
  
  // Skip navigation requests to allow middleware redirects
  if (e.request.mode === 'navigate') return
  
  // Skip API routes (let them go through normally)
  if (e.request.url.includes('/api/')) return
  
  // Skip cross-origin requests
  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin) return
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).catch(() => {
        // Silently fail for offline scenarios
        return new Response('Offline', { status: 503 })
      })
    })
  )
})
