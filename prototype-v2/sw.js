const CACHE_NAME = 'bch-service-v4';
const ASSETS = [
  './index.html',
  './css/app.css',
  './js/db.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg'
];

// Install - cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch - cache-first for assets, network-first for API
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return resp;
    })).catch(() => {
      // Offline fallback
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});

// Sync - queue offline actions
self.addEventListener('sync', e => {
  if (e.tag === 'sync-jobs') {
    e.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Future: sync IndexedDB changes to server
  console.log('[SW] Syncing offline data...');
}
