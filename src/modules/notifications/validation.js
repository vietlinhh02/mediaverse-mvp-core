// Notification validation middleware
const { body, param, query } = require('express-validator');

/**
 * Validate notification ID parameter
 */
const validateNotificationId = [
  param('id')
    .isString()
    .isLength({ min: 7, max: 7 })
    .withMessage('Notification ID must be a valid 7-character string')
];

/**
 * Validate notification preferences
 */
const validateNotificationPreferences = [
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('emailNotifications must be a boolean'),
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('pushNotifications must be a boolean'),
  body('smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('smsNotifications must be a boolean'),
  body('inAppNotifications')
    .optional()
    .isBoolean()
    .withMessage('inAppNotifications must be a boolean'),
  body('notificationTypes.*.enabled')
    .optional()
    .isBoolean()
    .withMessage('notificationTypes.*.enabled must be a boolean'),
  body('notificationTypes.*.channels')
    .optional()
    .isArray()
    .withMessage('notificationTypes.*.channels must be an array'),
  body('notificationTypes.*.channels.*')
    .optional()
    .isIn(['email', 'push', 'sms', 'inApp'])
    .withMessage('Invalid notification channel')
];

/**
 * Validate device registration
 */
const validateDeviceRegistration = [
  body('deviceToken')
    .notEmpty()
    .withMessage('Device token is required'),
  body('platform')
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web')
];

/**
 * Validate send notification request
 */
const validateNotificationSend = [
  body('userId')
    .isString()
    .isLength({ min: 7, max: 7 })
    .withMessage('Valid userId is required'),
  body('type')
    .isIn(['system', 'like', 'comment', 'follow', 'upload', 'custom'])
    .withMessage('Invalid notification type'),
  body('title')
    .notEmpty()
    .withMessage('Title is required'),
  body('message')
    .notEmpty()
    .withMessage('Message is required'),
  body('options.sendEmail')
    .optional()
    .isBoolean()
    .withMessage('sendEmail must be boolean'),
  body('options.sendPush')
    .optional()
    .isBoolean()
    .withMessage('sendPush must be boolean'),
  body('options.sendInApp')
    .optional()
    .isBoolean()
    .withMessage('sendInApp must be boolean')
];

/**
 * Validate send email request
 */
const validateEmailSend = [
  body('to')
    .isEmail()
    .withMessage('Valid email address is required'),
  body('subject')
    .notEmpty()
    .withMessage('Subject is required'),
  body('template')
    .optional()
    .isIn(['notification', 'welcome', 'password-reset', 'email-verification'])
    .withMessage('Invalid template name'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object')
];

/**
 * Validate send push notification request
 */
const validatePushSend = [
  body('userId')
    .isString()
    .isLength({ min: 7, max: 7 })
    .withMessage('Valid userId is required'),
  body('title')
    .notEmpty()
    .withMessage('Title is required'),
  body('message')
    .notEmpty()
    .withMessage('Message is required'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object')
];

/**
 * Validate send advanced notification request
 */
const validateAdvancedNotificationSend = [
  body('userId')
    .isString()
    .isLength({ min: 7, max: 7 })
    .withMessage('Valid userId is required'),
  body('type')
    .isIn(['system', 'like', 'comment', 'follow', 'upload', 'custom'])
    .withMessage('Invalid notification type'),
  body('title')
    .notEmpty()
    .withMessage('Title is required'),
  body('message')
    .notEmpty()
    .withMessage('Message is required'),
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array'),
  body('channels.*')
    .optional()
    .isIn(['email', 'push', 'sms', 'inApp'])
    .withMessage('Invalid notification channel'),
  body('priority')
    .optional()
    .isIn(['high', 'normal', 'low'])
    .withMessage('Priority must be high, normal, or low'),
  body('delay')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Delay must be a non-negative integer')
];

/**
 * Validate batch notifications request
 */
const validateBatchNotifications = [
  body('type')
    .isIn(['digest', 'bulk', 'cleanup'])
    .withMessage('Type must be digest, bulk, or cleanup'),
  body('userIds')
    .isArray()
    .withMessage('userIds must be an array'),
  body('userIds.*')
    .isString()
    .isLength({ min: 7, max: 7 })
    .withMessage('Each userId must be a valid 7-character string'),
  body('notifications')
    .optional()
    .isArray()
    .withMessage('notifications must be an array'),
  body('options')
    .optional()
    .isObject()
    .withMessage('options must be an object')
];

/**
 * Validate bulk notification request
 */
const validateBulkNotification = [
  body('userIds')
    .isArray()
    .withMessage('userIds must be an array'),
  body('userIds.*')
    .isString()
    .isLength({ min: 7, max: 7 })
    .withMessage('Each userId must be a valid 7-character string'),
  body('title')
    .notEmpty()
    .withMessage('Title is required'),
  body('message')
    .notEmpty()
    .withMessage('Message is required'),
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array'),
  body('channels.*')
    .optional()
    .isIn(['email', 'push', 'sms', 'inApp'])
    .withMessage('Invalid notification channel'),
  body('priority')
    .optional()
    .isIn(['high', 'normal', 'low'])
    .withMessage('Priority must be high, normal, or low')
];

/**
 * Validate digest notifications request
 */
const validateDigestNotifications = [
  body('userIds')
    .isArray()
    .withMessage('userIds must be an array'),
  body('userIds.*')
    .isString()
    .isLength({ min: 7, max: 7 })
    .withMessage('Each userId must be a valid 7-character string'),
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Frequency must be daily, weekly, or monthly')
];

/**
 * Validate notification query parameters
 */
const validateNotificationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly must be a boolean')
];

const validateTestEmail = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email address is required')
];

const validatePushSubscription = [
  body('subscription').isObject().withMessage('Subscription object is required'),
  body('subscription.endpoint').isURL().withMessage('Valid endpoint URL is required'),
  body('subscription.keys').isObject().withMessage('Subscription keys are required'),
  body('subscription.keys.p256dh').isString().notEmpty().withMessage('p256dh key is required'),
  body('subscription.keys.auth').isString().notEmpty().withMessage('auth key is required'),
  body('deviceInfo').optional().isObject().withMessage('Device info must be an object')
];

const validatePushUnsubscription = [
  body('subscriptionId').isUUID().withMessage('Valid subscription ID is required')
];

const validateTestPush = [
  body('content').optional().isString().isLength({ max: 1000 })
    .withMessage('Content must be a string with max 1000 characters')
];

const validatePreferencesUpdate = [
  body('preferences').isObject().withMessage('Preferences must be an object'),
  body('preferences.notifications').optional().isObject().withMessage('Notifications preferences must be an object'),
  body('preferences.notifications.emailNotifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('preferences.notifications.pushNotifications').optional().isBoolean().withMessage('Push notifications must be boolean'),
  body('preferences.notifications.inAppNotifications').optional().isBoolean().withMessage('In-app notifications must be boolean'),
  body('preferences.notifications.categories').optional().isObject().withMessage('Categories must be an object'),
  body('preferences.privacy').optional().isObject().withMessage('Privacy preferences must be an object')
];

module.exports = {
  validateNotificationId,
  validateNotificationPreferences,
  validateDeviceRegistration,
  validateNotificationSend,
  validateEmailSend,
  validatePushSend,
  validateAdvancedNotificationSend,
  validateBatchNotifications,
  validateBulkNotification,
  validateDigestNotifications,
  validateNotificationQuery,
  validateTestEmail,
  validatePushSubscription,
  validatePushUnsubscription,
  validateTestPush,
  validatePreferencesUpdate
};
