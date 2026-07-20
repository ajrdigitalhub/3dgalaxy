// 3D Galaxy Admin Portal Service Worker
const CACHE_VERSION = 'v1.4.2';
const STATIC_CACHE_NAME = `3dgalaxy-static-${CACHE_VERSION}`;
const API_CACHE_NAME = `3dgalaxy-api-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `3dgalaxy-images-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/admin',
  '/manifest.webmanifest',
  '/3d-logo.png',
  '/logo.svg',
  '/favicon.ico'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[SW] Purging outdated cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests and FCM/Firebase messaging endpoints
  if (event.request.method !== 'GET') return;
  if (url.pathname.includes('/api/') || url.hostname.includes('firebase') || url.hostname.includes('supabase')) {
    return;
  }

  // Static Assets & Navigation (Network First with Cache Fallback)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/admin') || caches.match('/');
          }
        });
      })
  );
});

// Message Event - Custom commands from PwaService
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.action) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CHECK_UPDATE':
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          version: CACHE_VERSION,
          hasUpdate: false,
          timestamp: new Date().toISOString()
        });
      }
      break;

    case 'CLEAR_ALL_CACHE':
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      }).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, message: 'All caches cleared' });
        }
      });
      break;

    case 'CLEAR_API_CACHE':
      caches.delete(API_CACHE_NAME).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, message: 'API cache cleared' });
        }
      });
      break;

    case 'CLEAR_IMAGE_CACHE':
      caches.delete(IMAGE_CACHE_NAME).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, message: 'Image cache cleared' });
        }
      });
      break;

    default:
      break;
  }
});
