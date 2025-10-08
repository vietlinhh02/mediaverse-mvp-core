// Notification Service
const { PrismaClient } = require('@prisma/client');
// Notification queue removed - will be rebuilt from scratch
const pushService = require('./pushService');
const preferencesService = require('./preferencesService');

const prisma = new PrismaClient();
const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';

// WebSocket manager instance (will be set when initialized)
let webSocketManager = null;

/**
 * Set WebSocket manager instance for real-time notifications
 */
function setWebSocketManager(manager) {
  webSocketManager = manager;
}

class NotificationService {
  /**
   * Create and send notification
   */
  static async createNotification(userId, type, title, content, data = {}, options = {}) {
    try {
      // Determine category from type
      const category = this.mapTypeToCategory(type);

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          category,
          title,
          content,
          data,
          status: 'unread'
        }
      });

      // Send real-time notification via WebSocket if user is online
      if (webSocketManager && webSocketManager.isUserOnline(userId)) {
        try {
          await webSocketManager.sendNotification(userId, notification);
        } catch (wsError) {
          console.warn('WebSocket notification failed:', wsError.message);
        }
      }

      // Send push notification if enabled and allowed by preferences
      if (options.sendPush !== false) {
        try {
          // Check if push notifications are allowed for this category
          const pushAllowed = await preferencesService.checkNotificationAllowed(userId, type, 'push');

          if (pushAllowed) {
            const pushPayload = {
              title,
              body: message,
              icon: options.icon,
              url: options.url || `${baseUrl}/notifications/${notification.id}`,
              type,
              notificationId: notification.id,
              data
            };

            await this.sendPushNotificationQueued(userId, pushPayload, {
              priority: options.pushPriority || 'normal',
              delay: options.pushDelay || 0
            });
          } else {
            console.log(`📱 Push notification skipped for user ${userId} - not allowed by preferences`);
          }
        } catch (pushError) {
          console.warn('Push notification failed:', pushError.message);
        }
      }

      // Send via different channels based on user preferences and options
      await this.sendViaChannels(userId, notification, options);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Save notification (alias for createNotification for consistency)
   */
  static async saveNotification(userId, payload) {
    const {
      type, title, content, data = {}, options = {}
    } = payload;
    return await this.createNotification(userId, type, title, content, data, options);
  }

  /**
   * Map notification type to category
   */
  static mapTypeToCategory(type) {
    const typeToCategoryMap = {
      like: 'likes',
      comment: 'comments',
      follow: 'follows',
      upload: 'uploads',
      content: 'uploads',
      system: 'system',
      security: 'system',
      admin: 'system',
      maintenance: 'system',
      marketing: 'marketing',
      newsletter: 'marketing',
      announcement: 'system'
    };

    return typeToCategoryMap[type] || 'system';
  }

  /**
   * Create notification with advanced options (priority, channels, delay)
   */
  static async createAdvancedNotification(userId, type, title, message, data = {}, options = {}) {
    const {
      channels = ['inApp'],
      priority = 'normal',
      delay = 0,
      sendImmediate = true
    } = options;

    try {
      if (sendImmediate) {
        // Use the main notification queue for immediate processing
        // Queue removed - will be rebuilt from scratch
        console.log('Notification queue disabled - will be rebuilt');
        return { id: 'disabled' };
      }
      // Create notification record first, then queue for processing
      const notification = await this.createNotification(userId, type, title, message, data, {
        sendEmail: false, sendPush: false, sendInApp: false
      });

      // Queue for processing with specified options
      // Queue removed - will be rebuilt from scratch
      console.log('Notification queue disabled - will be rebuilt');
      return { id: 'disabled' };
    } catch (error) {
      console.error('Error creating advanced notification:', error);
      throw error;
    }
  }

  /**
   * Send batch notifications (digest, bulk, cleanup)
   */
  static async sendBatchNotifications(type, userIds, notifications = [], options = {}) {
    try {
      // Batch queue removed - will be rebuilt from scratch
      console.log('Batch queue disabled - will be rebuilt');
      return { id: 'disabled' };
    } catch (error) {
      console.error('Error sending batch notifications:', error);
      throw error;
    }
  }

  /**
   * Schedule digest notifications (weekly/monthly)
   */
  static async scheduleDigestNotifications(userIds, frequency = 'weekly') {
    const delayMs = frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 // 7 days
      : frequency === 'monthly' ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 24 * 60 * 60 * 1000; // daily default

    try {
      return await this.sendBatchNotifications('digest', userIds, [], {
        delay: delayMs,
        frequency
      });
    } catch (error) {
      console.error('Error scheduling digest notifications:', error);
      throw error;
    }
  }

  /**
   * Send bulk notification to multiple users
   */
  static async sendBulkNotificationToUsers(userIds, title, message, data = {}, channels = ['inApp'], priority = 'normal') {
    try {
      return await this.sendBatchNotifications('bulk', userIds, [{
        title,
        message,
        data,
        channels
      }], { priority });
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  /**
   * Send notification via configured channels
   */
  static async sendViaChannels(userId, notification, options) {
    try {
      const preferences = await this.getNotificationPreferences(userId);

      // Send in-app notification (always enabled for real-time features)
      if (options.sendInApp !== false) {
        await inAppQueue.add({
          userId,
          notificationId: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.content,
          data: notification.data
        });
      }

      // Send email if enabled and allowed by preferences
      if (options.sendEmail !== false) {
        const emailAllowed = await preferencesService.checkNotificationAllowed(userId, notification.type, 'email');
        if (emailAllowed) {
          await emailQueue.add({
            userId,
            notificationId: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.content,
            data: notification.data,
            email: options.email
          });
        } else {
          console.log(`📧 Email notification skipped for user ${userId} - not allowed by preferences`);
        }
      }

      // Send push notification if enabled and allowed by preferences
      if (options.sendPush !== false) {
        const pushAllowed = await preferencesService.checkNotificationAllowed(userId, notification.type, 'push');
        if (pushAllowed) {
          await pushQueue.add({
            userId,
            notificationId: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.content,
            data: notification.data
          });
        } else {
          console.log(`📱 Push notification skipped for user ${userId} - not allowed by preferences`);
        }
      }

      // Send SMS if enabled (premium feature)
      if (preferences.smsNotifications && options.sendSMS) {
        await smsQueue.add({
          userId,
          notificationId: notification.id,
          type: notification.type,
          message: notification.message,
          phoneNumber: options.phoneNumber
        });
      }
    } catch (error) {
      console.error('Error sending notification via channels:', error);
    }
  }

  /**
   * Get user's notifications with pagination
   */
  static async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      status: { not: 'deleted' }, // Exclude deleted notifications
      ...(unreadOnly && { status: 'unread' })
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          category: true,
          title: true,
          content: true,
          data: true,
          status: true,
          createdAt: true,
          readAt: true
        }
      }),
      prisma.notification.count({ where })
    ]);

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: { userId, status: 'unread' }
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only mark their own notifications
        status: 'unread'
      },
      data: {
        status: 'read',
        readAt: new Date()
      }
    });

    // Send WebSocket event if notification was actually updated
    if (result.count > 0 && webSocketManager && webSocketManager.isUserOnline(userId)) {
      try {
        await webSocketManager.sendNotificationRead(userId, notificationId);
      } catch (wsError) {
        console.warn('WebSocket read notification failed:', wsError.message);
      }
    }

    return result.count;
  }

  /**
   * Mark multiple notifications as read (batch operation)
   */
  static async markAsReadBatch(notificationIds, userId) {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId, // Ensure user can only mark their own notifications
        status: 'unread'
      },
      data: {
        status: 'read',
        readAt: new Date()
      }
    });

    // Send WebSocket event if notifications were updated
    if (result.count > 0 && webSocketManager && webSocketManager.isUserOnline(userId)) {
      try {
        await webSocketManager.sendBulkNotificationRead(userId, result.count);
      } catch (wsError) {
        console.warn('WebSocket bulk read notification failed:', wsError.message);
      }
    }

    return result.count;
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        status: 'unread'
      },
      data: {
        status: 'read',
        readAt: new Date()
      }
    });

    // Send WebSocket event if any notifications were updated
    if (result.count > 0 && webSocketManager && webSocketManager.isUserOnline(userId)) {
      try {
        await webSocketManager.sendBulkNotificationRead(userId, result.count);
      } catch (wsError) {
        console.warn('WebSocket bulk read notification failed:', wsError.message);
      }
    }

    return result.count;
  }

  /**
   * Delete notification (mark as deleted)
   */
  static async deleteNotification(notificationId, userId) {
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only delete their own notifications
        status: { not: 'deleted' }
      },
      data: {
        status: 'deleted',
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  /**
   * Delete multiple notifications (batch operation)
   */
  static async deleteNotificationsBatch(notificationIds, userId) {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId, // Ensure user can only delete their own notifications
        status: { not: 'deleted' }
      },
      data: {
        status: 'deleted',
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  /**
   * Get notifications for user with filters
   */
  static async getNotifications(userId, filters = {}) {
    const {
      page = 1,
      limit = 20,
      status = null,
      category = null,
      type = null,
      startDate = null,
      endDate = null,
      includeDeleted = false
    } = filters;

    const skip = (page - 1) * limit;
    const whereClause = {
      userId
    };

    // Add filters
    if (status) {
      whereClause.status = status;
    } else if (!includeDeleted) {
      // Exclude deleted notifications by default
      whereClause.status = { not: 'deleted' };
    }

    if (category) {
      whereClause.category = category;
    }

    if (type) {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        category: true,
        title: true,
        content: true,
        data: true,
        status: true,
        createdAt: true,
        readAt: true
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.notification.count({
      where: whereClause
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId) {
    return await prisma.notification.count({
      where: {
        userId,
        status: 'unread'
      }
    });
  }

  /**
   * Archive notification
   */
  static async archiveNotification(notificationId, userId) {
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        status: { not: 'deleted' }
      },
      data: {
        status: 'archived',
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  /**
   * Archive multiple notifications (batch operation)
   */
  static async archiveNotificationsBatch(notificationIds, userId) {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
        status: { not: 'deleted' }
      },
      data: {
        status: 'archived',
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  /**
   * Delete old notifications (cleanup job)
   */
  static async deleteOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Delete notifications older than specified days that are read/archived
      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          status: {
            in: ['read', 'archived']
          }
        }
      });

      console.log(`🧹 Deleted ${result.count} old notifications (${daysOld} days or older)`);
      return result.count;
    } catch (error) {
      console.error('❌ Failed to delete old notifications:', error);
      throw error;
    }
  }

  /**
   * Permanently delete notifications marked as deleted (cleanup job)
   */
  static async cleanupDeletedNotifications(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Permanently delete notifications that were marked as deleted more than X days ago
      const result = await prisma.notification.deleteMany({
        where: {
          status: 'deleted',
          updatedAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`🗑️ Permanently deleted ${result.count} marked-as-deleted notifications`);
      return result.count;
    } catch (error) {
      console.error('❌ Failed to cleanup deleted notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for user
   */
  static async getNotificationStats(userId) {
    const [
      total,
      unread,
      read,
      archived,
      byCategory,
      byType
    ] = await Promise.all([
      prisma.notification.count({ where: { userId, status: { not: 'deleted' } } }),
      prisma.notification.count({ where: { userId, status: 'unread' } }),
      prisma.notification.count({ where: { userId, status: 'read' } }),
      prisma.notification.count({ where: { userId, status: 'archived' } }),
      prisma.notification.groupBy({
        by: ['category'],
        where: { userId, status: { not: 'deleted' } },
        _count: true
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId, status: { not: 'deleted' } },
        _count: true
      })
    ]);

    return {
      total,
      unread,
      read,
      archived,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {})
    };
  }

  /**
   * Bulk create notifications
   */
  static async bulkCreateNotifications(notifications) {
    try {
      const notificationData = notifications.map((notification) => ({
        userId: notification.userId,
        type: notification.type,
        category: this.mapTypeToCategory(notification.type),
        title: notification.title,
        content: notification.content,
        data: notification.data || {},
        status: 'unread'
      }));

      const result = await prisma.notification.createMany({
        data: notificationData,
        skipDuplicates: true
      });

      console.log(`📝 Bulk created ${result.count} notifications`);
      return result.count;
    } catch (error) {
      console.error('❌ Failed to bulk create notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences for user
   */
  static async getNotificationPreferences(userId) {
    // Get user profile with notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user?.profile?.preferences) {
      // Return default preferences
      return {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        inAppNotifications: true,
        notificationTypes: {
          like: { enabled: true, channels: ['inApp', 'push'] },
          comment: { enabled: true, channels: ['inApp', 'push', 'email'] },
          follow: { enabled: true, channels: ['inApp', 'push'] },
          upload: { enabled: true, channels: ['inApp', 'push'] },
          system: { enabled: true, channels: ['inApp', 'push', 'email'] }
        }
      };
    }

    return user.profile.preferences.notifications || {};
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(userId, preferences) {
    await prisma.profile.upsert({
      where: { userId },
      update: {
        preferences: {
          notifications: preferences
        }
      },
      create: {
        userId,
        preferences: {
          notifications: preferences
        }
      }
    });
  }

  /**
   * Register device for push notifications
   */
  static async registerDevice(userId, deviceToken, platform) {
    // Store device token in user profile or separate device table
    // For now, store in profile preferences
    const currentPrefs = await this.getNotificationPreferences(userId);

    const updatedPrefs = {
      ...currentPrefs,
      devices: [
        ...(currentPrefs.devices || []),
        { deviceToken, platform, registeredAt: new Date() }
      ].filter((device, index, arr) => arr.findIndex((d) => d.deviceToken === device.deviceToken) === index) // Remove duplicates
    };

    await this.updateNotificationPreferences(userId, updatedPrefs);
  }

  /**
   * Unregister device from push notifications
   */
  static async unregisterDevice(userId, deviceToken) {
    const currentPrefs = await this.getNotificationPreferences(userId);

    const updatedPrefs = {
      ...currentPrefs,
      devices: (currentPrefs.devices || []).filter(
        (device) => device.deviceToken !== deviceToken
      )
    };

    await this.updateNotificationPreferences(userId, updatedPrefs);
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId) {
    const [
      totalNotifications,
      unreadNotifications,
      notificationsByType
    ] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: true
      })
    ]);

    return {
      total: totalNotifications,
      unread: unreadNotifications,
      byType: notificationsByType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {})
    };
  }

  // ===== PUSH NOTIFICATION METHODS =====

  /**
   * Save push subscription
   */
  static async savePushSubscription(userId, subscription, deviceInfo = {}) {
    return await pushService.saveSubscription(userId, subscription, deviceInfo);
  }

  /**
   * Remove push subscription
   */
  static async removePushSubscription(userId, subscriptionId) {
    return await pushService.removeSubscription(userId, subscriptionId);
  }

  /**
   * Get user's push subscriptions
   */
  static async getUserPushSubscriptions(userId) {
    return await pushService.getUserSubscriptions(userId);
  }

  /**
   * Get VAPID public key
   */
  static getVapidPublicKey() {
    return pushService.getVapidPublicKey();
  }

  /**
   * Send push notification
   */
  static async sendPushNotification(userId, payload, options = {}) {
    return await pushService.sendPush(userId, payload, options);
  }

  /**
   * Send push notification via queue
   */
  static async sendPushNotificationQueued(userId, payload, options = {}) {
    return await pushService.sendPushQueued(userId, payload, options);
  }

  /**
   * Send batch push notifications
   */
  static async sendBatchPushNotifications(userIds, payload, options = {}) {
    return await pushService.sendBatchPush(userIds, payload, options);
  }

  /**
   * Test push notification
   */
  static async testPushNotification(userId, message = 'Test notification') {
    return await pushService.testPush(userId, message);
  }

  // ===== PREFERENCES METHODS =====

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId) {
    return await preferencesService.getUserPreferences(userId);
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(userId, preferences) {
    return await preferencesService.updatePreferences(userId, preferences);
  }

  /**
   * Check if notification is allowed
   */
  static async checkNotificationAllowed(userId, category, type) {
    return await preferencesService.checkNotificationAllowed(userId, category, type);
  }

  /**
   * Reset user preferences to defaults
   */
  static async resetUserPreferences(userId) {
    return await preferencesService.resetPreferences(userId);
  }

  /**
   * Export user preferences
   */
  static async exportUserPreferences(userId) {
    return await preferencesService.exportPreferences(userId);
  }

  /**
   * Import user preferences
   */
  static async importUserPreferences(userId, preferencesData) {
    return await preferencesService.importPreferences(userId, preferencesData);
  }

  /**
   * Test email configuration by sending a test email
   */
  static async testEmail(to) {
    const EmailService = require('./emailService');
    return await EmailService.testEmail(to);
  }
}

module.exports = NotificationService;
module.exports.setWebSocketManager = setWebSocketManager;
