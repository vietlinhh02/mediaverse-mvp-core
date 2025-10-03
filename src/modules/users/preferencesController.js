// Preferences controller for user settings
const Joi = require('joi');
const { prisma } = require('../../config/database');
const { cache } = require('../../config/redis');
const { logger } = require('../../middleware/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserPreferences:
 *       type: object
 *       properties:
 *         notifications:
 *           type: object
 *           properties:
 *             email:
 *               type: object
 *               properties:
 *                 newFollower:
 *                   type: boolean
 *                 newComment:
 *                   type: boolean
 *                 newLike:
 *                   type: boolean
 *                 contentPublished:
 *                   type: boolean
 *                 weeklyDigest:
 *                   type: boolean
 *             push:
 *               type: object
 *               properties:
 *                 newFollower:
 *                   type: boolean
 *                 newComment:
 *                   type: boolean
 *                 newLike:
 *                   type: boolean
 *                 contentPublished:
 *                   type: boolean
 *             inApp:
 *               type: object
 *               properties:
 *                 newFollower:
 *                   type: boolean
 *                 newComment:
 *                   type: boolean
 *                 newLike:
 *                   type: boolean
 *                 contentPublished:
 *                   type: boolean
 *                 systemUpdates:
 *                   type: boolean
 *         privacy:
 *           type: object
 *           properties:
 *             profileVisibility:
 *               type: string
 *               enum: [public, private, followers]
 *             showEmail:
 *               type: boolean
 *             showFollowers:
 *               type: boolean
 *             showFollowing:
 *               type: boolean
 *             allowDirectMessages:
 *               type: string
 *               enum: [everyone, followers, none]
 *             searchable:
 *               type: boolean
 *         content:
 *           type: object
 *           properties:
 *             defaultVisibility:
 *               type: string
 *               enum: [public, private, unlisted]
 *             allowComments:
 *               type: boolean
 *             allowLikes:
 *               type: boolean
 *             moderateComments:
 *               type: boolean
 *             categories:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [technology, education, entertainment, business, health, lifestyle, other]
 *             language:
 *               type: string
 *         display:
 *           type: object
 *           properties:
 *             theme:
 *               type: string
 *               enum: [light, dark, auto]
 *             language:
 *               type: string
 *             timezone:
 *               type: string
 *             dateFormat:
 *               type: string
 *               enum: [MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD]
 *             compactMode:
 *               type: boolean
 */

class PreferencesController {
  // Preferences validation schema
  static preferencesSchema = Joi.object({
    notifications: Joi.object({
      email: Joi.object({
        newFollower: Joi.boolean().default(true),
        newComment: Joi.boolean().default(true),
        newLike: Joi.boolean().default(false),
        contentPublished: Joi.boolean().default(true),
        weeklyDigest: Joi.boolean().default(true)
      }).default({}),
      push: Joi.object({
        newFollower: Joi.boolean().default(true),
        newComment: Joi.boolean().default(true),
        newLike: Joi.boolean().default(false),
        contentPublished: Joi.boolean().default(true)
      }).default({}),
      inApp: Joi.object({
        newFollower: Joi.boolean().default(true),
        newComment: Joi.boolean().default(true),
        newLike: Joi.boolean().default(true),
        contentPublished: Joi.boolean().default(true),
        systemUpdates: Joi.boolean().default(true)
      }).default({})
    }).default({}),
    privacy: Joi.object({
      profileVisibility: Joi.string().valid('public', 'private', 'followers').default('public'),
      showEmail: Joi.boolean().default(false),
      showFollowers: Joi.boolean().default(true),
      showFollowing: Joi.boolean().default(true),
      allowDirectMessages: Joi.string().valid('everyone', 'followers', 'none').default('followers'),
      searchable: Joi.boolean().default(true)
    }).default({}),
    content: Joi.object({
      defaultVisibility: Joi.string().valid('public', 'private', 'unlisted').default('public'),
      allowComments: Joi.boolean().default(true),
      allowLikes: Joi.boolean().default(true),
      moderateComments: Joi.boolean().default(false),
      categories: Joi.array().items(
        Joi.string().valid('technology', 'education', 'entertainment', 'business', 'health', 'lifestyle', 'other')
      ).default([]),
      language: Joi.string().default('en')
    }).default({}),
    display: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto').default('auto'),
      language: Joi.string().default('en'),
      timezone: Joi.string().default('UTC'),
      dateFormat: Joi.string().valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD').default('MM/DD/YYYY'),
      compactMode: Joi.boolean().default(false)
    }).default({})
  });

  /**
   * @swagger
   * /api/users/preferences:
   *   get:
   *     summary: Get user preferences
   *     tags: [Preferences]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Preferences retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserPreferences'
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Profile not found
   */
  // GET /api/users/preferences - Get user preferences
  async getPreferences(req, res) {
    try {
      const { userId } = req.user;
      const cacheKey = `preferences:${userId}`;

      // Try cache first
      let preferences = await cache.get(cacheKey);

      if (!preferences) {
        // Get from database
        const profile = await prisma.profile.findUnique({
          where: { userId },
          select: { preferences: true }
        });

        if (!profile) {
          return res.status(404).json({
            error: 'Profile not found',
            code: 'PROFILE_NOT_FOUND'
          });
        }

        preferences = profile.preferences || {};

        // Cache the result
        await cache.set(cacheKey, preferences, 3600); // 1 hour
      }

      // Merge with default preferences
      const { value: defaultPreferences } = PreferencesController.preferencesSchema.validate({});
      const mergedPreferences = this.mergePreferences(defaultPreferences, preferences);

      res.json({
        success: true,
        data: mergedPreferences
      });
    } catch (error) {
      logger.error({
        message: 'Get preferences error',
        error: error.message,
        userId: req.user?.userId
      });

      res.status(500).json({
        error: 'Failed to get preferences',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/preferences:
   *   put:
   *     summary: Update user preferences
   *     tags: [Preferences]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserPreferences'
   *     responses:
   *       200:
   *         description: Preferences updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserPreferences'
   *                 message:
   *                   type: string
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Profile not found
   */
  // PUT /api/users/preferences - Update user preferences
  async updatePreferences(req, res) {
    try {
      const { userId } = req.user;
      const updates = req.body;

      // Validate preferences
      const { error, value: validatedPreferences } = PreferencesController.preferencesSchema.validate(updates, {
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        return res.status(400).json({
          error: 'Invalid preferences data',
          code: 'VALIDATION_ERROR',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      // Get current preferences
      const currentProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { preferences: true }
      });

      if (!currentProfile) {
        return res.status(404).json({
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Merge with existing preferences
      const currentPreferences = currentProfile.preferences || {};
      const mergedPreferences = this.mergePreferences(currentPreferences, validatedPreferences);

      // Update in database
      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          preferences: mergedPreferences,
          updatedAt: new Date()
        },
        select: { preferences: true }
      });

      // Update cache
      const cacheKey = `preferences:${userId}`;
      await cache.set(cacheKey, updatedProfile.preferences, 3600);

      logger.info({
        message: 'Preferences updated successfully',
        userId,
        updatedFields: Object.keys(validatedPreferences)
      });

      res.json({
        success: true,
        data: updatedProfile.preferences,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      logger.error({
        message: 'Update preferences error',
        error: error.message,
        userId: req.user?.userId,
        updates: req.body
      });

      res.status(500).json({
        error: 'Failed to update preferences',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/preferences/{section}:
   *   patch:
   *     summary: Update specific preference section
   *     tags: [Preferences]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: section
   *         required: true
   *         schema:
   *           type: string
   *           enum: [notifications, privacy, content, display]
   *         description: Preference section to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Section-specific preference updates
   *     responses:
   *       200:
   *         description: Preference section updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserPreferences'
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid section or validation error
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Profile not found
   */
  // PATCH /api/users/preferences/:section - Update specific preference section
  async updatePreferenceSection(req, res) {
    try {
      const { userId } = req.user;
      const { section } = req.params;
      const updates = req.body;

      // Validate section
      const validSections = ['notifications', 'privacy', 'content', 'display'];
      if (!validSections.includes(section)) {
        return res.status(400).json({
          error: 'Invalid preference section',
          code: 'INVALID_SECTION',
          validSections
        });
      }

      // Get current preferences
      const currentProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { preferences: true }
      });

      if (!currentProfile) {
        return res.status(404).json({
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      const currentPreferences = currentProfile.preferences || {};

      // Update specific section
      const updatedPreferences = {
        ...currentPreferences,
        [section]: {
          ...currentPreferences[section],
          ...updates
        }
      };

      // Validate the entire preferences object
      const { error, value: validatedPreferences } = PreferencesController.preferencesSchema.validate(updatedPreferences);

      if (error) {
        return res.status(400).json({
          error: 'Invalid preferences data',
          code: 'VALIDATION_ERROR',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      // Update in database
      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          preferences: validatedPreferences,
          updatedAt: new Date()
        },
        select: { preferences: true }
      });

      // Update cache
      const cacheKey = `preferences:${userId}`;
      await cache.set(cacheKey, updatedProfile.preferences, 3600);

      logger.info({
        message: 'Preference section updated successfully',
        userId,
        section,
        updatedFields: Object.keys(updates)
      });

      res.json({
        success: true,
        data: updatedProfile.preferences,
        message: `${section} preferences updated successfully`
      });
    } catch (error) {
      logger.error({
        message: 'Update preference section error',
        error: error.message,
        userId: req.user?.userId,
        section: req.params.section,
        updates: req.body
      });

      res.status(500).json({
        error: 'Failed to update preference section',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/preferences:
   *   delete:
   *     summary: Reset preferences to default
   *     tags: [Preferences]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Preferences reset successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserPreferences'
   *                 message:
   *                   type: string
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Profile not found
   */
  // DELETE /api/users/preferences - Reset preferences to default
  async resetPreferences(req, res) {
    try {
      const { userId } = req.user;

      // Get default preferences
      const { value: defaultPreferences } = PreferencesController.preferencesSchema.validate({});

      // Update in database
      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          preferences: defaultPreferences,
          updatedAt: new Date()
        },
        select: { preferences: true }
      });

      // Update cache
      const cacheKey = `preferences:${userId}`;
      await cache.set(cacheKey, updatedProfile.preferences, 3600);

      logger.info({
        message: 'Preferences reset to default',
        userId
      });

      res.json({
        success: true,
        data: updatedProfile.preferences,
        message: 'Preferences reset to default successfully'
      });
    } catch (error) {
      logger.error({
        message: 'Reset preferences error',
        error: error.message,
        userId: req.user?.userId
      });

      if (error.code === 'P2025') {
        return res.status(404).json({
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      res.status(500).json({
        error: 'Failed to reset preferences',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Helper method to deep merge preferences
  mergePreferences(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergePreferences(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}

module.exports = PreferencesController;
