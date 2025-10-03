// Notification routes
const express = require('express');

const router = express.Router();

// Import controllers and middleware
const NotificationController = require('../controllers/notificationController');
const { authenticateToken, requireActiveUser } = require('../../../middleware/auth');

// Import validation middleware
const {
  validateNotificationId,
  validateNotificationPreferences,
  validateNotificationSend,
  validateEmailSend,
  validatePushSend,
  validateAdvancedNotificationSend,
  validateBatchNotifications,
  validateBulkNotification,
  validateDigestNotifications,
  validateTestEmail,
  validatePushSubscription,
  validatePushUnsubscription,
  validatePreferencesUpdate,
  validateTestPush
} = require('../validation');

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a notification to a user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationRequest'
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification queued successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     notificationId:
 *                       type: string
 *                       example: "not_123"
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/send',
  authenticateToken,
  requireActiveUser,
  validateNotificationSend,
  NotificationController.sendNotification
);

/**
 * @swagger
 * /api/notifications/send/advanced:
 *   post:
 *     tags: [Notifications]
 *     summary: Send an advanced notification with priority and delay options
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdvancedNotificationRequest'
 *     responses:
 *       200:
 *         description: Advanced notification queued successfully
 */
router.post(
  '/send/advanced',
  authenticateToken,
  requireActiveUser,
  validateAdvancedNotificationSend,
  NotificationController.sendAdvancedNotification
);

/**
 * @swagger
 * /api/notifications/email:
 *   post:
 *     tags: [Notifications]
 *     summary: Send an email notification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailRequest'
 *     responses:
 *       200:
 *         description: Email sent successfully
 */
router.post(
  '/email',
  authenticateToken,
  requireActiveUser,
  validateEmailSend,
  NotificationController.sendEmail
);

/**
 * @swagger
 * /api/notifications/push:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a push notification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushNotificationRequest'
 *     responses:
 *       200:
 *         description: Push notification sent successfully
 */
router.post(
  '/push',
  authenticateToken,
  requireActiveUser,
  validatePushSend,
  NotificationController.sendPush
);

/**
 * @swagger
 * /api/notifications/batch:
 *   post:
 *     tags: [Notifications]
 *     summary: Send batch notifications to multiple users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchNotificationRequest'
 *     responses:
 *       200:
 *         description: Batch notifications queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchOperationResponse'
 */
router.post(
  '/batch',
  authenticateToken,
  requireActiveUser,
  validateBatchNotifications,
  NotificationController.sendBatchNotifications
);

/**
 * @swagger
 * /api/notifications/batch/bulk:
 *   post:
 *     tags: [Notifications]
 *     summary: Send bulk notification to all users matching criteria
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - title
 *               - content
 *             properties:
 *               criteria:
 *                 type: object
 *                 description: User filtering criteria
 *               type:
 *                 type: string
 *                 enum: [system, marketing, announcement]
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Bulk notification queued successfully
 */
router.post(
  '/batch/bulk',
  authenticateToken,
  requireActiveUser,
  validateBulkNotification,
  NotificationController.sendBulkNotification
);

/**
 * @swagger
 * /api/notifications/batch/digest:
 *   post:
 *     tags: [Notifications]
 *     summary: Schedule digest notifications for users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 default: weekly
 *     responses:
 *       200:
 *         description: Digest notifications scheduled successfully
 */
router.post(
  '/batch/digest',
  authenticateToken,
  requireActiveUser,
  validateDigestNotifications,
  NotificationController.scheduleDigestNotifications
);

/**
 * @swagger
 * /api/notifications/{userId}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notifications for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, read, archived]
 *         description: Filter by notification status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [likes, comments, follows, uploads, system, marketing]
 *         description: Filter by notification category
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 */
router.get(
  '/:userId',
  authenticateToken,
  requireActiveUser,
  NotificationController.getUserNotifications
);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification marked as read"
 */
