// Preferences Service for managing user notification preferences
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES = {
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    categories: {
      likes: {
        email: true,
        push: true,
        inApp: true
      },
      comments: {
        email: true,
        push: true,
        inApp: true
      },
      follows: {
        email: true,
        push: true,
        inApp: true
      },
      uploads: {
        email: true,
        push: true,
        inApp: true
      },
      system: {
        email: true,
        push: false,
        inApp: true
      },
      marketing: {
        email: false,
        push: false,
        inApp: false
      }
    },
    frequency: {
      digest: 'weekly', // 'daily', 'weekly', 'never'
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

class PreferencesService {
  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId) {
    try {
      // Try to get from database
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { preferences: true }
      });

      if (profile?.preferences) {
        // Merge with defaults to ensure all fields exist
        return this.mergeWithDefaults(profile.preferences);
      }

      // Return defaults if no preferences exist
      return { ...DEFAULT_PREFERENCES };
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      // Return defaults on error
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Update user notification preferences
   */
  static async updatePreferences(userId, newPreferences) {
    try {
      // Get current preferences
      const currentPrefs = await this.getUserPreferences(userId);

      // Merge with new preferences
      const updatedPrefs = this.deepMerge(currentPrefs, newPreferences);

      // Validate preferences
      const validatedPrefs = this.validatePreferences(updatedPrefs);

      // Save to database
      await prisma.profile.upsert({
        where: { userId },
        update: {
          preferences: validatedPrefs
        },
        create: {
          userId,
          preferences: validatedPrefs
        }
      });

      console.log(` Updated preferences for user ${userId}`);
      return validatedPrefs;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  /**
   * Check if a notification is allowed for a user
   */
  static async checkNotificationAllowed(userId, category, type) {
    try {
      const preferences = await this.getUserPreferences(userId);

      // Check if overall notification type is enabled
      const typeEnabled = this.isNotificationTypeEnabled(preferences, type);
      if (!typeEnabled) {
        return false;
      }

      // Check if category is enabled for this type
      const categoryEnabled = this.isCategoryEnabled(preferences, category, type);
      if (!categoryEnabled) {
        return false;
      }

      // Check quiet hours
      const inQuietHours = this.isInQuietHours(preferences);
      if (inQuietHours) {
        // Only allow urgent notifications during quiet hours
        return this.isUrgentCategory(category);
      }

      return true;
    } catch (error) {
      console.error('Failed to check notification allowance:', error);
      // Allow notification on error to avoid blocking
      return true;
    }
  }

  /**
   * Check if notification type is enabled overall
   */
  static isNotificationTypeEnabled(preferences, type) {
    const notifications = preferences.notifications || {};

    switch (type) {
      case 'email':
        return notifications.emailNotifications !== false;
      case 'push':
        return notifications.pushNotifications !== false;
      case 'in-app':
      case 'inApp':
        return notifications.inAppNotifications !== false;
      default:
        return false;
    }
  }

  /**
   * Check if category is enabled for notification type
   */
  static isCategoryEnabled(preferences, category, type) {
    const categories = preferences.notifications?.categories || {};

    // Normalize category name
    const normalizedCategory = this.normalizeCategory(category);

    if (!categories[normalizedCategory]) {
      // Category not configured, default to true
      return true;
    }

    const categoryPrefs = categories[normalizedCategory];

    switch (type) {
      case 'email':
        return categoryPrefs.email !== false;
      case 'push':
        return categoryPrefs.push !== false;
      case 'in-app':
      case 'inApp':
        return categoryPrefs.inApp !== false;
      default:
        return false;
    }
  }

  /**
   * Check if currently in quiet hours
   */
  static isInQuietHours(preferences) {
    const quietHours = preferences.notifications?.frequency?.quietHours;

    if (!quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const [startHour, startMinute] = quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = quietHours.end.split(':').map(Number);

    const startTime = startHour * 100 + startMinute;
    const endTime = endHour * 100 + endMinute;

    if (startTime <= endTime) {
      // Same day range (e.g., 22:00 to 08:00 next day)
      return currentTime >= startTime || currentTime <= endTime;
    }
    // Overnight range (e.g., 22:00 to 08:00)
    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Check if category is considered urgent
   */
  static isUrgentCategory(category) {
    const urgentCategories = ['system', 'security'];
    return urgentCategories.includes(this.normalizeCategory(category));
  }

  /**
   * Normalize category name
   */
  static normalizeCategory(category) {
    const categoryMap = {
      like: 'likes',
      comment: 'comments',
      follow: 'follows',
      upload: 'uploads',
      content: 'uploads',
      security: 'system',
      admin: 'system',
      maintenance: 'system'
    };

    return categoryMap[category] || category;
  }

  /**
   * Get available categories
   */
  static getAvailableCategories() {
    return ['likes', 'comments', 'follows', 'uploads', 'system', 'marketing'];
  }

  /**
   * Get available notification types
   */
  static getAvailableTypes() {
    return ['email', 'push', 'in-app'];
  }

  /**
   * Reset user preferences to defaults
   */
  static async resetPreferences(userId) {
    try {
      await prisma.profile.update({
        where: { userId },
        data: {
          preferences: DEFAULT_PREFERENCES
        }
      });

      console.log(`Reset preferences to defaults for user ${userId}`);
      return { ...DEFAULT_PREFERENCES };
    } catch (error) {
      console.error('Failed to reset user preferences:', error);
      throw error;
    }
  }

  /**
   * Bulk update preferences for multiple users (admin function)
   */
  static async bulkUpdatePreferences(userIds, preferences) {
    try {
      const validatedPrefs = this.validatePreferences(preferences);

      const updatePromises = userIds.map((userId) => prisma.profile.upsert({
        where: { userId },
        update: { preferences: validatedPrefs },
        create: { userId, preferences: validatedPrefs }
      }));

      await Promise.all(updatePromises);

      console.log(`Bulk updated preferences for ${userIds.length} users`);
      return { success: true, updatedCount: userIds.length };
    } catch (error) {
      console.error('Failed to bulk update preferences:', error);
      throw error;
    }
  }

  /**
   * Get users who have enabled notifications for a category
   */
  static async getUsersForCategory(category, type) {
    try {
      // This is a simplified version - in production you'd need a more complex query
      // to check nested preferences in JSON field
      const profiles = await prisma.profile.findMany({
        where: {
          // This would need custom logic to check JSON preferences
          // For now, return all profiles
        },
        select: {
          userId: true
        }
      });

      // Filter based on preferences (simplified)
      const filteredUsers = [];
      for (const profile of profiles) {
        const allowed = await this.checkNotificationAllowed(profile.userId, category, type);
        if (allowed) {
          filteredUsers.push(profile.userId);
        }
      }

      return filteredUsers;
    } catch (error) {
      console.error('Failed to get users for category:', error);
      return [];
    }
  }

  /**
   * Validate preferences object
   */
  static validatePreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      throw new Error('Invalid preferences format');
    }

    // Deep clone to avoid modifying original
    const validated = JSON.parse(JSON.stringify(preferences));

    // Ensure notifications structure exists
    if (!validated.notifications) {
      validated.notifications = { ...DEFAULT_PREFERENCES.notifications };
    }

    // Ensure categories exist
    if (!validated.notifications.categories) {
      validated.notifications.categories = { ...DEFAULT_PREFERENCES.notifications.categories };
    }

    // Validate notification types
    const validTypes = this.getAvailableTypes();
    const { notifications } = validated;

    if (typeof notifications.emailNotifications !== 'boolean') {
      notifications.emailNotifications = DEFAULT_PREFERENCES.notifications.emailNotifications;
    }
    if (typeof notifications.pushNotifications !== 'boolean') {
      notifications.pushNotifications = DEFAULT_PREFERENCES.notifications.pushNotifications;
    }
    if (typeof notifications.inAppNotifications !== 'boolean') {
      notifications.inAppNotifications = DEFAULT_PREFERENCES.notifications.inAppNotifications;
    }

    // Validate categories
    const validCategories = this.getAvailableCategories();
    for (const category of validCategories) {
      if (!notifications.categories[category]) {
        notifications.categories[category] = { ...DEFAULT_PREFERENCES.notifications.categories[category] };
      }

      const categoryPrefs = notifications.categories[category];
      for (const type of validTypes) {
        const typeKey = type === 'in-app' ? 'inApp' : type;
        if (typeof categoryPrefs[typeKey] !== 'boolean') {
          categoryPrefs[typeKey] = DEFAULT_PREFERENCES.notifications.categories[category][typeKey];
        }
      }
    }

    return validated;
  }

  /**
   * Deep merge two objects
   */
  static deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Merge preferences with defaults
   */
  static mergeWithDefaults(preferences) {
    return this.deepMerge({ ...DEFAULT_PREFERENCES }, preferences);
  }

  /**
   * Export user preferences for backup/migration
   */
  static async exportPreferences(userId) {
    try {
      const preferences = await this.getUserPreferences(userId);
      return {
        userId,
        preferences,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export preferences:', error);
      throw error;
    }
  }

  /**
   * Import user preferences from backup
   */
  static async importPreferences(userId, preferencesData) {
    try {
      const preferences = preferencesData.preferences || preferencesData;
      const validatedPrefs = this.validatePreferences(preferences);

      await this.updatePreferences(userId, validatedPrefs);

      console.log(`Imported preferences for user ${userId}`);
      return validatedPrefs;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      throw error;
    }
  }
}

module.exports = PreferencesService;
