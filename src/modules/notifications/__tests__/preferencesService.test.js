const { PrismaClient } = require('@prisma/client');
const PreferencesService = require('../services/preferencesService');

// Mock dependencies
jest.mock('@prisma/client');

const mockPrisma = {
  profile: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn()
  },
  $disconnect: jest.fn()
};

PrismaClient.mockImplementation(() => mockPrisma);

describe('PreferencesService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return user preferences from database', async () => {
      const mockProfile = {
        preferences: {
          notifications: {
            emailNotifications: true,
            pushNotifications: false,
            inAppNotifications: true,
            categories: {
              likes: { email: true, push: false, inApp: true },
              comments: { email: false, push: true, inApp: true }
            }
          }
        }
      };

      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await PreferencesService.getUserPreferences('user123');

      expect(result.notifications.emailNotifications).toBe(true);
      expect(result.notifications.pushNotifications).toBe(false);
      expect(result.notifications.categories.likes.email).toBe(true);
      expect(mockPrisma.profile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        select: { preferences: true }
      });
    });

    it('should return default preferences when user has no preferences', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      const result = await PreferencesService.getUserPreferences('user123');

      expect(result.notifications.emailNotifications).toBe(true);
      expect(result.notifications.pushNotifications).toBe(true);
      expect(result.notifications.inAppNotifications).toBe(true);
      expect(result.notifications.categories.likes).toBeDefined();
      expect(result.notifications.categories.comments).toBeDefined();
    });

    it('should merge with defaults when preferences exist but incomplete', async () => {
      const mockProfile = {
        preferences: {
          notifications: {
            emailNotifications: false
            // Missing other fields
          }
        }
      };

      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await PreferencesService.getUserPreferences('user123');

      expect(result.notifications.emailNotifications).toBe(false);
      expect(result.notifications.pushNotifications).toBe(true); // Default value
      expect(result.notifications.categories).toBeDefined(); // Default categories
    });

    it('should return defaults on database error', async () => {
      mockPrisma.profile.findUnique.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await PreferencesService.getUserPreferences('user123');

      expect(result.notifications.emailNotifications).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get user preferences')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences successfully', async () => {
      const currentPrefs = {
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          categories: {
            likes: { email: true, push: true, inApp: true }
          }
        }
      };

      const newPrefs = {
        notifications: {
          emailNotifications: false,
          categories: {
            likes: { email: false }
          }
        }
      };

      const expectedMerged = {
        notifications: {
          emailNotifications: false,
          pushNotifications: true,
          inAppNotifications: true,
          categories: {
            likes: { email: false, push: true, inApp: true },
            comments: { email: true, push: true, inApp: true },
            follows: { email: true, push: true, inApp: true },
            uploads: { email: true, push: true, inApp: true },
            system: { email: true, push: false, inApp: true },
            marketing: { email: false, push: false, inApp: false }
          },
          frequency: {
            digest: 'weekly',
            quietHours: {
              enabled: false,
              start: '22:00',
              end: '08:00'
            }
          }
        },
        privacy: {
          showOnlineStatus: true,
          allowDirectMessages: true
        }
      };

      jest.spyOn(PreferencesService, 'getUserPreferences').mockResolvedValue(currentPrefs);
      mockPrisma.profile.upsert.mockResolvedValue({ preferences: expectedMerged });

      const result = await PreferencesService.updatePreferences('user123', newPrefs);

      expect(result.notifications.emailNotifications).toBe(false);
      expect(result.notifications.pushNotifications).toBe(true);
      expect(mockPrisma.profile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        update: { preferences: expectedMerged },
        create: { userId: 'user123', preferences: expectedMerged }
      });
    });

    it('should handle database errors', async () => {
      jest.spyOn(PreferencesService, 'getUserPreferences').mockResolvedValue({});
      mockPrisma.profile.upsert.mockRejectedValue(new Error('Database error'));

      await expect(
        PreferencesService.updatePreferences('user123', {})
      ).rejects.toThrow('Database error');
    });
  });

  describe('checkNotificationAllowed', () => {
    beforeEach(() => {
      jest.spyOn(PreferencesService, 'getUserPreferences').mockResolvedValue({
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          inAppNotifications: true,
          categories: {
            likes: { email: true, push: true, inApp: true },
            comments: { email: false, push: true, inApp: true },
            system: { email: true, push: true, inApp: true }
          },
          frequency: {
            quietHours: {
              enabled: false,
              start: '22:00',
              end: '08:00'
            }
          }
        }
      });
    });

    it('should allow notification when all conditions met', async () => {
      const result = await PreferencesService.checkNotificationAllowed('user123', 'likes', 'email');
      expect(result).toBe(true);
    });

    it('should deny notification when type disabled', async () => {
      jest.spyOn(PreferencesService, 'getUserPreferences').mockResolvedValue({
        notifications: { emailNotifications: false }
      });

      const result = await PreferencesService.checkNotificationAllowed('user123', 'likes', 'email');
      expect(result).toBe(false);
    });

    it('should deny notification when category disabled for type', async () => {
      const result = await PreferencesService.checkNotificationAllowed('user123', 'comments', 'email');
      expect(result).toBe(false);
    });

    it('should allow urgent notifications during quiet hours', async () => {
      // Mock current time to be in quiet hours (e.g., 23:00)
      const originalDate = Date;
      const mockDate = new Date('2023-01-01T23:00:00');
      global.Date = jest.fn(() => mockDate);
      global.Date.prototype.getHours = jest.fn(() => 23);
      global.Date.prototype.getMinutes = jest.fn(() => 0);

      jest.spyOn(PreferencesService, 'getUserPreferences').mockResolvedValue({
        notifications: {
          emailNotifications: true,
          frequency: {
            quietHours: {
              enabled: true,
              start: '22:00',
              end: '08:00'
            }
          }
        }
      });

      const result = await PreferencesService.checkNotificationAllowed('user123', 'system', 'email');
      expect(result).toBe(true); // System notifications are urgent

      global.Date = originalDate;
    });

    it('should deny non-urgent notifications during quiet hours', async () => {
      // Mock current time to be in quiet hours
      const originalDate = Date;
      const mockDate = new Date('2023-01-01T23:00:00');
      global.Date = jest.fn(() => mockDate);
      global.Date.prototype.getHours = jest.fn(() => 23);
      global.Date.prototype.getMinutes = jest.fn(() => 0);

      jest.spyOn(PreferencesService, 'getUserPreferences').mockResolvedValue({
        notifications: {
          emailNotifications: true,
          frequency: {
            quietHours: {
              enabled: true,
              start: '22:00',
              end: '08:00'
            }
          }
        }
      });

      const result = await PreferencesService.checkNotificationAllowed('user123', 'likes', 'email');
      expect(result).toBe(false); // Likes are not urgent

      global.Date = originalDate;
    });

    it('should allow notification on error (fail safe)', async () => {
      jest.spyOn(PreferencesService, 'getUserPreferences').mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await PreferencesService.checkNotificationAllowed('user123', 'likes', 'email');

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('isNotificationTypeEnabled', () => {
    it('should check email notifications enabled', () => {
      const preferences = { notifications: { emailNotifications: true } };
      const result = PreferencesService.isNotificationTypeEnabled(preferences, 'email');
      expect(result).toBe(true);
    });

    it('should check push notifications enabled', () => {
      const preferences = { notifications: { pushNotifications: false } };
      const result = PreferencesService.isNotificationTypeEnabled(preferences, 'push');
      expect(result).toBe(false);
    });

    it('should check in-app notifications enabled', () => {
      const preferences = { notifications: { inAppNotifications: true } };
      let result = PreferencesService.isNotificationTypeEnabled(preferences, 'in-app');
      expect(result).toBe(true);

      result = PreferencesService.isNotificationTypeEnabled(preferences, 'inApp');
      expect(result).toBe(true);
    });

    it('should return false for unknown types', () => {
      const preferences = { notifications: {} };
      const result = PreferencesService.isNotificationTypeEnabled(preferences, 'unknown');
      expect(result).toBe(false);
    });
  });

  describe('isCategoryEnabled', () => {
    it('should check category enabled for type', () => {
      const preferences = {
        notifications: {
          categories: {
            likes: { email: true, push: false, inApp: true }
          }
        }
      };

      expect(PreferencesService.isCategoryEnabled(preferences, 'likes', 'email')).toBe(true);
      expect(PreferencesService.isCategoryEnabled(preferences, 'likes', 'push')).toBe(false);
      expect(PreferencesService.isCategoryEnabled(preferences, 'likes', 'inApp')).toBe(true);
    });

    it('should return true for unconfigured category (default)', () => {
      const preferences = { notifications: { categories: {} } };
      const result = PreferencesService.isCategoryEnabled(preferences, 'unknown', 'email');
      expect(result).toBe(true);
    });

    it('should normalize category names', () => {
      const preferences = {
        notifications: {
          categories: {
            likes: { email: true }
          }
        }
      };

      const result = PreferencesService.isCategoryEnabled(preferences, 'like', 'email');
      expect(result).toBe(true); // 'like' should be normalized to 'likes'
    });
  });

  describe('isInQuietHours', () => {
    beforeEach(() => {
      // Mock current time to 23:30 (11:30 PM)
      const originalDate = Date;
      global.Date = jest.fn(() => new Date('2023-01-01T23:30:00'));
      global.Date.prototype.getHours = jest.fn(() => 23);
      global.Date.prototype.getMinutes = jest.fn(() => 30);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return false when quiet hours disabled', () => {
      const preferences = {
        notifications: {
          frequency: {
            quietHours: { enabled: false, start: '22:00', end: '08:00' }
          }
        }
      };

      const result = PreferencesService.isInQuietHours(preferences);
      expect(result).toBe(false);
    });

    it('should return true when in quiet hours range', () => {
      const preferences = {
        notifications: {
          frequency: {
            quietHours: { enabled: true, start: '22:00', end: '08:00' }
          }
        }
      };

      const result = PreferencesService.isInQuietHours(preferences);
      expect(result).toBe(true); // 23:30 is between 22:00 and 08:00
    });

    it('should handle same-day quiet hours', () => {
      // Mock time to 14:00 (2:00 PM)
      global.Date.prototype.getHours.mockReturnValue(14);
      global.Date.prototype.getMinutes.mockReturnValue(0);

      const preferences = {
        notifications: {
          frequency: {
            quietHours: { enabled: true, start: '13:00', end: '15:00' }
          }
        }
      };

      const result = PreferencesService.isInQuietHours(preferences);
      expect(result).toBe(true); // 14:00 is between 13:00 and 15:00
    });
  });

  describe('isUrgentCategory', () => {
    it('should identify system as urgent', () => {
      expect(PreferencesService.isUrgentCategory('system')).toBe(true);
    });

    it('should identify security as urgent', () => {
      expect(PreferencesService.isUrgentCategory('security')).toBe(true);
    });

    it('should not identify likes as urgent', () => {
      expect(PreferencesService.isUrgentCategory('likes')).toBe(false);
    });

    it('should normalize category before checking', () => {
      expect(PreferencesService.isUrgentCategory('admin')).toBe(true); // maps to system
    });
  });

  describe('normalizeCategory', () => {
    it('should normalize category names correctly', () => {
      expect(PreferencesService.normalizeCategory('like')).toBe('likes');
      expect(PreferencesService.normalizeCategory('comment')).toBe('comments');
      expect(PreferencesService.normalizeCategory('follow')).toBe('follows');
      expect(PreferencesService.normalizeCategory('upload')).toBe('uploads');
      expect(PreferencesService.normalizeCategory('content')).toBe('uploads');
      expect(PreferencesService.normalizeCategory('security')).toBe('system');
      expect(PreferencesService.normalizeCategory('admin')).toBe('system');
      expect(PreferencesService.normalizeCategory('maintenance')).toBe('system');
    });

    it('should return original category if no mapping exists', () => {
      expect(PreferencesService.normalizeCategory('custom')).toBe('custom');
    });
  });

  describe('getAvailableCategories', () => {
    it('should return available categories', () => {
      const categories = PreferencesService.getAvailableCategories();
      expect(categories).toEqual(['likes', 'comments', 'follows', 'uploads', 'system', 'marketing']);
    });
  });

  describe('getAvailableTypes', () => {
    it('should return available notification types', () => {
      const types = PreferencesService.getAvailableTypes();
      expect(types).toEqual(['email', 'push', 'in-app']);
    });
  });

  describe('resetPreferences', () => {
    it('should reset preferences to defaults', async () => {
      mockPrisma.profile.update.mockResolvedValue({
        preferences: { notifications: { emailNotifications: true } }
      });

      const result = await PreferencesService.resetPreferences('user123');

      expect(result.notifications.emailNotifications).toBe(true);
      expect(mockPrisma.profile.update).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        data: {
          preferences: expect.objectContaining({
            notifications: expect.objectContaining({
              emailNotifications: true,
              pushNotifications: true,
              inAppNotifications: true
            })
          })
        }
      });
    });
  });

  describe('bulkUpdatePreferences', () => {
    it('should update preferences for multiple users', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      const preferences = {
        notifications: { emailNotifications: false }
      };

      mockPrisma.profile.upsert
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 3 });

      const result = await PreferencesService.bulkUpdatePreferences(userIds, preferences);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(mockPrisma.profile.upsert).toHaveBeenCalledTimes(3);
    });
  });

  describe('getUsersForCategory', () => {
    it('should get users with notifications enabled for category', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        { userId: 'user1' },
        { userId: 'user2' },
        { userId: 'user3' }
      ]);

      jest.spyOn(PreferencesService, 'checkNotificationAllowed')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await PreferencesService.getUsersForCategory('likes', 'email');

      expect(result).toEqual(['user1', 'user3']);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.profile.findMany.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await PreferencesService.getUsersForCategory('likes', 'email');

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('validatePreferences', () => {
    it('should validate and fix invalid preferences', () => {
      const invalidPrefs = {
        notifications: {
          emailNotifications: 'invalid', // Should be boolean
          categories: {
            likes: { email: 'invalid' } // Should be boolean
          }
        }
      };

      const result = PreferencesService.validatePreferences(invalidPrefs);

      expect(result.notifications.emailNotifications).toBe(true); // Default value
      expect(result.notifications.categories.likes.email).toBe(true); // Default value
    });

    it('should throw error for invalid input', () => {
      expect(() => PreferencesService.validatePreferences(null)).toThrow('Invalid preferences format');
      expect(() => PreferencesService.validatePreferences('string')).toThrow('Invalid preferences format');
    });

    it('should ensure all required fields exist', () => {
      const minimalPrefs = {};

      const result = PreferencesService.validatePreferences(minimalPrefs);

      expect(result.notifications).toBeDefined();
      expect(result.notifications.categories).toBeDefined();
      expect(result.notifications.categories.likes).toBeDefined();
      expect(result.notifications.categories.comments).toBeDefined();
    });
  });

  describe('deepMerge', () => {
    it('should deep merge objects correctly', () => {
      const target = {
        a: 1,
        b: { c: 2, d: 3 },
        e: [1, 2]
      };

      const source = {
        b: { c: 4, f: 5 },
        g: 6
      };

      const result = PreferencesService.deepMerge(target, source);

      expect(result).toEqual({
        a: 1,
        b: { c: 4, d: 3, f: 5 },
        e: [1, 2],
        g: 6
      });
    });
  });

  describe('exportPreferences', () => {
    it('should export user preferences', async () => {
      const mockPrefs = { notifications: { emailNotifications: true } };
      jest.spyOn(PreferencesService, 'getUserPreferences').mockResolvedValue(mockPrefs);

      const result = await PreferencesService.exportPreferences('user123');

      expect(result.userId).toBe('user123');
      expect(result.preferences).toEqual(mockPrefs);
      expect(result.exportedAt).toBeDefined();
    });
  });

  describe('importPreferences', () => {
    it('should import user preferences', async () => {
      const prefsData = {
        preferences: { notifications: { emailNotifications: false } }
      };

      jest.spyOn(PreferencesService, 'updatePreferences').mockResolvedValue(prefsData.preferences);

      const result = await PreferencesService.importPreferences('user123', prefsData);

      expect(result).toEqual(prefsData.preferences);
      expect(PreferencesService.updatePreferences).toHaveBeenCalledWith('user123', prefsData.preferences);
    });
  });
});