router.put(
  '/:id/read',
  authenticateToken,
  requireActiveUser,
  validateNotificationId,
  NotificationController.markAsRead
);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get current user's notifications (legacy route)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, read, archived]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [likes, comments, follows, uploads, system, marketing]
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get(
  '/',
  authenticateToken,
  requireActiveUser,
  NotificationController.getUserNotifications
);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 */
router.put(
  '/read-all',
  authenticateToken,
  requireActiveUser,
  NotificationController.markAllAsRead
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 */
router.delete(
  '/:id',
  authenticateToken,
  requireActiveUser,
  validateNotificationId,
  NotificationController.deleteNotification
);

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user notification preferences (legacy route)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferencesResponse'
 */
router.get(
  '/preferences',
  authenticateToken,
  requireActiveUser,
  NotificationController.getNotificationPreferences
);

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     tags: [Notifications]
 *     summary: Update user notification preferences (legacy route)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications:
 *                 type: boolean
 *               pushNotifications:
 *                 type: boolean
 *               inAppNotifications:
 *                 type: boolean
 *               notificationTypes:
 *                 type: object
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.put(
  '/preferences',
  authenticateToken,
  requireActiveUser,
  validateNotificationPreferences,
  NotificationController.updateNotificationPreferences
);

// Device registration routes
router.post(
  '/devices',
  authenticateToken,
  requireActiveUser,
  NotificationController.registerDevice
);

router.delete(
  '/devices',
  authenticateToken,
  requireActiveUser,
  NotificationController.unregisterDevice
);

/**
 * @swagger
 * /api/notifications/unsubscribe:
 *   get:
 *     tags: [Notifications]
 *     summary: Unsubscribe from email notifications
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Unsubscribe token
 *     responses:
 *       200:
 *         description: Successfully unsubscribed from email notifications
 */
router.get('/unsubscribe', NotificationController.unsubscribe);

/**
 * @swagger
 * /api/notifications/track/{notificationId}/open.gif:
 *   get:
 *     tags: [Notifications]
 *     summary: Track email open (returns 1x1 transparent GIF)
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID for tracking
 *     responses:
 *       200:
 *         description: Email open tracked (returns GIF image)
 *         content:
 *           image/gif:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/track/:notificationId/open.gif', NotificationController.trackEmailOpen);

/**
 * @swagger
 * /api/notifications/test-email:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a test email
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestEmailRequest'
 *     responses:
 *       200:
 *         description: Test email sent successfully
 */
router.post('/test-email', authenticateToken, requireActiveUser, validateTestEmail, NotificationController.testEmail);

/**
 * @swagger
 * /api/notifications/subscribe:
 *   post:
 *     tags: [Notifications]
 *     summary: Subscribe to push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushSubscriptionRequest'
 *     responses:
 *       200:
 *         description: Successfully subscribed to push notifications
 */
router.post('/subscribe', authenticateToken, requireActiveUser, validatePushSubscription, NotificationController.subscribePush);

/**
 * @swagger
 * /api/notifications/unsubscribe-push:
 *   delete:
 *     tags: [Notifications]
 *     summary: Unsubscribe from push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *             properties:
 *               subscriptionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully unsubscribed from push notifications
 */
router.delete('/unsubscribe-push', authenticateToken, requireActiveUser, validatePushUnsubscription, NotificationController.unsubscribePush);

/**
 * @swagger
 * /api/notifications/subscriptions:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user's push notification subscriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push subscriptions retrieved successfully
 */
router.get('/subscriptions', authenticateToken, requireActiveUser, NotificationController.getPushSubscriptions);

/**
 * @swagger
 * /api/notifications/vapid-public-key:
 *   get:
 *     tags: [Notifications]
 *     summary: Get VAPID public key for push notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: VAPID public key retrieved successfully
 */
router.get('/vapid-public-key', authenticateToken, requireActiveUser, NotificationController.getVapidPublicKey);

/**
 * @swagger
 * /api/notifications/test-push:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a test push notification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestPushRequest'
 *     responses:
 *       200:
 *         description: Test push notification sent successfully
 */
router.post('/test-push', authenticateToken, requireActiveUser, validateTestPush, NotificationController.testPush);

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: Get current user's notification preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferencesResponse'
 */
router.get('/preferences', authenticateToken, requireActiveUser, NotificationController.getPreferences);

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     tags: [Notifications]
 *     summary: Update current user's notification preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferencesRequest'
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.put('/preferences', authenticateToken, requireActiveUser, validatePreferencesUpdate, NotificationController.updatePreferences);

/**
 * @swagger
 * /api/notifications/preferences/reset:
 *   post:
 *     tags: [Notifications]
 *     summary: Reset notification preferences to defaults
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences reset to defaults
 */
router.post('/preferences/reset', authenticateToken, requireActiveUser, NotificationController.resetPreferences);

/**
 * @swagger
 * /api/notifications/preferences/check:
 *   get:
 *     tags: [Notifications]
 *     summary: Check if notification is allowed for user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification allowance checked
 */
router.get('/preferences/check', authenticateToken, requireActiveUser, NotificationController.checkNotificationAllowed);

/**
 * @swagger
 * /api/notifications/mark-read-batch:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark multiple notifications as read
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.put('/mark-read-batch', authenticateToken, requireActiveUser, NotificationController.markAsReadBatch);

/**
 * @swagger
 * /api/notifications/delete-batch:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete multiple notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notifications deleted successfully
 */
router.delete('/delete-batch', authenticateToken, requireActiveUser, NotificationController.deleteNotificationsBatch);

/**
 * @swagger
 * /api/notifications/{notificationId}/archive:
 *   put:
 *     tags: [Notifications]
 *     summary: Archive a notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification archived successfully
 */
router.put('/:notificationId/archive', authenticateToken, requireActiveUser, NotificationController.archiveNotification);

/**
 * @swagger
 * /api/notifications/archive-batch:
 *   put:
 *     tags: [Notifications]
 *     summary: Archive multiple notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notifications archived successfully
 */
router.put('/archive-batch', authenticateToken, requireActiveUser, NotificationController.archiveNotificationsBatch);

/**
 * @swagger
 * /api/notifications/stats:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification statistics for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationStatsResponse'
 */
router.get('/stats', authenticateToken, requireActiveUser, NotificationController.getNotificationStats);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 */
router.get('/unread-count', authenticateToken, requireActiveUser, NotificationController.getUnreadCount);

module.exports = router;
