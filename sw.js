const CACHE_NAME = 'foco-total-v1';
const ASSETS = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'icon-512.png',
  'https://unpkg.com/lucide@latest'
];

// Install service worker and cache assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch block to prevent installation failure if external Lucide script is unreachable at download
      return cache.addAll(ASSETS).catch(err => console.log('Aviso cache assets:', err));
    })
  );
});

// Cache falling back to network strategy
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
