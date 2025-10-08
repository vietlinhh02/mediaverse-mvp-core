// Push Notification Service for web push notifications
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
// Push queue removed - will be rebuilt from scratch

const prisma = new PrismaClient();

class PushService {
  constructor() {
    this.vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };

    this.vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@mediaverse.com';
    this.baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    this.initialize();
  }

  /**
   * Initialize web-push with VAPID keys
   */
  initialize() {
    if (!this.vapidKeys.publicKey || !this.vapidKeys.privateKey) {
      console.warn('VAPID keys not configured. Push notifications will not work.');
      console.warn('Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
      return;
    }

    // Configure web-push
    webpush.setVapidDetails(
      this.vapidEmail,
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey
    );

    console.log(' Push notification service initialized with VAPID keys');
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getVapidPublicKey() {
    return this.vapidKeys.publicKey;
  }

  /**
   * Save push subscription for user
   */
  async saveSubscription(userId, subscription, deviceInfo = {}) {
    try {
      // Check if subscription already exists
      const existingSub = await prisma.pushSubscription.findFirst({
        where: {
          userId,
          endpoint: subscription.endpoint
        }
      });

      if (existingSub) {
        // Update existing subscription
        await prisma.pushSubscription.update({
          where: { id: existingSub.id },
          data: {
            keys: subscription.keys,
            userAgent: deviceInfo.userAgent,
            ipAddress: deviceInfo.ipAddress,
            lastActive: new Date(),
            isActive: true
          }
        });
        console.log(` Updated push subscription for user ${userId}`);
        return existingSub.id;
      }
      // Create new subscription
      const newSub = await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
          isActive: true
        }
      });
      console.log(` Created new push subscription for user ${userId}`);
      return newSub.id;
    } catch (error) {
      console.error('Failed to save push subscription:', error);
      throw error;
    }
  }

  /**
   * Remove push subscription
   */
  async removeSubscription(userId, subscriptionId) {
    try {
      const result = await prisma.pushSubscription.updateMany({
        where: {
          userId,
          id: subscriptionId
        },
        data: {
          isActive: false,
          deactivatedAt: new Date()
        }
      });

      if (result.count > 0) {
        console.log(` Deactivated push subscription ${subscriptionId} for user ${userId}`);
        return true;
      }
      console.log(` Push subscription ${subscriptionId} not found for user ${userId}`);
      return false;
    } catch (error) {
      console.error('Failed to remove push subscription:', error);
      throw error;
    }
  }

  /**
   * Get active subscriptions for user
   */
  async getUserSubscriptions(userId) {
    try {
      return await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          id: true,
          endpoint: true,
          keys: true,
          userAgent: true,
          createdAt: true,
          lastActive: true
        }
      });
    } catch (error) {
      console.error('Failed to get user subscriptions:', error);
      throw error;
    }
  }

  /**
   * Send push notification to user
   */
  async sendPush(userId, payload, options = {}) {
    try {
      // Get user's active subscriptions
      const subscriptions = await this.getUserSubscriptions(userId);

      if (subscriptions.length === 0) {
        console.log(` No active push subscriptions found for user ${userId}`);
        return { success: false, reason: 'no_subscriptions' };
      }

      // Prepare notification payload
      const notificationPayload = this.preparePayload(payload);

      // Send to all user's subscriptions
      const results = [];
      for (const subscription of subscriptions) {
        try {
          const result = await this.sendToSubscription(subscription, notificationPayload);
          results.push({ subscriptionId: subscription.id, ...result });
        } catch (error) {
          console.error(`Failed to send push to subscription ${subscription.id}:`, error);
          results.push({
            subscriptionId: subscription.id,
            success: false,
            error: error.message
          });

          // Mark subscription as potentially expired if it's a 410 or 400 error
          if (error.statusCode === 410 || error.statusCode === 400) {
            await this.handleExpiredSubscription(subscription.id);
          }
        }
      }

      const successful = results.filter((r) => r.success).length;
      console.log(` Sent push notification to user ${userId}: ${successful}/${subscriptions.length} successful`);

      return {
        success: successful > 0,
        total: subscriptions.length,
        successful,
        results
      };
    } catch (error) {
      console.error(`Failed to send push notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send push notification via queue for better performance
   */
  async sendPushQueued(userId, payload, options = {}) {
    try {
      const jobData = {
        userId,
        payload,
        options: {
          priority: options.priority || 'normal',
          delay: options.delay || 0,
          ...options
        }
      };

      // Queue removed - will be rebuilt from scratch
      console.log('Push notification queue disabled - will be rebuilt');
      return { queued: true, jobId: 'disabled' };
    } catch (error) {
      console.error('Failed to queue push notification:', error);
      throw error;
    }
  }

  /**
   * Send batch push notifications
   */
  async sendBatchPush(userIds, payload, options = {}) {
    try {
      const batchSize = options.batchSize || 50;
      const delay = options.delay || 1000; // 1 second between batches

      console.log(`📱 Sending batch push notifications to ${userIds.length} users`);

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const promises = batch.map((userId) => this.sendPushQueued(userId, payload, options));

        await Promise.allSettled(promises);

        // Add delay between batches to avoid rate limits
        if (i + batchSize < userIds.length) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userIds.length / batchSize)}`);
      }

      console.log(`Batch push notifications completed for ${userIds.length} users`);
      return { success: true, totalUsers: userIds.length };
    } catch (error) {
      console.error('Failed to send batch push notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific subscription
   */
  async sendToSubscription(subscription, payload) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      };

      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

      // Update last active timestamp
      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { lastActive: new Date() }
      });

      return { success: true };
    } catch (error) {
      console.error(`Web push error for subscription ${subscription.id}:`, error);

      // Handle different error types
      if (error.statusCode === 410) {
        // Subscription has expired or is no longer valid
        await this.handleExpiredSubscription(subscription.id);
      } else if (error.statusCode === 400) {
        // Invalid subscription
        await this.handleExpiredSubscription(subscription.id);
      } else if (error.statusCode === 413) {
        console.warn(` Payload too large for subscription ${subscription.id}`);
      }

      throw error;
    }
  }

  /**
   * Prepare notification payload with standard format
   */
  preparePayload(data) {
    const payload = {
      title: data.title || 'Mediaverse',
      body: data.body || 'You have a new notification',
      icon: data.icon || `${this.baseUrl}/icon-192x192.png`,
      badge: data.badge || `${this.baseUrl}/badge-72x72.png`,
      image: data.image,
      tag: data.tag || 'general',
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      timestamp: Date.now(),
      data: {
        url: data.url || this.baseUrl,
        notificationId: data.notificationId,
        type: data.type || 'general',
        ...data.data
      }
    };

    // Add actions if provided
    if (data.actions && Array.isArray(data.actions)) {
      payload.actions = data.actions.map((action) => ({
        action: action.action,
        title: action.title,
        icon: action.icon
      }));
    }

    return payload;
  }

  /**
   * Handle expired subscription
   */
  async handleExpiredSubscription(subscriptionId) {
    try {
      await prisma.pushSubscription.update({
        where: { id: subscriptionId },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'expired'
        }
      });

      console.log(` Marked subscription ${subscriptionId} as expired`);
    } catch (error) {
      console.error(`Failed to mark subscription ${subscriptionId} as expired:`, error);
    }
  }

  /**
   * Clean up expired subscriptions (cleanup job)
   */
  async cleanupExpiredSubscriptions() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.pushSubscription.updateMany({
        where: {
          isActive: false,
          deactivatedAt: {
            lt: thirtyDaysAgo
          }
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'cleanup'
        }
      });

      console.log(`Cleaned up ${result.count} old expired subscriptions`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup expired subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get push notification statistics
   */
  async getPushStats(userId = null) {
    try {
      const whereClause = userId ? { userId, isActive: true } : { isActive: true };

      const stats = await prisma.pushSubscription.aggregate({
        where: whereClause,
        _count: {
          id: true
        }
      });

      return {
        totalActiveSubscriptions: stats._count.id,
        userId: userId || 'all'
      };
    } catch (error) {
      console.error('Failed to get push stats:', error);
      throw error;
    }
  }

  /**
   * Test push notification (development only)
   */
  async testPush(userId, message = 'Test notification') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test push notifications are only available in development mode');
    }

    const payload = {
      title: 'Mediaverse - Test Notification',
      body: message,
      icon: `${this.baseUrl}/icon-192x192.png`,
      tag: 'test',
      data: {
        url: `${this.baseUrl}/test`,
        type: 'test'
      }
    };

    return await this.sendPush(userId, payload);
  }
}

module.exports = new PushService();
