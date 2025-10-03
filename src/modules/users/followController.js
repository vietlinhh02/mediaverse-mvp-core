// Follow controller for user relationships
const UserService = require('./userService');
const { logger } = require('../../middleware/logger');
const { pubsub } = require('../../config/redis');
const NotificationService = require('../notifications/services/notificationService');

const userService = new UserService();

class FollowController {
  /**
   * @swagger
   * /api/users/{id}/follow:
   *   post:
   *     summary: Follow a user
   *     tags: [Follow]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to follow
   *     responses:
   *       200:
   *         description: User followed successfully
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
   *                     success:
   *                       type: boolean
   *                     message:
   *                       type: string
   *       400:
   *         description: Cannot follow yourself or validation error
   *       401:
   *         description: Authentication required
   *       404:
   *         description: User not found
   *       409:
   *         description: Already following this user
   */
  // POST /api/users/:id/follow - Follow a user
  async followUser(req, res) {
    try {
      const followerId = req.user.userId;
      const followeeId = req.params.id;

      if (followerId === followeeId) {
        return res.status(400).json({
          error: 'Cannot follow yourself',
          code: 'INVALID_FOLLOW'
        });
      }

      // Check if followee exists
      try {
        await userService.getProfile(followeeId);
      } catch (error) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const result = await userService.followUser(followerId, followeeId);

      // Trigger notification
      await this.triggerFollowNotification(followerId, followeeId);

      logger.info({
        message: 'User followed successfully',
        followerId,
        followeeId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({
        message: 'Follow user error',
        error: error.message,
        errorStack: error.stack,
        followerId: req.user?.userId,
        followeeId: req.params.id
      });

      console.log('DEBUG - Follow error details:', {
        message: error.message,
        exactMatch: error.message === 'Already following this user',
        includes: error.message.includes('Already following this user')
      });

      if (error.message === 'Already following this user' || error.message.includes('Already following this user')) {
        return res.status(409).json({
          error: 'Already following this user',
          code: 'ALREADY_FOLLOWING'
        });
      }

      if (error.message === 'Cannot follow yourself') {
        return res.status(400).json({
          error: error.message,
          code: 'INVALID_FOLLOW'
        });
      }

      res.status(500).json({
        error: 'Failed to follow user',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/{id}/unfollow:
   *   delete:
   *     summary: Unfollow a user
   *     tags: [Follow]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to unfollow
   *     responses:
   *       200:
   *         description: User unfollowed successfully
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
   *                     success:
   *                       type: boolean
   *                     message:
   *                       type: string
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Not following this user
   */
  // DELETE /api/users/:id/unfollow - Unfollow a user
  async unfollowUser(req, res) {
    try {
      const followerId = req.user.userId;
      const followeeId = req.params.id;

      const result = await userService.unfollowUser(followerId, followeeId);

      logger.info({
        message: 'User unfollowed successfully',
        followerId,
        followeeId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({
        message: 'Unfollow user error',
        error: error.message,
        followerId: req.user?.userId,
        followeeId: req.params.id
      });

      if (error.message === 'Not following this user') {
        return res.status(404).json({
          error: error.message,
          code: 'NOT_FOLLOWING'
        });
      }

      res.status(500).json({
        error: 'Failed to unfollow user',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/{id}/followers:
   *   get:
   *     summary: Get user followers
   *     tags: [Follow]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 20
   *     responses:
   *       200:
   *         description: Followers retrieved successfully
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
   *                     followers:
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
   *                           followedAt:
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
   */
  // GET /api/users/:id/followers - Get user followers
  async getFollowers(req, res) {
    try {
      const userId = req.params.id;
      const { page = 1, limit = 20 } = req.query;

      const pagination = {
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 50)
      };

      const result = await userService.getFollowers(userId, pagination);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({
        message: 'Get followers error',
        error: error.message,
        userId: req.params.id,
        requesterId: req.user?.userId
      });

      res.status(500).json({
        error: 'Failed to get followers',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/{id}/following:
   *   get:
   *     summary: Get users that user is following
   *     tags: [Follow]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 20
   *     responses:
   *       200:
   *         description: Following list retrieved successfully
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
   *                     following:
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
   *                           followedAt:
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
   */
  // GET /api/users/:id/following - Get users that user is following
  async getFollowing(req, res) {
    try {
      const userId = req.params.id;
      const { page = 1, limit = 20 } = req.query;

      const pagination = {
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 50)
      };

      const result = await userService.getFollowing(userId, pagination);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({
        message: 'Get following error',
        error: error.message,
        userId: req.params.id,
        requesterId: req.user?.userId
      });

      res.status(500).json({
        error: 'Failed to get following',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/{id}/follow-status:
   *   get:
   *     summary: Check follow status
   *     tags: [Follow]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to check
   *     responses:
   *       200:
   *         description: Follow status retrieved
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
   *                     isFollowing:
   *                       type: boolean
   *                     canFollow:
   *                       type: boolean
   *                     followedAt:
   *                       type: string
   *                       format: date-time
   *                     reason:
   *                       type: string
   */
  // GET /api/users/:id/follow-status - Check if current user follows target user
  async getFollowStatus(req, res) {
    try {
      const followerId = req.user?.userId;
      const followeeId = req.params.id;

      if (!followerId) {
        return res.json({
          success: true,
          data: {
            isFollowing: false,
            canFollow: true
          }
        });
      }

      if (followerId === followeeId) {
        return res.json({
          success: true,
          data: {
            isFollowing: false,
            canFollow: false,
            reason: 'Cannot follow yourself'
          }
        });
      }

      // Check if following
      const { prisma } = require('../../config/database');
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId
          }
        }
      });

      res.json({
        success: true,
        data: {
          isFollowing: !!follow,
          canFollow: !follow,
          followedAt: follow?.createdAt
        }
      });
    } catch (error) {
      logger.error({
        message: 'Get follow status error',
        error: error.message,
        followerId: req.user?.userId,
        followeeId: req.params.id
      });

      res.status(500).json({
        error: 'Failed to get follow status',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Helper method to trigger follow notification
  async triggerFollowNotification(followerId, followeeId) {
    try {
      // Get follower profile for notification
      const followerProfile = await userService.getProfile(followerId);

      const notificationData = {
        type: 'follow',
        userId: followeeId,
        title: 'New Follower',
        message: `${followerProfile.displayName || followerProfile.user.username} started following you`,
        data: {
          followerId,
          followerUsername: followerProfile.user.username,
          followerDisplayName: followerProfile.displayName,
          followerAvatarUrl: followerProfile.avatarUrl
        }
      };

      // Publish notification event (optional, depending on architecture)
      await pubsub.publish('notifications', notificationData);

      // Store notification in database using NotificationService
      await NotificationService.createNotification(
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.data
      );

      logger.info({
        message: 'Follow notification triggered',
        followerId,
        followeeId
      });
    } catch (error) {
      logger.error({
        message: 'Failed to trigger follow notification',
        error: error.message,
        followerId,
        followeeId
      });
      // Don't throw error as this is not critical for the follow operation
    }
  }
}

module.exports = FollowController;
