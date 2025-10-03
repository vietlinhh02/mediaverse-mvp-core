// Service Worker for Mediaverse Push Notifications
const CACHE_NAME = 'mediaverse-v1';
const API_BASE = '/api';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker installing...');
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/manifest.json'
      ]).catch(() => {
        // Ignore cache errors during install
        console.log('⚠️ Some resources failed to cache during install');
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('📱 Service Worker activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event);

  let notificationData = {};

  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('📱 Push data:', notificationData);
    } catch (error) {
      console.error('❌ Error parsing push data:', error);
      notificationData = {
        title: 'Mediaverse',
        body: event.data.text() || 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      };
    }
  } else {
    // Fallback for notifications without data
    notificationData = {
      title: 'Mediaverse',
      body: 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png'
    };
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icon-192x192.png',
    badge: notificationData.badge || '/badge-72x72.png',
    image: notificationData.image,
    tag: notificationData.tag || 'general',
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    timestamp: notificationData.timestamp || Date.now(),
    data: {
      url: notificationData.data?.url || '/',
      notificationId: notificationData.data?.notificationId,
      type: notificationData.data?.type || 'general'
    },
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('📱 Notification displayed successfully');
      })
      .catch((error) => {
        console.error('❌ Failed to display notification:', error);
      })
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const notificationData = notification.data || {};

  notification.close();

  // Handle different actions
  let url = '/';

  if (action === 'view' || !action) {
    // Default action - open the app
    url = notificationData.url || '/';
  } else if (action === 'dismiss') {
    // Dismiss action - just close, no navigation
    return;
  }

  // Mark notification as read if we have an ID
  if (notificationData.notificationId) {
    // Send read receipt to server
    fetch(`${API_BASE}/notifications/${notificationData.notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Include auth token if available
        'Authorization': `Bearer ${getStoredToken()}`
      }
    }).catch((error) => {
      console.error('❌ Failed to mark notification as read:', error);
    });
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window/tab open with the target URL
        for (let client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }

        // If no suitable window is found, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
      .catch((error) => {
        console.error('❌ Failed to handle notification click:', error);
      })
  );
});

// Background sync for failed operations
self.addEventListener('sync', (event) => {
  console.log('📱 Background sync triggered:', event.tag);

  if (event.tag === 'notification-read-sync') {
    event.waitUntil(syncReadReceipts());
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('📱 Service Worker received message:', event.data);

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;

      case 'GET_VERSION':
        event.ports[0].postMessage({ version: '1.0.0' });
        break;

      case 'UPDATE_CACHE':
        updateCache();
        break;

      default:
        console.log('📱 Unknown message type:', event.data.type);
    }
  }
});

// Helper function to get stored auth token
function getStoredToken() {
  // This would need to be implemented based on how you store tokens
  // For example, from IndexedDB or localStorage
  return localStorage.getItem('authToken') || '';
}

// Background sync for read receipts
async function syncReadReceipts() {
  try {
    // Get pending read receipts from IndexedDB or similar
    const pendingReceipts = await getPendingReadReceipts();

    for (const receipt of pendingReceipts) {
      try {
        await fetch(`${API_BASE}/notifications/${receipt.notificationId}/read`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${receipt.token}`
          }
        });

        // Remove from pending list
        await removePendingReadReceipt(receipt.id);
        console.log('✅ Synced read receipt:', receipt.notificationId);
      } catch (error) {
        console.error('❌ Failed to sync read receipt:', error);
        // Keep in pending list for next sync
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Update cache with fresh resources
async function updateCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    // Update critical resources
    await cache.addAll([
      '/manifest.json',
      '/static/js/main.js',
      '/static/css/main.css'
    ]);
    console.log('✅ Cache updated');
  } catch (error) {
    console.error('❌ Cache update failed:', error);
  }
}

// Placeholder functions for IndexedDB operations
async function getPendingReadReceipts() {
  // Implement IndexedDB logic here
  return [];
}

async function removePendingReadReceipt(id) {
  // Implement IndexedDB logic here
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('📱 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('📱 Service Worker unhandled rejection:', event.reason);
});
