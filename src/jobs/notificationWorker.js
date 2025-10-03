// Notification processing worker
const {
  emailQueue,
  pushQueue,
  smsQueue,
  inAppQueue,
  notificationQueue,
  batchQueue,
  digestQueue,
  bulkDigestQueue,
  PRIORITY
} = require('./notificationQueue');
const EmailService = require('../modules/notifications/services/emailService');
const WebSocketManager = require('../modules/notifications/websocket/webSocketManager');
const NotificationService = require('../modules/notifications/services/notificationService');

function setupNotificationWorkers() {
  // Email notification worker
  emailQueue.process(async (job) => {
    const {
      userId, notificationId, type, title, message, data, email
    } = job.data;

    try {
      console.log(`Processing email notification job ${job.id} for user ${userId}`);

      // Get user email if not provided
      let recipientEmail = email;
      if (!recipientEmail) {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });
        recipientEmail = user?.email;
      }

      if (!recipientEmail) {
        throw new Error('No email address found for user');
      }

      // Send email using template
      await EmailService.sendNotification(
        recipientEmail,
        title,
        {
          title,
          message,
          userName: data?.userName || 'User',
          actionUrl: data?.actionUrl,
          ...data
        },
        'notification'
      );

      console.log(`Email notification sent to ${recipientEmail}`);
      return { success: true, email: recipientEmail };
    } catch (error) {
      console.error(`Email notification failed for job ${job.id}:`, error);
      throw error;
    }
  });

  // SMS notification worker
  smsQueue.process(async (job) => {
    const {
      userId, notificationId, type, message, phoneNumber
    } = job.data;

    try {
      console.log(`Processing SMS notification job ${job.id} for user ${userId}`);

      // Get user phone number if not provided
      let recipientPhone = phoneNumber;
      if (!recipientPhone) {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const profile = await prisma.profile.findUnique({
          where: { userId },
          select: { phoneNumber: true }
        });
        recipientPhone = profile?.phoneNumber;
      }

      if (!recipientPhone) {
        throw new Error('No phone number found for user');
      }

      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      // For now, just log the SMS
      console.log(`SMS would be sent to ${recipientPhone}: ${message}`);

      // Placeholder for actual SMS sending
      // await smsService.sendSMS(recipientPhone, message);

      return { success: true, phone: recipientPhone };
    } catch (error) {
      console.error(`SMS notification failed for job ${job.id}:`, error);
      throw error;
    }
  });

  // In-app notification worker
  inAppQueue.process(async (job) => {
    const {
      userId, notificationId, type, title, message, data
    } = job.data;

    try {
      console.log(`Processing in-app notification job ${job.id} for user ${userId}`);

      // Send real-time notification via WebSocket
      if (global.webSocketManager) {
        await global.webSocketManager.sendToUser(userId, 'notification', {
          id: notificationId,
          type,
          title,
          message,
          data,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('WebSocket manager not available, in-app notification not sent');
      }

      console.log(`In-app notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error(`In-app notification failed for job ${job.id}:`, error);
      throw error;
    }
  });

  // Main notification processing worker (handles complex notification logic)
  notificationQueue.process(async (job) => {
    const {
      userId,
      type,
      title,
      message,
      data,
      channels = ['inApp'],
      priority = 'normal'
    } = job.data;

    try {
      console.log(`Processing notification job ${job.id} for user ${userId} (${type})`);

      // Create notification record in database
      const notification = await NotificationService.createNotification(
        userId,
        type,
        title,
        message,
        data || {},
        { sendEmail: false, sendPush: false, sendInApp: false } // We'll handle channels manually
      );

      // Process each channel based on user preferences
      const preferences = await NotificationService.getNotificationPreferences(userId);
      const results = [];

      for (const channel of channels) {
        try {
          switch (channel) {
            case 'email':
              if (preferences.emailNotifications) {
                await emailQueue.add({
                  userId,
                  notificationId: notification.id,
                  type,
                  title,
                  message,
                  data
                }, {
                  priority: priority === 'high' ? PRIORITY.HIGH
                    : priority === 'low' ? PRIORITY.LOW : PRIORITY.NORMAL
                });
                results.push({ channel: 'email', queued: true });
              }
              break;

            case 'push':
              if (preferences.pushNotifications) {
                await pushQueue.add({
                  userId,
                  notificationId: notification.id,
                  type,
                  title,
                  message,
                  data
                }, {
                  priority: priority === 'high' ? PRIORITY.HIGH
                    : priority === 'low' ? PRIORITY.LOW : PRIORITY.NORMAL
                });
                results.push({ channel: 'push', queued: true });
              }
              break;

            case 'sms':
              if (preferences.smsNotifications) {
                await smsQueue.add({
                  userId,
                  notificationId: notification.id,
                  type,
                  message
                }, {
                  priority: priority === 'high' ? PRIORITY.HIGH
                    : priority === 'low' ? PRIORITY.LOW : PRIORITY.NORMAL
                });
                results.push({ channel: 'sms', queued: true });
              }
              break;

            case 'inApp':
              await inAppQueue.add({
                userId,
                notificationId: notification.id,
                type,
                title,
                message,
                data
              }, {
                priority: priority === 'high' ? PRIORITY.HIGH
                  : priority === 'low' ? PRIORITY.LOW : PRIORITY.NORMAL
              });
              results.push({ channel: 'inApp', queued: true });
              break;
          }
        } catch (channelError) {
          console.error(`Failed to queue ${channel} notification:`, channelError);
          results.push({ channel, error: channelError.message });
        }
      }

      console.log(`Notification processed for ${channels.length} channels`);
      return { success: true, notificationId: notification.id, results };
    } catch (error) {
      console.error(`Notification processing failed for job ${job.id}:`, error);
      throw error;
    }
  });

  // Batch notifications worker (for digests, bulk operations)
  batchQueue.process(async (job) => {
    const {
      type, userIds, notifications, options = {}
    } = job.data;

    try {
      console.log(`Processing batch notification job ${job.id} for ${userIds?.length || 0} users`);

      const results = [];
      let successCount = 0;
      let failCount = 0;

      switch (type) {
        case 'digest':
          // Weekly/monthly digest notifications
          for (const userId of userIds) {
            try {
              // Get unread notifications count for user
              const stats = await NotificationService.getNotificationStats(userId);
              if (stats.unread > 0) {
                await notificationQueue.add({
                  userId,
                  type: 'system',
                  title: 'Notification Digest',
                  message: `You have ${stats.unread} unread notifications`,
                  data: { digest: true, unreadCount: stats.unread },
                  channels: ['email'], // Digests typically go to email
                  priority: 'low'
                });
                successCount++;
              }
            } catch (error) {
              console.error(`Failed to create digest for user ${userId}:`, error);
              failCount++;
            }
          }
          break;

        case 'bulk':
          // Send same notification to multiple users
          const {
            title, message, data, channels = ['inApp']
          } = notifications[0] || {};
          for (const userId of userIds) {
            try {
              await notificationQueue.add({
                userId,
                type: 'system',
                title,
                message,
                data,
                channels,
                priority: options.priority || 'normal'
              });
              successCount++;
            } catch (error) {
              console.error(`Failed to send bulk notification to user ${userId}:`, error);
              failCount++;
            }
          }
          break;

        case 'cleanup':
          // Clean up old notifications
          const { olderThanDays = 30 } = options;
          try {
            // This would need a new service method to bulk delete old notifications
            console.log(`Cleaning up notifications older than ${olderThanDays} days`);
            // await NotificationService.cleanupOldNotifications(olderThanDays);
            results.push({ action: 'cleanup', olderThanDays, status: 'completed' });
          } catch (error) {
            console.error('Cleanup failed:', error);
            results.push({ action: 'cleanup', error: error.message });
          }
          break;

        default:
          throw new Error(`Unknown batch notification type: ${type}`);
      }

      console.log(`Batch notification processed: ${successCount} success, ${failCount} failed`);
      return {
        success: true,
        type,
        successCount,
        failCount,
        totalProcessed: successCount + failCount,
        results
      };
    } catch (error) {
      console.error(`Batch notification failed for job ${job.id}:`, error);
      throw error;
    }
  });

  // Push notification worker
  pushQueue.process(async (job) => {
    const { userId, payload, options } = job.data;

    try {
      console.log(`Processing push notification for user ${userId}, job: ${job.id}`);

      const result = await NotificationService.sendPushNotification(userId, payload, options);

      console.log(`Push notification sent for user ${userId}: ${result.successful}/${result.total} successful`);
      return result;
    } catch (error) {
      console.error(`Push notification failed for job ${job.id}:`, error);
      throw error;
    }
  });

  // Weekly digest worker
  digestQueue.process(async (job) => {
    console.log(`Processing weekly digest job: ${job.id}`);

    try {
      const { userId, testMode = false } = job.data;

      if (testMode) {
        console.log(`Test mode: Simulating digest for user ${userId}`);
        return { success: true, testMode: true };
      }

      const RecommendationService = require('../modules/recommendations/recommendationService');
      const result = await RecommendationService.sendWeeklyDigest(userId);

      console.log(`Weekly digest processed for user ${userId}:`, result);
      return result;
    } catch (error) {
      console.error('Weekly digest job failed:', error);
      throw error;
    }
  });

  // Bulk digest worker
  bulkDigestQueue.process(async (job) => {
    console.log(`Processing bulk weekly digest job: ${job.id}`);

    try {
      const RecommendationService = require('../modules/recommendations/recommendationService');
      const result = await RecommendationService.sendBulkWeeklyDigests();

      console.log('Bulk weekly digest processed:', result);
      return result;
    } catch (error) {
      console.error('Bulk weekly digest job failed:', error);
      throw error;
    }
  });

  console.log('Notification workers are running...');
}

module.exports = { setupNotificationWorkers };
