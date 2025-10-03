const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const PushService = require('../services/pushService');

// Mock dependencies
jest.mock('web-push');
jest.mock('@prisma/client');
jest.mock('../../../jobs/notificationQueue');

const mockPrisma = {
  pushSubscription: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn()
  },
  $disconnect: jest.fn()
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('PushService Tests', () => {
  let pushService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_EMAIL = 'test@example.com';

    // Mock web-push
    webpush.setVapidDetails = jest.fn();
    webpush.sendNotification = jest.fn().mockResolvedValue();

    // Create fresh instance
    pushService = new (require('../services/pushService').constructor)();
  });

  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_EMAIL;
  });

  describe('initialize', () => {
    it('should initialize with VAPID keys', () => {
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'test@example.com',
        'test-public-key',
        'test-private-key'
      );
    });

    it('should warn when VAPID keys are missing', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      new (require('../services/pushService').constructor)();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('VAPID keys not configured')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getVapidPublicKey', () => {
    it('should return VAPID public key', () => {
      const result = pushService.getVapidPublicKey();
      expect(result).toBe('test-public-key');
    });
  });

  describe('saveSubscription', () => {
    it('should create new subscription', async () => {
      const subscription = {
        endpoint: 'https://example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'key2' }
      };

      const deviceInfo = {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      };

      mockPrisma.pushSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.pushSubscription.create.mockResolvedValue({
        id: 'sub123',
        ...subscription
      });

      const result = await pushService.saveSubscription('user123', subscription, deviceInfo);

      expect(result).toBe('sub123');
      expect(mockPrisma.pushSubscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
          isActive: true
        }
      });
    });

    it('should update existing subscription', async () => {
      const subscription = {
        endpoint: 'https://example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'key2' }
      };

      const existingSub = {
        id: 'sub123',
        userId: 'user123',
        endpoint: subscription.endpoint
      };

      mockPrisma.pushSubscription.findFirst.mockResolvedValue(existingSub);
      mockPrisma.pushSubscription.update.mockResolvedValue(existingSub);

      const result = await pushService.saveSubscription('user123', subscription);

      expect(result).toBe('sub123');
      expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub123' },
        data: {
          keys: subscription.keys,
          userAgent: undefined,
          ipAddress: undefined,
          lastActive: expect.any(Date),
          isActive: true
        }
      });
    });
  });

  describe('removeSubscription', () => {
    it('should deactivate subscription', async () => {
      mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 1 });

      const result = await pushService.removeSubscription('user123', 'sub123');

      expect(result).toBe(true);
      expect(mockPrisma.pushSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          id: 'sub123'
        },
        data: {
          isActive: false,
          deactivatedAt: expect.any(Date)
        }
      });
    });

    it('should return false when subscription not found', async () => {
      mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 0 });

      const result = await pushService.removeSubscription('user123', 'sub123');

      expect(result).toBe(false);
    });
  });

  describe('getUserSubscriptions', () => {
    it('should get active subscriptions for user', async () => {
      const mockSubscriptions = [
        {
          id: 'sub1',
          endpoint: 'https://example.com/endpoint1',
          keys: { p256dh: 'key1', auth: 'auth1' },
          userAgent: 'Chrome',
          createdAt: new Date(),
          lastActive: new Date()
        },
        {
          id: 'sub2',
          endpoint: 'https://example.com/endpoint2',
          keys: { p256dh: 'key2', auth: 'auth2' },
          userAgent: 'Firefox',
          createdAt: new Date(),
          lastActive: new Date()
        }
      ];

      mockPrisma.pushSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await pushService.getUserSubscriptions('user123');

      expect(result).toEqual(mockSubscriptions);
      expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
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
    });
  });

  describe('sendPush', () => {
    it('should send push notification to all user subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub1',
          endpoint: 'https://example.com/endpoint1',
          keys: { p256dh: 'key1', auth: 'auth1' }
        },
        {
          id: 'sub2',
          endpoint: 'https://example.com/endpoint2',
          keys: { p256dh: 'key2', auth: 'auth2' }
        }
      ];

      const payload = {
        title: 'Test Notification',
        body: 'Test message'
      };

      jest.spyOn(pushService, 'getUserSubscriptions').mockResolvedValue(mockSubscriptions);
      jest.spyOn(pushService, 'sendToSubscription').mockResolvedValue({ success: true });

      const result = await pushService.sendPush('user123', payload);

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(pushService.sendToSubscription).toHaveBeenCalledTimes(2);
    });

    it('should return false when no subscriptions found', async () => {
      jest.spyOn(pushService, 'getUserSubscriptions').mockResolvedValue([]);

      const result = await pushService.sendPush('user123', { title: 'Test' });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('no_subscriptions');
    });

    it('should handle subscription errors', async () => {
      const mockSubscriptions = [
        {
          id: 'sub1',
          endpoint: 'https://example.com/endpoint1',
          keys: { p256dh: 'key1', auth: 'auth1' }
        }
      ];

      const error = new Error('Push error');
      error.statusCode = 410; // Gone - subscription expired

      jest.spyOn(pushService, 'getUserSubscriptions').mockResolvedValue(mockSubscriptions);
      jest.spyOn(pushService, 'sendToSubscription').mockRejectedValue(error);
      jest.spyOn(pushService, 'handleExpiredSubscription').mockResolvedValue();

      const result = await pushService.sendPush('user123', { title: 'Test' });

      expect(result.success).toBe(false);
      expect(result.total).toBe(1);
      expect(result.successful).toBe(0);
      expect(pushService.handleExpiredSubscription).toHaveBeenCalledWith('sub1');
    });
  });

  describe('sendToSubscription', () => {
    it('should send notification to subscription', async () => {
      const subscription = {
        id: 'sub123',
        endpoint: 'https://example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'auth1' }
      };

      const payload = { title: 'Test', body: 'Message' };

      mockPrisma.pushSubscription.update.mockResolvedValue({});

      const result = await pushService.sendToSubscription(subscription, payload);

      expect(result.success).toBe(true);
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        },
        JSON.stringify(payload)
      );
      expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub123' },
        data: { lastActive: expect.any(Date) }
      });
    });

    it('should handle expired subscription (410 error)', async () => {
      const subscription = {
        id: 'sub123',
        endpoint: 'https://example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'auth1' }
      };

      const error = new Error('Gone');
      error.statusCode = 410;

      webpush.sendNotification.mockRejectedValue(error);
      jest.spyOn(pushService, 'handleExpiredSubscription').mockResolvedValue();

      await expect(
        pushService.sendToSubscription(subscription, { title: 'Test' })
      ).rejects.toThrow('Gone');

      expect(pushService.handleExpiredSubscription).toHaveBeenCalledWith('sub123');
    });

    it('should handle invalid subscription (400 error)', async () => {
      const subscription = {
        id: 'sub123',
        endpoint: 'https://example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'auth1' }
      };

      const error = new Error('Bad Request');
      error.statusCode = 400;

      webpush.sendNotification.mockRejectedValue(error);
      jest.spyOn(pushService, 'handleExpiredSubscription').mockResolvedValue();

      await expect(
        pushService.sendToSubscription(subscription, { title: 'Test' })
      ).rejects.toThrow('Bad Request');

      expect(pushService.handleExpiredSubscription).toHaveBeenCalledWith('sub123');
    });

    it('should handle payload too large (413 error)', async () => {
      const subscription = {
        id: 'sub123',
        endpoint: 'https://example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'auth1' }
      };

      const error = new Error('Payload Too Large');
      error.statusCode = 413;

      webpush.sendNotification.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(
        pushService.sendToSubscription(subscription, { title: 'Test' })
      ).rejects.toThrow('Payload Too Large');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payload too large')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('preparePayload', () => {
    it('should prepare notification payload with defaults', () => {
      const data = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const result = pushService.preparePayload(data);

      expect(result).toEqual({
        title: 'Test Title',
        body: 'Test Body',
        icon: expect.stringContaining('icon-192x192.png'),
        badge: expect.stringContaining('badge-72x72.png'),
        image: undefined,
        tag: 'general',
        requireInteraction: false,
        silent: false,
        timestamp: expect.any(Number),
        data: {
          url: expect.stringContaining('localhost'),
          notificationId: undefined,
          type: 'general'
        }
      });
    });

    it('should include custom data', () => {
      const data = {
        title: 'Test Title',
        body: 'Test Body',
        icon: 'custom-icon.png',
        tag: 'custom-tag',
        url: 'https://custom.com',
        notificationId: 'notif123',
        type: 'custom',
        data: { extra: 'data' }
      };

      const result = pushService.preparePayload(data);

      expect(result.icon).toBe('custom-icon.png');
      expect(result.tag).toBe('custom-tag');
      expect(result.data.url).toBe('https://custom.com');
      expect(result.data.notificationId).toBe('notif123');
      expect(result.data.type).toBe('custom');
      expect(result.data.extra).toBe('data');
    });

    it('should include actions when provided', () => {
      const data = {
        title: 'Test Title',
        body: 'Test Body',
        actions: [
          { action: 'view', title: 'View', icon: 'view.png' },
          { action: 'dismiss', title: 'Dismiss', icon: 'dismiss.png' }
        ]
      };

      const result = pushService.preparePayload(data);

      expect(result.actions).toEqual([
        { action: 'view', title: 'View', icon: 'view.png' },
        { action: 'dismiss', title: 'Dismiss', icon: 'dismiss.png' }
      ]);
    });
  });

  describe('handleExpiredSubscription', () => {
    it('should mark subscription as expired', async () => {
      mockPrisma.pushSubscription.update.mockResolvedValue({});

      await pushService.handleExpiredSubscription('sub123');

      expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub123' },
        data: {
          isActive: false,
          deactivatedAt: expect.any(Date),
          deactivationReason: 'expired'
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.pushSubscription.update.mockRejectedValue(new Error('DB Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await pushService.handleExpiredSubscription('sub123');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to mark subscription sub123 as expired')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cleanupExpiredSubscriptions', () => {
    it('should cleanup old expired subscriptions', async () => {
      mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 5 });

      const result = await pushService.cleanupExpiredSubscriptions();

      expect(result).toBe(5);
      expect(mockPrisma.pushSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          isActive: false,
          deactivatedAt: {
            lt: expect.any(Date)
          }
        },
        data: {
          isActive: false,
          deactivatedAt: expect.any(Date),
          deactivationReason: 'cleanup'
        }
      });
    });
  });

  describe('getPushStats', () => {
    it('should get push notification statistics for all users', async () => {
      mockPrisma.pushSubscription.aggregate.mockResolvedValue({
        _count: { id: 25 }
      });

      const result = await pushService.getPushStats();

      expect(result).toEqual({
        totalActiveSubscriptions: 25,
        userId: 'all'
      });
    });

    it('should get push notification statistics for specific user', async () => {
      mockPrisma.pushSubscription.aggregate.mockResolvedValue({
        _count: { id: 3 }
      });

      const result = await pushService.getPushStats('user123');

      expect(result).toEqual({
        totalActiveSubscriptions: 3,
        userId: 'user123'
      });

      expect(mockPrisma.pushSubscription.aggregate).toHaveBeenCalledWith({
        where: { userId: 'user123', isActive: true },
        _count: { id: true }
      });
    });
  });

  describe('testPush', () => {
    it('should send test push notification in development', async () => {
      process.env.NODE_ENV = 'development';
      jest.spyOn(pushService, 'sendPush').mockResolvedValue({
        success: true,
        total: 2,
        successful: 2
      });

      const result = await pushService.testPush('user123', 'Test message');

      expect(result.success).toBe(true);
      expect(pushService.sendPush).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          title: 'Mediaverse - Test Notification',
          body: 'Test message',
          tag: 'test',
          data: expect.objectContaining({
            type: 'test'
          })
        })
      );

      delete process.env.NODE_ENV;
    });

    it('should throw error in production', async () => {
      process.env.NODE_ENV = 'production';

      await expect(
        pushService.testPush('user123', 'Test message')
      ).rejects.toThrow('Test push notifications are only available in development mode');

      delete process.env.NODE_ENV;
    });
  });

  describe('sendPushQueued', () => {
    it('should queue push notification job', async () => {
      const { createJob } = require('../../../jobs/notificationQueue');
      createJob.mockResolvedValue({ id: 'job123' });

      const payload = { title: 'Test', body: 'Message' };
      const result = await pushService.sendPushQueued('user123', payload);

      expect(result).toEqual({
        queued: true,
        jobId: 'job123'
      });

      expect(createJob).toHaveBeenCalledWith(
        'send-push-notification',
        {
          userId: 'user123',
          payload,
          options: expect.objectContaining({
            priority: 'normal',
            delay: 0
          })
        },
        'normal'
      );
    });

    it('should queue delayed push notification job', async () => {
      const { createDelayedJob } = require('../../../jobs/notificationQueue');
      createDelayedJob.mockResolvedValue({ id: 'job123' });

      const payload = { title: 'Test', body: 'Message' };
      const options = { delay: 5000, priority: 'high' };

      const result = await pushService.sendPushQueued('user123', payload, options);

      expect(result).toEqual({
        queued: true,
        jobId: 'job123'
      });

      expect(createDelayedJob).toHaveBeenCalledWith(
        'send-push-notification',
        expect.objectContaining({
          userId: 'user123',
          payload
        }),
        5000,
        'high'
      );
    });
  });

  describe('sendBatchPush', () => {
    it('should send batch push notifications', async () => {
      jest.spyOn(pushService, 'sendPushQueued').mockResolvedValue({ queued: true, jobId: 'job123' });

      const userIds = ['user1', 'user2', 'user3'];
      const payload = { title: 'Batch Test', body: 'Batch message' };

      const result = await pushService.sendBatchPush(userIds, payload, { batchSize: 2 });

      expect(result.success).toBe(true);
      expect(result.totalUsers).toBe(3);
      expect(pushService.sendPushQueued).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.pushSubscription.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        pushService.getUserSubscriptions('user123')
      ).rejects.toThrow('Database error');
    });

    it('should handle web-push errors gracefully', async () => {
      const error = new Error('Push service error');
      webpush.sendNotification.mockRejectedValue(error);

      const subscription = {
        id: 'sub123',
        endpoint: 'https://example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'auth1' }
      };

      await expect(
        pushService.sendToSubscription(subscription, { title: 'Test' })
      ).rejects.toThrow('Push service error');
    });
  });
});
