// Push Notification Manager for Mediaverse
class PushNotificationManager {
  constructor() {
    this.registration = null;
    this.vapidPublicKey = null;
    this.isSubscribed = false;
    this.subscription = null;

    this.init();
  }

  /**
   * Initialize push notification manager
   */
  async init() {
    try {
      // Register service worker
      await this.registerServiceWorker();

      // Check if push notifications are supported
      if (!this.isPushSupported()) {
        console.warn('⚠️ Push notifications are not supported in this browser');
        return;
      }

      // Get VAPID public key from server
      await this.fetchVapidPublicKey();

      // Check existing subscription
      await this.checkExistingSubscription();

      console.log('📱 Push notification manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
    }
  }

  /**
   * Check if push notifications are supported
   */
  isPushSupported() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('📱 Service Worker registered successfully');

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            this.showUpdateNotification();
          }
        });
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Fetch VAPID public key from server
   */
  async fetchVapidPublicKey() {
    try {
      const response = await fetch('/api/notifications/vapid-public-key', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.vapidPublicKey = data.data.publicKey;

      console.log('📱 VAPID public key fetched successfully');
    } catch (error) {
      console.error('❌ Failed to fetch VAPID public key:', error);
      throw error;
    }
  }

  /**
   * Check for existing push subscription
   */
  async checkExistingSubscription() {
    try {
      const existingSubscription = await this.registration.pushManager.getSubscription();

      if (existingSubscription) {
        this.subscription = existingSubscription;
        this.isSubscribed = true;
        console.log('📱 Found existing push subscription');

        // Verify subscription with server
        await this.syncSubscriptionWithServer();
      } else {
        console.log('📱 No existing push subscription found');
      }
    } catch (error) {
      console.error('❌ Failed to check existing subscription:', error);
    }
  }

  /**
   * Request permission and subscribe to push notifications
   */
  async subscribe() {
    try {
      // Request notification permission
      const permission = await this.requestPermission();

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      this.isSubscribed = true;

      console.log('📱 Push subscription created:', subscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return { success: true, subscription };
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    try {
      if (!this.subscription) {
        console.warn('⚠️ No active subscription to unsubscribe from');
        return { success: false, error: 'No active subscription' };
      }

      // Remove subscription from server first
      await this.removeSubscriptionFromServer();

      // Unsubscribe locally
      const result = await this.subscription.unsubscribe();
      this.subscription = null;
      this.isSubscribed = false;

      console.log('📱 Successfully unsubscribed from push notifications');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to unsubscribe from push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        ipAddress: null, // Will be set by server from request
        platform: this.getPlatform(),
        language: navigator.language
      };

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: this.arrayBufferToBase64(subscription.getKey('auth'))
            }
          },
          deviceInfo
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📱 Subscription saved to server:', data.subscriptionId);

      return data;
    } catch (error) {
      console.error('❌ Failed to send subscription to server:', error);
      throw error;
    }
  }

  /**
   * Remove subscription from server
   */
  async removeSubscriptionFromServer() {
    try {
      if (!this.subscription) return;

      // Get subscription ID from server (this would need to be stored locally)
      const subscriptions = await this.getSubscriptionsFromServer();
      const matchingSub = subscriptions.find(sub => sub.endpoint === this.subscription.endpoint);

      if (matchingSub) {
        const response = await fetch('/api/notifications/unsubscribe-push', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscriptionId: matchingSub.id
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('📱 Subscription removed from server');
      }
    } catch (error) {
      console.error('❌ Failed to remove subscription from server:', error);
      throw error;
    }
  }

  /**
   * Sync subscription with server
   */
  async syncSubscriptionWithServer() {
    try {
      if (!this.subscription) return;

      const deviceInfo = {
        userAgent: navigator.userAgent,
        ipAddress: null,
        platform: this.getPlatform(),
        language: navigator.language
      };

      await this.sendSubscriptionToServer(this.subscription);
    } catch (error) {
      console.error('❌ Failed to sync subscription with server:', error);
    }
  }

  /**
   * Get subscriptions from server
   */
  async getSubscriptionsFromServer() {
    try {
      const response = await fetch('/api/notifications/subscriptions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.subscriptions;
    } catch (error) {
      console.error('❌ Failed to get subscriptions from server:', error);
      return [];
    }
  }

  /**
   * Test push notification
   */
  async testPush(message = 'This is a test notification') {
    try {
      const response = await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📱 Test push result:', data);

      return data;
    } catch (error) {
      console.error('❌ Failed to send test push:', error);
      throw error;
    }
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    const notification = new Notification('Mediaverse Update Available', {
      body: 'A new version is available. Refresh to update.',
      icon: '/icon-192x192.png',
      tag: 'update',
      requireInteraction: true,
      actions: [
        { action: 'refresh', title: 'Refresh Now' },
        { action: 'dismiss', title: 'Later' }
      ]
    });

    notification.onclick = (event) => {
      if (event.action === 'refresh') {
        window.location.reload();
      }
      notification.close();
    };
  }

  /**
   * Get platform information
   */
  getPlatform() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'windows';
    if (ua.includes('Mac')) return 'macos';
    if (ua.includes('Linux')) return 'linux';
    if (ua.includes('Android')) return 'android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'ios';
    return 'unknown';
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    // Get token from localStorage, sessionStorage, or wherever you store it
    return localStorage.getItem('authToken') ||
           sessionStorage.getItem('authToken') ||
           '';
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Get subscription status
   */
  getStatus() {
    return {
      isSupported: this.isPushSupported(),
      isSubscribed: this.isSubscribed,
      permission: Notification.permission,
      serviceWorker: !!this.registration,
      vapidKey: !!this.vapidPublicKey
    };
  }
}

// Create global instance
window.pushManager = new PushNotificationManager();

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PushNotificationManager;
}
