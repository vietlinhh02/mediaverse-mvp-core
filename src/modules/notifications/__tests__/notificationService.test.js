const { PrismaClient } = require('@prisma/client');
const NotificationService = require('../services/notificationService');
const EmailService = require('../services/emailService');
const PushService = require('../services/pushService');
const PreferencesService = require('../services/preferencesService');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../services/emailService');
jest.mock('../services/pushService');
jest.mock('../services/preferencesService');
jest.mock('../../../jobs/notificationQueue');

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn()
  },
  pushSubscription: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn()
  },
  profile: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  $disconnect: jest.fn()
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('NotificationService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const mockNotification = {
        id: 'notif123',
        userId: 'user123',
        type: 'info',
        title: 'Test Notification',
        message: 'Test message',
        status: 'pending',
        createdAt: new Date()
      };

      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      PreferencesService.checkNotificationAllowed = jest.fn().mockResolvedValue(true);

      const result = await NotificationService.createNotification(
        'user123',
        'info',
        'Test Notification',
        'Test message'
      );

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          type: 'info',
          title: 'Test Notification',
          message: 'Test message',
          status: 'pending'
        })
      });
    });

    it('should not create notification if user preferences block it', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      PreferencesService.checkNotificationAllowed = jest.fn().mockResolvedValue(false);

      const result = await NotificationService.createNotification(
        'user123',
        'info',
        'Test Notification',
        'Test message'
      );

      expect(result).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        NotificationService.createNotification('user123', 'info', 'Test', 'Message')
      ).rejects.toThrow('User not found');
    });
  });

  describe('getNotifications', () => {
    it('should get notifications with pagination', async () => {
      const mockNotifications = [
        { id: 'notif1', title: 'Test 1', status: 'unread' },
        { id: 'notif2', title: 'Test 2', status: 'read' }
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await NotificationService.getNotifications('user123', {
        page: 1,
        limit: 10
      });

      expect(result).toEqual({
        notifications: mockNotifications,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        },
        unreadCount: 1
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user123'
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should filter notifications by status', async () => {
      const mockNotifications = [
        { id: 'notif1', title: 'Test 1', status: 'unread' }
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count.mockResolvedValue(1);

      await NotificationService.getNotifications('user123', {
        status: 'unread'
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user123',
          status: 'unread'
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });

    it('should filter notifications by category', async () => {
      const mockNotifications = [
        { id: 'notif1', title: 'Test 1', category: 'likes' }
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count.mockResolvedValue(1);

      await NotificationService.getNotifications('user123', {
        category: 'likes'
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user123',
          category: 'likes'
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });

    it('should filter notifications by date range', async () => {
      const mockNotifications = [];
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count.mockResolvedValue(0);

      await NotificationService.getNotifications('user123', {
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user123',
          createdAt: {
            gte: new Date('2023-01-01'),
            lte: new Date('2023-12-31')
          }
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'notif123',
        userId: 'user123',
        status: 'unread'
      };

      mockPrisma.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        status: 'read'
      });

      await NotificationService.markAsRead('notif123', 'user123');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif123' },
        data: {
          status: 'read',
          readAt: expect.any(Date)
        }
      });
    });

    it('should throw error if notification not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        NotificationService.markAsRead('notif123', 'user123')
      ).rejects.toThrow('Notification not found');
    });

    it('should throw error if user not authorized', async () => {
      const mockNotification = {
        id: 'notif123',
        userId: 'user456',
        status: 'unread'
      };

      mockPrisma.notification.findFirst.mockResolvedValue(mockNotification);

      await expect(
        NotificationService.markAsRead('notif123', 'user123')
      ).rejects.toThrow('Not authorized to mark this notification as read');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await NotificationService.markAllAsRead('user123');

      expect(result).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          status: 'unread'
        },
        data: {
          status: 'read',
          readAt: expect.any(Date)
        }
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const mockNotification = {
        id: 'notif123',
        userId: 'user123'
      };

      mockPrisma.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrisma.notification.delete.mockResolvedValue(mockNotification);

      await NotificationService.deleteNotification('notif123', 'user123');

      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif123' }
      });
    });

    it('should throw error if notification not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        NotificationService.deleteNotification('notif123', 'user123')
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('markAsReadBatch', () => {
    it('should mark multiple notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await NotificationService.markAsReadBatch(
        ['notif1', 'notif2', 'notif3'],
        'user123'
      );

      expect(result).toBe(3);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['notif1', 'notif2', 'notif3'] },
          userId: 'user123'
        },
        data: {
          status: 'read',
          readAt: expect.any(Date)
        }
      });
    });
  });

  describe('deleteNotificationsBatch', () => {
    it('should delete multiple notifications', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 3 });

      const result = await NotificationService.deleteNotificationsBatch(
        ['notif1', 'notif2', 'notif3'],
        'user123'
      );

      expect(result).toBe(3);
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['notif1', 'notif2', 'notif3'] },
          userId: 'user123'
        }
      });
    });
  });

  describe('archiveNotification', () => {
    it('should archive notification', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await NotificationService.archiveNotification('notif123', 'user123');

      expect(result).toBe(1);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'notif123',
          userId: 'user123'
        },
        data: {
          status: 'archived',
          archivedAt: expect.any(Date)
        }
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should get notification statistics', async () => {
      // Mock the stats response structure that matches the actual service
      mockPrisma.notification.count
        .mockResolvedValueOnce(18) // total
        .mockResolvedValueOnce(5) // unread
        .mockResolvedValueOnce(10) // read
        .mockResolvedValueOnce(3); // archived

      const result = await NotificationService.getNotificationStats('user123');

      expect(result.total).toBe(18);
      expect(result.unread).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledTimes(4);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);

      const result = await NotificationService.getUnreadCount('user123');

      expect(result).toBe(7);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          status: 'unread'
        }
      });
    });
  });

  describe('registerDevice', () => {
    it('should register device for push notifications', async () => {
      const mockDevice = {
        id: 'device123',
        userId: 'user123',
        deviceToken: 'token123',
        platform: 'web'
      };

      mockPrisma.pushSubscription.create.mockResolvedValue(mockDevice);

      await NotificationService.registerDevice('user123', 'token123', 'web');

      expect(mockPrisma.pushSubscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          deviceToken: 'token123',
          platform: 'web',
          isActive: true
        }
      });
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister device', async () => {
      mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 1 });

      await NotificationService.unregisterDevice('user123', 'token123');

      expect(mockPrisma.pushSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          deviceToken: 'token123'
        },
        data: {
          isActive: false,
          deactivatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('getUserPushSubscriptions', () => {
    it('should get active push subscriptions for user', async () => {
      const mockSubscriptions = [
        { id: 'sub1', endpoint: 'endpoint1', keys: {} },
        { id: 'sub2', endpoint: 'endpoint2', keys: {} }
      ];

      mockPrisma.pushSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await NotificationService.getUserPushSubscriptions('user123');

      expect(result).toEqual(mockSubscriptions);
      expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          isActive: true
        }
      });
    });
  });

  describe('sendNotification', () => {
    it('should send notification through all enabled channels', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const mockNotification = {
        id: 'notif123',
        userId: 'user123',
        type: 'info',
        title: 'Test',
        message: 'Message'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      PreferencesService.checkNotificationAllowed = jest.fn().mockResolvedValue(true);
      EmailService.sendNotification = jest.fn().mockResolvedValue();
      PushService.sendPush = jest.fn().mockResolvedValue();

      await NotificationService.sendNotification(
        'user123',
        'info',
        'Test',
        'Message',
        {},
        { channels: ['inApp', 'email', 'push'] }
      );

      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(EmailService.sendNotification).toHaveBeenCalled();
      expect(PushService.sendPush).toHaveBeenCalled();
    });

    it('should only send in-app notification if other channels disabled', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const mockNotification = {
        id: 'notif123',
        userId: 'user123',
        type: 'info',
        title: 'Test',
        message: 'Message'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      PreferencesService.checkNotificationAllowed = jest.fn().mockResolvedValue(true);

      await NotificationService.sendNotification(
        'user123',
        'info',
        'Test',
        'Message',
        {},
        { channels: ['inApp'] }
      );

      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(EmailService.sendNotification).not.toHaveBeenCalled();
      expect(PushService.sendPush).not.toHaveBeenCalled();
    });
  });

  describe('testEmail', () => {
    it('should send test email', async () => {
      EmailService.sendNotification = jest.fn().mockResolvedValue();

      await NotificationService.testEmail('test@example.com');

      expect(EmailService.sendNotification).toHaveBeenCalledWith(
        'test@example.com',
        'Email Service Test - Mediaverse',
        expect.objectContaining({
          title: 'Email Service Test',
          message: expect.stringContaining('test email')
        }),
        'system-notification'
      );
    });
  });

  describe('testPushNotification', () => {
    it('should send test push notification', async () => {
      const mockResult = {
        success: true,
        total: 2,
        successful: 2
      };

      PushService.sendPush = jest.fn().mockResolvedValue(mockResult);

      const result = await NotificationService.testPushNotification('user123', 'Test message');

      expect(result).toEqual(mockResult);
      expect(PushService.sendPush).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          title: 'Mediaverse - Test Notification',
          body: 'Test message'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('Database error'));

      await expect(
        NotificationService.createNotification('user123', 'info', 'Test', 'Message')
      ).rejects.toThrow('Database error');
    });

    it('should handle missing user gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        NotificationService.createNotification('user123', 'info', 'Test', 'Message')
      ).rejects.toThrow('User not found');
    });
  });

  describe('processUnsubscribe', () => {
    it('should process unsubscribe token successfully', async () => {
      // Mock JWT verification
      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockReturnValue({
        userId: 'user123',
        type: 'unsubscribe'
      });

      mockPrisma.profile.upsert.mockResolvedValue({});

      await NotificationService.processUnsubscribe('valid-token');

      expect(mockPrisma.profile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        update: expect.objectContaining({
          preferences: expect.objectContaining({
            notifications: expect.objectContaining({
              emailNotifications: false
            })
          })
        }),
        create: expect.objectContaining({
          userId: 'user123'
        })
      });
    });

    it('should throw error for invalid token type', async () => {
      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockReturnValue({
        userId: 'user123',
        type: 'invalid'
      });

      await expect(
        NotificationService.processUnsubscribe('invalid-token')
      ).rejects.toThrow('Invalid unsubscribe token');
    });
  });
});
