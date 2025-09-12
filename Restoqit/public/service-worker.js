const CACHE_NAME = 'restoqit-cache-v1';
const OFFLINE_URL = '/offline.html';
const urlsToCache = [
    '/css/style.css',
    '/js/main.js',
    '/assets/icon.png',
    '/manifest.json',
    OFFLINE_URL
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
        .then(() => self.skipWaiting()) 

    );
});

self.addEventListener('fetch', (event) => {

    const url = new URL(event.request.url);
    const isStaticAsset = urlsToCache.some(path => url.pathname.endsWith(path));

    event.respondWith(
        fetch(event.request)
        .catch(async () => {

            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }

            if (!cachedResponse) {
                return caches.match(OFFLINE_URL);
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => self.clients.claim()) 

    );
});

