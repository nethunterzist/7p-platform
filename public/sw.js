// Service Worker for 7P Education Platform
// Optimized caching strategy for performance

const CACHE_NAME = '7p-education-v1';
const STATIC_CACHE = '7p-education-static-v1';
const DYNAMIC_CACHE = '7p-education-dynamic-v1';
const IMAGE_CACHE = '7p-education-images-v1';
const API_CACHE = '7p-education-api-v1';

// Cache configuration
const CACHE_CONFIG = {
  maxAge: {
    static: 30 * 24 * 60 * 60 * 1000,    // 30 days
    dynamic: 24 * 60 * 60 * 1000,        // 1 day
    images: 7 * 24 * 60 * 60 * 1000,     // 7 days
    api: 5 * 60 * 1000,                  // 5 minutes
  },
  maxEntries: {
    static: 100,
    dynamic: 50,
    images: 200,
    api: 30,
  },
};

// Static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/_next/static/css/',
  '/_next/static/js/',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/courses',
  '/api/user/profile',
  '/api/categories',
  '/api/instructors',
];

// Install event - pre-cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Pre-cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Pre-caching static assets...');
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/'));
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return !cacheName.includes('7p-education-') || 
                     cacheName.endsWith('-old');
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event - handle caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Route requests to appropriate caching strategies
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImage(request)) {
    event.respondWith(handleImage(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isPageRequest(request)) {
    event.respondWith(handlePageRequest(request));
  }
});

// Static asset handling (Cache First)
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_CONFIG.maxAge.static)) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      await cache.put(request, networkResponse.clone());
      await cleanupCache(STATIC_CACHE, CACHE_CONFIG.maxEntries.static);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Static asset fetch failed:', error);
    
    // Return cached version if network fails
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Image handling (Cache First with stale-while-revalidate)
async function handleImage(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_CONFIG.maxAge.images)) {
      // Return cached image and update in background if stale
      if (isStale(cachedResponse, CACHE_CONFIG.maxAge.images / 2)) {
        // Update in background
        fetch(request).then(async (networkResponse) => {
          if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
            await cleanupCache(IMAGE_CACHE, CACHE_CONFIG.maxEntries.images);
          }
        }).catch(() => {
          // Ignore background update failures
        });
      }
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      await cleanupCache(IMAGE_CACHE, CACHE_CONFIG.maxEntries.images);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Image fetch failed:', error);
    
    // Return cached version if available
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// API request handling (Network First with short cache)
async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(API_CACHE);
    
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      await cache.put(request, networkResponse.clone());
      await cleanupCache(API_CACHE, CACHE_CONFIG.maxEntries.api);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] API request failed, trying cache:', error);
    
    // Fallback to cache
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_CONFIG.maxAge.api)) {
      // Add stale indicator
      const response = cachedResponse.clone();
      response.headers.set('X-Cache-Status', 'stale');
      return response;
    }
    
    throw error;
  }
}

// Page request handling (Network First with cache fallback)
async function handlePageRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    // Try network first for pages
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      await cleanupCache(DYNAMIC_CACHE, CACHE_CONFIG.maxEntries.dynamic);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Page request failed, trying cache:', error);
    
    // Fallback to cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Last resort: return offline page
    return caches.match('/offline.html') || new Response(
      '<h1>Offline</h1><p>İnternet bağlantısını kontrol edin ve tekrar deneyin.</p>',
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 503,
        statusText: 'Service Unavailable'
      }
    );
  }
}

// Utility functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.includes('.css') ||
    url.pathname.includes('.js') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico'
  );
}

function isImage(request) {
  const url = new URL(request.url);
  return (
    request.destination === 'image' ||
    /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)
  );
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith('/api/') &&
    CACHEABLE_APIS.some(api => url.pathname.startsWith(api))
  );
}

function isPageRequest(request) {
  return request.mode === 'navigate' || 
         request.headers.get('Accept')?.includes('text/html');
}

function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  
  const responseTime = new Date(dateHeader).getTime();
  return Date.now() - responseTime > maxAge;
}

function isStale(response, staleTime) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  
  const responseTime = new Date(dateHeader).getTime();
  return Date.now() - responseTime > staleTime;
}

async function cleanupCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    if (requests.length > maxEntries) {
      // Delete oldest entries
      const entriesToDelete = requests.length - maxEntries;
      const oldestRequests = requests.slice(0, entriesToDelete);
      
      await Promise.all(
        oldestRequests.map(request => cache.delete(request))
      );
      
      console.log(`[SW] Cleaned up ${entriesToDelete} entries from ${cacheName}`);
    }
  } catch (error) {
    console.warn('[SW] Cache cleanup failed:', error);
  }
}

// Background sync for failed API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync logic
      handleBackgroundSync()
    );
  }
});

async function handleBackgroundSync() {
  // Implement background sync logic for failed requests
  console.log('[SW] Performing background sync...');
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || '7P Education', {
        body: data.body || 'Yeni bir bildiriminiz var.',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        data: data.data || {},
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      // Focus existing client or open new one
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      getCacheStatus().then((status) => {
        event.ports[0].postMessage(status);
      })
    );
  }
});

async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      status[cacheName] = {
        count: requests.length,
        size: await getCacheSize(cache, requests),
      };
    }
    
    return status;
  } catch (error) {
    console.warn('[SW] Cache status check failed:', error);
    return {};
  }
}

async function getCacheSize(cache, requests) {
  let totalSize = 0;
  
  try {
    for (const request of requests.slice(0, 10)) { // Sample first 10 for performance
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  } catch (error) {
    // Ignore individual errors
  }
  
  return totalSize;
}

console.log('[SW] Service worker loaded and ready!');