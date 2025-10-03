const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const NotificationController = require('../controllers/notificationController');
const NotificationService = require('../services/notificationService');
const EmailService = require('../services/emailService');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../services/notificationService');
jest.mock('../services/emailService');
jest.mock('../websocket/webSocketManager');

const app = express();
app.use(express.json());

// Mock authentication middleware that will be set dynamically
let mockUser;

const mockAuth = (req, res, next) => {
  req.user = mockUser;
  next();
};

app.use(mockAuth);

// Create test routes
app.post('/api/notifications/send', NotificationController.sendNotification);
app.post('/api/notifications/send-email', NotificationController.sendEmail);
app.post('/api/notifications/send-push', NotificationController.sendPush);
app.get('/api/notifications/user/:userId?', NotificationController.getUserNotifications);
app.put('/api/notifications/:id/read', NotificationController.markAsRead);
app.put('/api/notifications/read-all', NotificationController.markAllAsRead);
app.delete('/api/notifications/:id', NotificationController.deleteNotification);
app.get('/api/notifications/preferences', NotificationController.getNotificationPreferences);
app.put('/api/notifications/preferences', NotificationController.updateNotificationPreferences);
app.post('/api/notifications/advanced', NotificationController.sendAdvancedNotification);
app.post('/api/notifications/batch', NotificationController.sendBatchNotifications);
app.post('/api/notifications/bulk', NotificationController.sendBulkNotification);
app.post('/api/notifications/device/register', NotificationController.registerDevice);
app.post('/api/notifications/device/unregister', NotificationController.unregisterDevice);
app.get('/api/notifications/unsubscribe', NotificationController.unsubscribe);
app.get('/api/notifications/track/:notificationId/open.gif', NotificationController.trackEmailOpen);
app.post('/api/notifications/test-email', NotificationController.testEmail);
app.post('/api/notifications/push/subscribe', NotificationController.subscribePush);
app.post('/api/notifications/push/unsubscribe', NotificationController.unsubscribePush);
app.get('/api/notifications/push/subscriptions', NotificationController.getPushSubscriptions);
app.get('/api/notifications/vapid/public-key', NotificationController.getVapidPublicKey);
app.post('/api/notifications/push/test', NotificationController.testPush);
app.get('/api/notifications/preferences/get', NotificationController.getPreferences);
app.put('/api/notifications/preferences/update', NotificationController.updatePreferences);
app.post('/api/notifications/preferences/reset', NotificationController.resetPreferences);
app.get('/api/notifications/check-allowed', NotificationController.checkNotificationAllowed);
app.put('/api/notifications/read-batch', NotificationController.markAsReadBatch);
app.delete('/api/notifications/delete-batch', NotificationController.deleteNotificationsBatch);
app.put('/api/notifications/:notificationId/archive', NotificationController.archiveNotification);
app.put('/api/notifications/archive-batch', NotificationController.archiveNotificationsBatch);
app.get('/api/notifications/stats', NotificationController.getNotificationStats);
app.get('/api/notifications/unread-count', NotificationController.getUnreadCount);

