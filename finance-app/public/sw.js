// Service Worker for Finance App
// Provides offline support, caching, and push notifications

const CACHE_NAME = 'finance-app-v1';
const STATIC_CACHE = 'finance-app-static-v1';
const DYNAMIC_CACHE = 'finance-app-dynamic-v1';
const API_CACHE = 'finance-app-api-v1';

// Cache duration configurations
const CACHE_DURATIONS = {
  STATIC: 86400000, // 24 hours
  DYNAMIC: 3600000, // 1 hour
  API: 300000, // 5 minutes
  OFFLINE: 604800000, // 7 days
};

// Assets to precache
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/transactions',
  '/accounts',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/_next/static/css/app/globals.css',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/health',
  '/api/user/profile',
  '/api/dashboard/summary',
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('Precaching static assets...');
        
        // Cache static assets with error handling
        const cachePromises = STATIC_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (error) {
            console.warn(`Failed to cache ${url}:`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        console.log('Static assets cached');
        
        // Skip waiting to activate new service worker immediately
        self.skipWaiting();
      } catch (error) {
        console.error('Service Worker installation failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map(name => caches.delete(name));
        
        await Promise.all(deletePromises);
        console.log('Old caches cleared');
        
        // Claim all clients
        await self.clients.claim();
      } catch (error) {
        console.error('Service Worker activation failed:', error);
      }
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { origin, pathname } = new URL(request.url);
  
  // Skip caching for non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip caching for chrome-extension requests
  if (!request.url.startsWith('http')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Handle different types of requests with appropriate strategies
    if (isStaticAsset(url)) {
      return await cacheFirstStrategy(request, STATIC_CACHE);
    }
    
    if (isApiRequest(url)) {
      return await networkFirstStrategy(request, API_CACHE);
    }
    
    if (isPageRequest(url)) {
      return await staleWhileRevalidateStrategy(request, DYNAMIC_CACHE);
    }
    
    // Default strategy for other requests
    return await networkFirstStrategy(request, DYNAMIC_CACHE);
  } catch (error) {
    console.error('Request handling failed:', error);
    return await getOfflineFallback(request);
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if cached response is still fresh
    const cacheTime = parseInt(cachedResponse.headers.get('sw-cache-time') || '0');
    const age = Date.now() - cacheTime;
    
    if (age < CACHE_DURATIONS.STATIC) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(cacheName);
      
      // Add timestamp to cached response
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cache-time': Date.now().toString(),
        },
      });
      
      await cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    return cachedResponse || await getOfflineFallback(request);
  }
}

// Network-first strategy for API requests
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(cacheName);
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cache-time': Date.now().toString(),
        },
      });
      
      await cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      const cacheTime = parseInt(cachedResponse.headers.get('sw-cache-time') || '0');
      const age = Date.now() - cacheTime;
      
      // Return cached response if it's not too old
      if (age < CACHE_DURATIONS.API * 2) {
        return cachedResponse;
      }
    }
    
    return await getOfflineFallback(request);
  }
}

// Stale-while-revalidate strategy for pages
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        const responseClone = response.clone();
        caches.open(cacheName).then(cache => {
          const modifiedResponse = new Response(responseClone.body, {
            status: responseClone.status,
            statusText: responseClone.statusText,
            headers: {
              ...Object.fromEntries(responseClone.headers.entries()),
              'sw-cache-time': Date.now().toString(),
            },
          });
          cache.put(request, modifiedResponse);
        });
      }
      return response;
    })
    .catch(() => null);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network response if no cache
  return await fetchPromise || await getOfflineFallback(request);
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.includes('/_next/static/') || 
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.includes('/favicon');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isPageRequest(url) {
  return !isStaticAsset(url) && !isApiRequest(url) && !url.pathname.includes('.');
}

async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  if (isPageRequest(url)) {
    const offlineCache = await caches.open(STATIC_CACHE);
    const offlinePage = await offlineCache.match('/offline');
    
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  if (isApiRequest(url)) {
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This request is not available offline',
        timestamp: Date.now(),
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  
  return new Response('Network error', {
    status: 408,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-transactions':
      event.waitUntil(syncTransactions());
      break;
    case 'sync-documents':
      event.waitUntil(syncDocuments());
      break;
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

async function syncTransactions() {
  try {
    console.log('Syncing transactions...');
    
    // Get pending transactions from IndexedDB
    const pendingTransactions = await getPendingTransactions();
    
    for (const transaction of pendingTransactions) {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transaction),
        });
        
        if (response.ok) {
          await removePendingTransaction(transaction.id);
          console.log('Transaction synced:', transaction.id);
        }
      } catch (error) {
        console.error('Failed to sync transaction:', transaction.id, error);
      }
    }
  } catch (error) {
    console.error('Transaction sync failed:', error);
  }
}

async function syncDocuments() {
  try {
    console.log('Syncing documents...');
    
    const pendingDocuments = await getPendingDocuments();
    
    for (const document of pendingDocuments) {
      try {
        const formData = new FormData();
        formData.append('file', document.file);
        formData.append('metadata', JSON.stringify(document.metadata));
        
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          await removePendingDocument(document.id);
          console.log('Document synced:', document.id);
        }
      } catch (error) {
        console.error('Failed to sync document:', document.id, error);
      }
    }
  } catch (error) {
    console.error('Document sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('Push notification received:', data);
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: data.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/icon-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icon-dismiss.png'
        }
      ],
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Finance App', options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });
      
      if (action === 'dismiss') {
        return;
      }
      
      let targetUrl = '/dashboard';
      
      if (data.url) {
        targetUrl = data.url;
      } else if (action === 'view' && data.transactionId) {
        targetUrl = `/transactions/${data.transactionId}`;
      }
      
      // Check if app is already open
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        const targetUrlObj = new URL(targetUrl, self.location.origin);
        
        if (clientUrl.origin === targetUrlObj.origin) {
          await client.navigate(targetUrl);
          return client.focus();
        }
      }
      
      // Open new window if app is not open
      return self.clients.openWindow(targetUrl);
    })()
  );
});

// Utility functions for IndexedDB operations (simplified)
async function getPendingTransactions() {
  // Implementation would interact with IndexedDB
  return [];
}

async function removePendingTransaction(id) {
  // Implementation would remove from IndexedDB
}

async function getPendingDocuments() {
  // Implementation would interact with IndexedDB
  return [];
}

async function removePendingDocument(id) {
  // Implementation would remove from IndexedDB
}

// Periodic background cleanup
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHES') {
    event.waitUntil(cleanupCaches());
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function cleanupCaches() {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const cacheTime = parseInt(response.headers.get('sw-cache-time') || '0');
      const age = Date.now() - cacheTime;
      
      // Remove expired entries
      if (age > CACHE_DURATIONS.OFFLINE) {
        await cache.delete(request);
      }
    }
  }
}

console.log('Service Worker loaded');