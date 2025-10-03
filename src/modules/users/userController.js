// User controller with profile management endpoints
const UserService = require('./userService');
const { logger } = require('../../middleware/logger');
const searchService = require('../../services/searchService'); // Import the search service

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Profile ID
 *         userId:
 *           type: string
 *           description: User ID
 *         displayName:
 *           type: string
 *           description: Display name
 *         bio:
 *           type: string
 *           description: User biography
 *         avatarUrl:
 *           type: string
 *           description: Avatar image URL
 *         location:
 *           type: string
 *           description: User location
 *         website:
 *           type: string
 *           description: User website URL
 *         isPublic:
 *           type: boolean
 *           description: Profile visibility
 *         stats:
 *           type: object
 *           properties:
 *             followersCount:
 *               type: integer
 *             followingCount:
 *               type: integer
 *             contentCount:
 *               type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             username:
 *               type: string
 *             email:
 *               type: string
 *             role:
 *               type: string
 *             status:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 */

const userService = new UserService();

class UserController {
  /**
   * @swagger
   * /api/users/profile/{id}:
   *   get:
   *     summary: Get user profile by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserProfile'
   *       404:
   *         description: Profile not found
   *       403:
   *         description: Profile is private
   */
  // GET /api/users/profile/:id - Get user profile
  async getProfile(req, res) {
    try {
      const { id } = req.params;

      const profile = await userService.getProfile(id);

      // Remove sensitive information if not own profile
      const isOwnProfile = req.user && req.user.userId === id;
      if (!isOwnProfile) {
        delete profile.user.email;
        if (!profile.isPublic) {
          return res.status(403).json({
            error: 'Profile is private',
            code: 'PRIVATE_PROFILE'
          });
        }
      }

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error({
        message: 'Get profile error',
        error: error.message,
        userId: req.user?.userId,
        profileId: req.params.id
      });

      if (error.message === 'Profile not found') {
        return res.status(404).json({
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      res.status(500).json({
        error: 'Failed to get profile',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               displayName:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 50
   *               bio:
   *                 type: string
   *                 maxLength: 500
   *               location:
   *                 type: string
   *                 maxLength: 100
   *               website:
   *                 type: string
   *                 format: uri
   *               isPublic:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserProfile'
   *                 message:
   *                   type: string
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication required
   */
  // PUT /api/users/profile - Update user profile
  async updateProfile(req, res) {
    try {
      const { userId } = req.user;
      const updates = req.body;

      // Validate website URL if provided
      if (updates.website && !this.isValidUrl(updates.website)) {
        return res.status(400).json({
          error: 'Invalid website URL',
          code: 'INVALID_URL'
        });
      }

      const profile = await userService.updateProfile(userId, updates);

      logger.info({
        message: 'Profile updated successfully',
        userId,
        updates: Object.keys(updates)
      });

      res.json({
        success: true,
        data: profile,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error({
        message: 'Update profile error',
        error: error.message,
        userId: req.user?.userId,
        updates: req.body
      });

      if (error.message === 'Profile not found') {
        return res.status(404).json({
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      res.status(500).json({
        error: 'Failed to update profile',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/upload-avatar:
   *   post:
   *     summary: Upload user avatar
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               image:
   *                 type: string
   *                 format: binary
   *                 description: Avatar image file (max 5MB, JPEG/PNG/WebP)
   *     responses:
   *       200:
   *         description: Avatar uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     profile:
   *                       $ref: '#/components/schemas/UserProfile'
   *                     avatarUrls:
   *                       type: object
   *                       properties:
   *                         200x200:
   *                           type: string
   *                         400x400:
   *                           type: string
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid file or validation error
   *       401:
   *         description: Authentication required
   */
  // POST /api/users/upload-avatar - Upload and process avatar
  async uploadAvatar(req, res) {
    try {
      const { userId } = req.user;

      // Debug logging
      logger.info({
        message: 'Upload avatar request received',
        userId,
        hasFile: !!req.file,
        fieldName: req.file?.fieldname,
        originalName: req.file?.originalname,
        mimetype: req.file?.mimetype,
        size: req.file?.size
      });

      if (!req.file) {
        return res.status(400).json({
          error: 'No image file provided',
          code: 'NO_FILE'
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
          code: 'INVALID_FILE_TYPE'
        });
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({
          error: 'File size too large. Maximum 5MB allowed',
          code: 'FILE_TOO_LARGE'
        });
      }

      const result = await userService.uploadAvatar(userId, req.file);

      logger.info({
        message: 'Avatar uploaded successfully',
        userId,
        filename: req.file.originalname,
        size: req.file.size
      });

      res.json({
        success: true,
        data: result,
        message: 'Avatar uploaded successfully'
      });
    } catch (error) {
      logger.error({
        message: 'Upload avatar error',
        error: error.message,
        userId: req.user?.userId,
        filename: req.file?.originalname
      });

      res.status(500).json({
        error: 'Failed to upload avatar',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/search:
   *   get:
   *     summary: Search users
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *           minLength: 1
   *           maxLength: 100
   *         description: Search query
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 20
   *         description: Results per page
   *     responses:
   *       200:
   *         description: Users found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     users:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           username:
   *                             type: string
   *                           displayName:
   *                             type: string
   *                           bio:
   *                             type: string
   *                           avatarUrl:
   *                             type: string
   *                           stats:
   *                             type: object
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         page:
   *                           type: integer
   *                         limit:
   *                           type: integer
   *                         total:
   *                           type: integer
   *                         pages:
   *                           type: integer
   *       400:
   *         description: Validation error
   */
  // GET /api/users/search - Search users
  async searchUsers(req, res) {
    try {
      const {
        q, limit = 20, offset = 0, filters, sort
      } = req.query;

      if (!q || q.trim().length < 1) {
        return res.status(400).json({
          error: 'Search query is required',
          code: 'MISSING_QUERY'
        });
      }

      const searchResults = await searchService.search('users', q, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        filters,
        sort
      });

      res.json({
        success: true,
        data: searchResults.hits,
        pagination: {
          limit: searchResults.limit,
          offset: searchResults.offset,
          total: searchResults.estimatedTotalHits,
          hasMore: (searchResults.offset + searchResults.hits.length) < searchResults.estimatedTotalHits
        }
      });
    } catch (error) {
      logger.error({
        message: 'Search users error',
        error: error.message,
        query: req.query.q,
        userId: req.user?.userId
      });

      res.status(500).json({
        error: 'Failed to search users',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Helper method to validate URLs
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

module.exports = UserController;