describe('Notification Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      userId: 'user123',
      role: 'admin',
      username: 'testuser'
    };
  });

  describe('POST /api/notifications/send', () => {
    it('should send notification successfully for admin user', async () => {
      const mockNotification = {
        id: 'notif123',
        userId: 'user456',
        type: 'info',
        title: 'Test Notification',
        message: 'Test message'
      };

      NotificationService.createNotification = jest.fn().mockResolvedValue(mockNotification);

      const response = await request(app)
        .post('/api/notifications/send')
        .send({
          userId: 'user456',
          type: 'info',
          title: 'Test Notification',
          message: 'Test message'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockNotification);
      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        'user456',
        'info',
        'Test Notification',
        'Test message',
        {},
        {}
      );
    });

    it('should return 403 for non-admin user', async () => {
      mockUser.role = 'user';

      const response = await request(app)
        .post('/api/notifications/send')
        .send({
          userId: 'user456',
          type: 'info',
          title: 'Test Notification',
          message: 'Test message'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notifications/send-email', () => {
    it('should send email notification for admin user', async () => {
      EmailService.sendNotification = jest.fn().mockResolvedValue();

      const response = await request(app)
        .post('/api/notifications/send-email')
        .send({
          to: 'test@example.com',
          subject: 'Test Email',
          template: 'welcome',
          data: { name: 'Test User' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(EmailService.sendNotification).toHaveBeenCalledWith(
        'test@example.com',
        'Test Email',
        { name: 'Test User' },
        'welcome'
      );
    });

    it('should return 403 for non-admin user', async () => {
      mockUser.role = 'user';

      const response = await request(app)
        .post('/api/notifications/send-email')
        .send({
          to: 'test@example.com',
          subject: 'Test Email'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/notifications/user/:userId?', () => {
    it('should get notifications for current user', async () => {
      const mockResult = {
        notifications: [
          { id: 'notif1', title: 'Test 1' },
          { id: 'notif2', title: 'Test 2' }
        ],
        pagination: { page: 1, limit: 10, total: 2 },
        unreadCount: 1
      };

      NotificationService.getNotifications = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/notifications/user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult.notifications);
      expect(response.body.pagination).toEqual(mockResult.pagination);
      expect(response.body.unreadCount).toBe(1);
    });

    it('should get notifications for specific user (admin only)', async () => {
      const mockResult = {
        notifications: [{ id: 'notif1', title: 'Test 1' }],
        pagination: { page: 1, limit: 10, total: 1 },
        unreadCount: 1
      };

      NotificationService.getNotifications = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/notifications/user/user456');

      expect(response.status).toBe(200);
      expect(NotificationService.getNotifications).toHaveBeenCalledWith('user456', {});
    });

    it('should return 403 when non-admin tries to access other user notifications', async () => {
      mockUser.role = 'user';

      const response = await request(app)
        .get('/api/notifications/user/user456');

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      NotificationService.markAsRead = jest.fn().mockResolvedValue();

      const response = await request(app)
        .put('/api/notifications/notif123/read');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif123', 'user123');
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      NotificationService.markAllAsRead = jest.fn().mockResolvedValue(5);

      const response = await request(app)
        .put('/api/notifications/read-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('5 notifications marked as read');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      NotificationService.deleteNotification = jest.fn().mockResolvedValue();

      const response = await request(app)
        .delete('/api/notifications/notif123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(NotificationService.deleteNotification).toHaveBeenCalledWith('notif123', 'user123');
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should get notification preferences', async () => {
      const mockPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        categories: { likes: true, comments: true }
      };

      NotificationService.getNotificationPreferences = jest.fn().mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/api/notifications/preferences');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPreferences);
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const newPreferences = {
        emailNotifications: false,
        pushNotifications: true
      };

      NotificationService.updateNotificationPreferences = jest.fn().mockResolvedValue();

      const response = await request(app)
        .put('/api/notifications/preferences')
        .send(newPreferences);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(NotificationService.updateNotificationPreferences).toHaveBeenCalledWith('user123', newPreferences);
    });
  });

  describe('POST /api/notifications/batch', () => {
    it('should send individual batch notifications for admin', async () => {
      NotificationService.sendNotification = jest.fn().mockResolvedValue();

      const response = await request(app)
        .post('/api/notifications/batch')
        .send({
          type: 'individual',
          userIds: ['user1', 'user2', 'user3']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userCount).toBe(3);
      expect(NotificationService.sendNotification).toHaveBeenCalledTimes(3);
    });

    it('should send bulk batch notifications for admin', async () => {
      const mockJob = { id: 'job123' };
      NotificationService.sendBulkNotificationToUsers = jest.fn().mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/notifications/batch')
        .send({
          type: 'bulk',
          userIds: ['user1', 'user2', 'user3']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe('job123');
    });

    it('should return 400 for invalid batch type', async () => {
      const response = await request(app)
        .post('/api/notifications/batch')
        .send({
          type: 'invalid',
          userIds: ['user1', 'user2']
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for empty userIds', async () => {
      const response = await request(app)
        .post('/api/notifications/batch')
        .send({
          type: 'individual',
          userIds: []
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/notifications/device/register', () => {
    it('should register device for push notifications', async () => {
      NotificationService.registerDevice = jest.fn().mockResolvedValue();

      const response = await request(app)
        .post('/api/notifications/device/register')
        .send({
          deviceToken: 'token123',
          platform: 'web'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(NotificationService.registerDevice).toHaveBeenCalledWith('user123', 'token123', 'web');
    });
  });

  describe('GET /api/notifications/unsubscribe', () => {
    it('should process unsubscribe request with valid token', async () => {
      NotificationService.processUnsubscribe = jest.fn().mockResolvedValue();

      const response = await request(app)
        .get('/api/notifications/unsubscribe?token=validtoken');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Unsubscribed Successfully');
      expect(NotificationService.processUnsubscribe).toHaveBeenCalledWith('validtoken');
    });

    it('should return error for missing token', async () => {
      const response = await request(app)
        .get('/api/notifications/unsubscribe');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid unsubscribe token', async () => {
      NotificationService.processUnsubscribe = jest.fn().mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .get('/api/notifications/unsubscribe?token=invalidtoken');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid Unsubscribe Link');
    });
  });

  describe('POST /api/notifications/test-email', () => {
    it('should send test email', async () => {
      NotificationService.testEmail = jest.fn().mockResolvedValue();

      const response = await request(app)
        .post('/api/notifications/test-email')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(NotificationService.testEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/notifications/test-email')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle test email error', async () => {
      NotificationService.testEmail = jest.fn().mockRejectedValue(new Error('Email error'));

      const response = await request(app)
        .post('/api/notifications/test-email')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/notifications/read-batch', () => {
    it('should mark multiple notifications as read', async () => {
      NotificationService.markAsReadBatch = jest.fn().mockResolvedValue(3);

      const response = await request(app)
        .put('/api/notifications/read-batch')
        .send({ notificationIds: ['notif1', 'notif2', 'notif3'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(3);
    });

    it('should return 400 for invalid notificationIds', async () => {
      const response = await request(app)
        .put('/api/notifications/read-batch')
        .send({ notificationIds: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/notifications/stats', () => {
    it('should get notification statistics', async () => {
      const mockStats = {
        total: 50,
        unread: 5,
        categories: { likes: 20, comments: 15, follows: 15 }
      };

      NotificationService.getNotificationStats = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/notifications/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should get unread notification count', async () => {
      NotificationService.getUnreadCount = jest.fn().mockResolvedValue(7);

      const response = await request(app)
        .get('/api/notifications/unread-count');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(7);
    });
  });

  describe('GET /api/notifications/vapid/public-key', () => {
    it('should get VAPID public key', async () => {
      NotificationService.getVapidPublicKey = jest.fn().mockReturnValue('public-key-123');

      const response = await request(app)
        .get('/api/notifications/vapid/public-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.publicKey).toBe('public-key-123');
    });

    it('should return 503 when VAPID key not configured', async () => {
      NotificationService.getVapidPublicKey = jest.fn().mockReturnValue(null);

      const response = await request(app)
        .get('/api/notifications/vapid/public-key');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      NotificationService.getNotifications = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/notifications/user');

      expect(response.status).toBe(500);
    });
  });
});
