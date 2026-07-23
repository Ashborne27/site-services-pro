const CACHE_NAME = 'maestro-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Ignorer les requêtes vers l'API Telegram pour ne pas les bloquer en cache
  if (event.request.url.includes('/.netlify/functions/')) return;
  
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
