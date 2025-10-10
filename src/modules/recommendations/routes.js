const express = require('express');

const router = express.Router();

const RecommendationController = require('./recommendationController');

// Import middleware
const { authenticateToken, requireActiveUser } = require('../../middleware/auth');

// Import validation middleware
const {
  validatePersonalizedFeed,
  validateTrendingContent,
  validateSearchContent,
  validateCategoryContent,
  validateSimilarContent,
  validateInteractionTracking,
  validateUserPreferences,
  validateDiscoveryStats,
  validateContentId,
  validateCategory
} = require('./validation');

/**
 * @swagger
 * /api/recommendations/feed:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get personalized content feed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: contentTypes
 *         schema:
 *           type: string
 *           default: "video,article,document"
 *       - in: query
 *         name: includeFollowing
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Personalized feed retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/feed',
  authenticateToken,
  requireActiveUser,
  validatePersonalizedFeed,
  RecommendationController.getPersonalizedFeed
);

/**
 * @swagger
 * /api/recommendations/trending:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get trending content
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: "24h"
 *       - in: query
 *         name: contentTypes
 *         schema:
 *           type: string
 *           default: "video,article,document"
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trending content retrieved successfully
 */
router.get(
  '/trending',
  validateTrendingContent,
  RecommendationController.getTrendingContent
);

/**
 * @swagger
 * /api/recommendations/videos:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get recommended videos (trending)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: "24h"
 *     responses:
 *       200:
 *         description: Recommended videos retrieved successfully
 */
router.get(
  '/videos',
  validateTrendingContent, // Can reuse the same validation
  RecommendationController.getVideoRecommendations
);

/**
 * @swagger
 * /api/recommendations/search:
 *   get:
 *     tags: [Recommendations]
 *     summary: Search content with full-text search
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: contentTypes
 *         schema:
 *           type: string
 *           default: "video,article,document"
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, recent, popular, trending]
 *           default: "relevance"
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Invalid search query
 */
router.get(
  '/search',
  validateSearchContent,
  RecommendationController.searchContent
);

/**
 * @swagger
 * /api/recommendations/category/{category}:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get content by category
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [recent, popular, trending]
 *           default: "recent"
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *     responses:
 *       200:
 *         description: Category content retrieved successfully
 */
router.get(
  '/category/:category',
  validateCategory,
  validateCategoryContent,
  RecommendationController.getContentByCategory
);

/**
 * @swagger
 * /api/recommendations/similar/{contentId}:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get similar content recommendations
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: excludeViewed
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Similar content retrieved successfully
 *       404:
 *         description: Source content not found
 */
router.get(
  '/similar/:contentId',
  validateContentId,
  validateSimilarContent,
  RecommendationController.getSimilarContent
);

/**
 * @swagger
 * /api/recommendations/track-interaction:
 *   post:
 *     tags: [Recommendations]
 *     summary: Track user interaction for personalized recommendations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentId
 *               - interactionType
 *             properties:
 *               contentId:
 *                 type: string
 *                 format: uuid
 *               interactionType:
 *                 type: string
 *                 enum: [view, like, share, save, watch]
 *     responses:
 *       200:
 *         description: Interaction tracked successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/track-interaction',
  authenticateToken,
  requireActiveUser,
  validateInteractionTracking,
  RecommendationController.trackInteraction
);

/**
 * @swagger
 * /api/recommendations/preferences:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get user preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/preferences',
  authenticateToken,
  requireActiveUser,
  RecommendationController.getUserPreferences
);

/**
 * @swagger
 * /api/recommendations/preferences:
 *   post:
 *     tags: [Recommendations]
 *     summary: Update user preferences manually
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 20
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 50
 *     responses:
 *       200:
 *         description: User preferences updated successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/preferences',
  authenticateToken,
  requireActiveUser,
  validateUserPreferences,
  RecommendationController.updateUserPreferences
);

/**
 * @swagger
 * /api/recommendations/stats:
 *   get:
 *     tags: [Recommendations]
 *     summary: Get content discovery statistics
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: "24h"
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discovery stats retrieved successfully
 */
router.get(
  '/stats',
  validateDiscoveryStats,
  RecommendationController.getDiscoveryStats
);

/**
 * @swagger
 * /api/recommendations/digest/generate:
 *   get:
 *     tags: [Recommendations]
 *     summary: Generate weekly digest data for current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 7
 *         description: Number of days to include in digest
 *     responses:
 *       200:
 *         description: Weekly digest data generated successfully
 */
router.get(
  '/digest/generate',
  authenticateToken,
  requireActiveUser,
  RecommendationController.generateWeeklyDigest
);

/**
 * @swagger
 * /api/recommendations/digest/send:
 *   post:
 *     tags: [Recommendations]
 *     summary: Send weekly digest email to current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly digest email sent successfully
 */
router.post(
  '/digest/send',
  authenticateToken,
  requireActiveUser,
  RecommendationController.sendWeeklyDigest
);

/**
 * @swagger
 * /api/recommendations/digest/bulk-send:
 *   post:
 *     tags: [Recommendations]
 *     summary: Send weekly digest emails to all eligible users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk weekly digest emails sent successfully
 *       403:
 *         description: Admin access required
 */
router.post(
  '/digest/bulk-send',
  authenticateToken,
  requireActiveUser,
  RecommendationController.sendBulkWeeklyDigests
);

module.exports = router;
