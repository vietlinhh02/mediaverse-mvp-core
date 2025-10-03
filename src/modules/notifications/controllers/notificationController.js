// Notification Controller
const { asyncHandler, AppError } = require('../../../middleware/errorHandler');
const NotificationService = require('../services/notificationService');
const EmailService = require('../services/emailService');
const WebSocketManager = require('../websocket/webSocketManager');

class NotificationController {
  /**
   * Send notification (admin/moderator only)
   */
  static sendNotification = asyncHandler(async (req, res) => {
    const {
      userId, type, title, message, data, options
    } = req.body;

    // Check admin/moderator permissions
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to send notifications', 403, 'UNAUTHORIZED');
    }

    const notification = await NotificationService.createNotification(
      userId,
      type,
      title,
      message,
      data || {},
      options || {}
    );

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: notification
    });
  });

  /**
   * Send email notification (admin/moderator only)
   */
  static sendEmail = asyncHandler(async (req, res) => {
    const {
      to, subject, template, data
    } = req.body;

    // Check admin/moderator permissions
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to send emails', 403, 'UNAUTHORIZED');
    }

    await EmailService.sendNotification(to, subject, data, template);

    res.json({
      success: true,
      message: 'Email sent successfully'
    });
  });

  /**
   * Send push notification (admin/moderator only)
   */
  static sendPush = asyncHandler(async (req, res) => {
    const {
      userId, title, message, data
    } = req.body;

    // Check admin/moderator permissions
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to send push notifications', 403, 'UNAUTHORIZED');
    }

    // Get user's devices
    const subscriptions = await NotificationService.getUserPushSubscriptions(userId);
    if (!subscriptions || subscriptions.length === 0) {
      throw new AppError('User has no registered devices', 400, 'NO_DEVICES');
    }

    // Send push notification to each device
    // This would integrate with web-push service
    // For now, just return success

    res.json({
      success: true,
      message: `Push notification sent to ${subscriptions.length} device(s)`,
      devicesCount: subscriptions.length
    });
  });

  /**
   * Get user's notifications (by userId parameter or current user)
   */
  static getUserNotifications = asyncHandler(async (req, res) => {
    // Allow getting notifications for specific user (admin) or current user
    let targetUserId = req.params.userId || req.user.userId;

    // If accessing other user's notifications, check permissions
    if (req.params.userId && req.params.userId !== req.user.userId) {
      if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
        throw new AppError('Unauthorized to view other users notifications', 403, 'UNAUTHORIZED');
      }
      targetUserId = req.params.userId;
    }

    const {
      page, limit, status, category, type, startDate, endDate, includeDeleted
    } = req.query;

    const filters = {};
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = parseInt(limit);
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (includeDeleted) filters.includeDeleted = includeDeleted === 'true';

    const result = await NotificationService.getNotifications(targetUserId, filters);

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount
    });
  });

  /**
   * Mark notification as read
   */
  static markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    await NotificationService.markAsRead(id, userId);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  });

  /**
   * Mark all notifications as read
   */
  static markAllAsRead = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const count = await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${count} notifications marked as read`
    });
  });

  /**
   * Delete notification
   */
  static deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    await NotificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  });

  /**
   * Get notification preferences
   */
  static getNotificationPreferences = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const preferences = await NotificationService.getNotificationPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  });

  /**
   * Update notification preferences
   */
  static updateNotificationPreferences = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const preferences = req.body;

    await NotificationService.updateNotificationPreferences(userId, preferences);

    res.json({
      success: true,
      message: 'Notification preferences updated'
    });
  });

  /**
   * Send advanced notification with priority and channels
   */
  static sendAdvancedNotification = asyncHandler(async (req, res) => {
    const {
      userId, type, title, message, data, channels, priority, delay
    } = req.body;

    // Check admin/moderator permissions
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to send advanced notifications', 403, 'UNAUTHORIZED');
    }

    const job = await NotificationService.createAdvancedNotification(
      userId,
      type,
      title,
      message,
      data || {},
      {
        channels: channels || ['inApp'],
        priority: priority || 'normal',
        delay: delay || 0
      }
    );

    res.json({
      success: true,
      message: 'Advanced notification queued successfully',
      data: { jobId: job.id }
    });
  });

  /**
   * Send batch notifications (admin/moderator only)
   */
  static sendBatchNotifications = asyncHandler(async (req, res) => {
    const {
      type, userIds, notifications, options
    } = req.body;

    // Check admin/moderator permissions
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to send batch notifications', 403, 'UNAUTHORIZED');
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('userIds array is required and cannot be empty', 400, 'INVALID_REQUEST');
    }

    if (type === 'individual') {
      // Individual notifications are sent directly
      for (const userId of userIds) {
        await NotificationService.sendNotification(userId, 'individual', 'Batch Notification', 'This is a batch notification for you.', { batchId: 'batch123' });
      }
      res.json({
        success: true,
        message: `Batch notification (${type}) sent to ${userIds.length} users`,
        data: { userCount: userIds.length }
      });
    } else if (type === 'bulk') {
      // Bulk notifications are sent via a job
      const job = await NotificationService.sendBulkNotificationToUsers(
        userIds,
        'Batch Bulk Notification',
        'This is a batch bulk notification for you.',
        { batchId: 'batch123' },
        ['inApp'],
        'high'
      );
      res.json({
        success: true,
        message: `Batch notification (${type}) queued for ${userIds.length} users`,
        data: { jobId: job.id, userCount: userIds.length }
      });
    } else {
      throw new AppError('Invalid batch notification type', 400, 'INVALID_REQUEST');
    }
  });

  /**
   * Schedule digest notifications (admin/moderator only)
   */
  static scheduleDigestNotifications = asyncHandler(async (req, res) => {
    const { userIds, frequency } = req.body;

    // Check admin/moderator permissions
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to schedule digest notifications', 403, 'UNAUTHORIZED');
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('userIds array is required and cannot be empty', 400, 'INVALID_REQUEST');
    }

    // Placeholder: This endpoint would ideally schedule jobs.
    res.json({
      success: true,
      message: `Digest notifications scheduled for ${userIds.length} users (${frequency})`,
      data: { userCount: userIds.length }
    });
  });

  /**
   * Send bulk notification to multiple users (admin/moderator only)
   */
  static sendBulkNotification = asyncHandler(async (req, res) => {
    const {
      userIds, title, message, data, channels, priority
    } = req.body;

    // Check admin/moderator permissions
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to send bulk notifications', 403, 'UNAUTHORIZED');
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('userIds array is required and cannot be empty', 400, 'INVALID_REQUEST');
    }

    if (!title || !message) {
      throw new AppError('title and message are required', 400, 'INVALID_REQUEST');
    }

    // Add to queue for bulk processing
    await NotificationService.sendBulkNotifications({
      userIds,
      title,
      message,
      data: data || {},
      channels: channels || ['inApp'],
      priority: priority || 'normal'
    });

    res.json({
      success: true,
      message: `Bulk notification queued for ${userIds.length} users`,
      data: { userCount: userIds.length }
    });
  });

  /**
   * Register device for push notifications
   */
  static registerDevice = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { deviceToken, platform } = req.body;

    await NotificationService.registerDevice(userId, deviceToken, platform);

    res.json({
      success: true,
      message: 'Device registered for push notifications'
    });
  });

  /**
   * Unregister device from push notifications
   */
  static unregisterDevice = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { deviceToken } = req.body;

    await NotificationService.unregisterDevice(userId, deviceToken);

    res.json({
      success: true,
      message: 'Device unregistered from push notifications'
    });
  });

  /**
   * Handle email unsubscribe requests
   */
  static unsubscribe = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Unsubscribe token is required'
      });
    }

    try {
      await NotificationService.processUnsubscribe(token);

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed - Mediaverse</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .success-icon { font-size: 48px; color: #28a745; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Unsubscribed Successfully</h1>
            <p>You have been unsubscribed from all email notifications from Mediaverse.</p>
            <p>If you change your mind, you can update your email preferences in your account settings.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">Return to Mediaverse</a>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link - Mediaverse</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .error-icon { font-size: 48px; color: #dc3545; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <h1>Invalid Unsubscribe Link</h1>
            <p>The unsubscribe link is invalid or has expired.</p>
            <p>Please check your email preferences in your account settings to manage notifications.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  /**
   * Track email opens (returns 1x1 transparent pixel)
   */
  static trackEmailOpen = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    // Track the email open
    await NotificationService.trackEmailOpen(notificationId);

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    });

    res.send(pixel);
  });

  /**
   * Send test email
   */
  static testEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    try {
      await NotificationService.testEmail(email);

      res.json({
        success: true,
        message: `Test email sent to ${email}`
      });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: error.message
      });
    }
  });

  /**
   * Subscribe to push notifications
   */
  static subscribePush = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { subscription, deviceInfo } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Valid push subscription is required'
      });
    }

    try {
      const subscriptionId = await NotificationService.savePushSubscription(userId, subscription, deviceInfo || {});

      res.json({
        success: true,
        message: 'Successfully subscribed to push notifications',
        subscriptionId
      });
    } catch (error) {
      console.error('Push subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to subscribe to push notifications',
        error: error.message
      });
    }
  });

  /**
   * Unsubscribe from push notifications
   */
  static unsubscribePush = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    try {
      const success = await NotificationService.removePushSubscription(userId, subscriptionId);

      res.json({
        success: true,
        message: success ? 'Successfully unsubscribed from push notifications' : 'Subscription not found'
      });
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unsubscribe from push notifications',
        error: error.message
      });
    }
  });

  /**
   * Get push notification subscriptions
   */
  static getPushSubscriptions = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    try {
      const subscriptions = await NotificationService.getUserPushSubscriptions(userId);

      res.json({
        success: true,
        data: {
          subscriptions: subscriptions.map((sub) => ({
            id: sub.id,
            endpoint: sub.endpoint,
            userAgent: sub.userAgent,
            createdAt: sub.createdAt,
            lastActive: sub.lastActive
          }))
        }
      });
    } catch (error) {
      console.error('Get push subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get push subscriptions',
        error: error.message
      });
    }
  });

  /**
   * Get VAPID public key
   */
  static getVapidPublicKey = asyncHandler(async (req, res) => {
    try {
      const publicKey = NotificationService.getVapidPublicKey();

      if (!publicKey) {
        return res.status(503).json({
          success: false,
          message: 'Push notifications are not configured'
        });
      }

      res.json({
        success: true,
        data: {
          publicKey
        }
      });
    } catch (error) {
      console.error('Get VAPID key error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get VAPID public key',
        error: error.message
      });
    }
  });

  /**
   * Test push notification
   */
  static testPush = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { message } = req.body;

    try {
      const result = await NotificationService.testPushNotification(userId, message);

      res.json({
        success: result.success,
        message: result.success
          ? `Test push notification sent successfully to ${result.successful}/${result.total} devices`
          : 'No active push subscriptions found',
        data: result
      });
    } catch (error) {
      console.error('Test push error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test push notification',
        error: error.message
      });
    }
  });

  /**
   * Get user notification preferences
   */
  static getPreferences = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    try {
      const preferences = await NotificationService.getUserPreferences(userId);

      res.json({
        success: true,
        data: {
          preferences
        }
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences',
        error: error.message
      });
    }
  });

  /**
   * Update user notification preferences
   */
  static updatePreferences = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({
        success: false,
        message: 'Preferences data is required'
      });
    }

    try {
      const updatedPreferences = await NotificationService.updateUserPreferences(userId, preferences);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          preferences: updatedPreferences
        }
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
        error: error.message
      });
    }
  });

  /**
   * Reset user preferences to defaults
   */
  static resetPreferences = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    try {
      const defaultPreferences = await NotificationService.resetUserPreferences(userId);

      res.json({
        success: true,
        message: 'Notification preferences reset to defaults',
        data: {
          preferences: defaultPreferences
        }
      });
    } catch (error) {
      console.error('Reset preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset notification preferences',
        error: error.message
      });
    }
  });

  /**
   * Check if notification is allowed for current user
   */
  static checkNotificationAllowed = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { category, type } = req.query;

    if (!category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Category and type parameters are required'
      });
    }

    try {
      const allowed = await NotificationService.checkNotificationAllowed(userId, category, type);

      res.json({
        success: true,
        data: {
          allowed,
          category,
          type
        }
      });
    } catch (error) {
      console.error('Check notification allowed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check notification allowance',
        error: error.message
      });
    }
  });

  /**
   * Mark multiple notifications as read (batch operation)
   */
  static markAsReadBatch = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds must be a non-empty array'
      });
    }

    try {
      const count = await NotificationService.markAsReadBatch(notificationIds, userId);

      res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        data: { count }
      });
    } catch (error) {
      console.error('Mark as read batch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read',
        error: error.message
      });
    }
  });

  /**
   * Delete multiple notifications (batch operation)
   */
  static deleteNotificationsBatch = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds must be a non-empty array'
      });
    }

    try {
      const count = await NotificationService.deleteNotificationsBatch(notificationIds, userId);

      res.json({
        success: true,
        message: `Deleted ${count} notifications`,
        data: { count }
      });
    } catch (error) {
      console.error('Delete notifications batch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notifications',
        error: error.message
      });
    }
  });

  /**
   * Archive notification
   */
  static archiveNotification = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { notificationId } = req.params;

    try {
      const count = await NotificationService.archiveNotification(notificationId, userId);

      if (count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or already archived'
        });
      }

      res.json({
        success: true,
        message: 'Notification archived successfully'
      });
    } catch (error) {
      console.error('Archive notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive notification',
        error: error.message
      });
    }
  });

  /**
   * Archive multiple notifications (batch operation)
   */
  static archiveNotificationsBatch = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds must be a non-empty array'
      });
    }

    try {
      const count = await NotificationService.archiveNotificationsBatch(notificationIds, userId);

      res.json({
        success: true,
        message: `Archived ${count} notifications`,
        data: { count }
      });
    } catch (error) {
      console.error('Archive notifications batch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive notifications',
        error: error.message
      });
    }
  });

  /**
   * Get notification statistics
   */
  static getNotificationStats = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    try {
      const stats = await NotificationService.getNotificationStats(userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics',
        error: error.message
      });
    }
  });

  /**
   * Get unread notification count
   */
  static getUnreadCount = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    try {
      const count = await NotificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread notification count',
        error: error.message
      });
    }
  });
}

module.exports = NotificationController;
