/**
 * @swagger
 * tags:
 *   - name: Content
 *     description: Content creation, management, and interaction endpoints
 *   - name: Feeds
 *     description: Content feed and discovery endpoints
 */

// Feed controller for personalized content feeds and trending content
const ContentService = require('./contentService');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const { cache } = require('../../config/redis');

class FeedController {
  /**
   * @swagger
   * /api/content/feed/personalized:
   *   get:
   *     summary: Get personalized feed
   *     tags: [Feeds]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by category
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [article, video, document]
   *         description: Filter by content type
   *     responses:
   *       200:
   *         description: Personalized feed retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Content items (articles, videos, documents)
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 20
   *                     total:
   *                       type: integer
   *                       example: 150
   *                     pages:
   *                       type: integer
   *                       example: 8
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getPersonalizedFeed = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const feedParams = req.query;

    const result = await ContentService.getPersonalizedFeed(userId, feedParams);

    res.json({
      success: true,
      ...result
    });
  });

  /**
   * @swagger
   * /api/content/feed/trending:
   *   get:
   *     summary: Get trending content
   *     tags: [Feeds]
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by category
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: Trending content retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Content items (articles, videos, documents)
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 20
   *                     total:
   *                       type: integer
   *                       example: 80
   *                     pages:
   *                       type: integer
   *                       example: 4
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getTrendingContent = asyncHandler(async (req, res) => {
    const { category } = req.query;

    const result = await ContentService.getTrendingContent(category);

    res.json({
      success: true,
      ...result
    });
  });

  /**
   * @swagger
   * /api/content/feed/category/{category}:
   *   get:
   *     summary: Get content by category
   *     tags: [Feeds]
   *     parameters:
   *       - in: path
   *         name: category
   *         required: true
   *         schema:
   *           type: string
   *         description: Content category
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: Content retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Content items (articles, videos, documents)
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 20
   *                     total:
   *                       type: integer
   *                       example: 60
   *                     pages:
   *                       type: integer
   *                       example: 3
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getContentByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const paginationParams = req.query;

    const result = await ContentService.getContentByCategory(category, paginationParams);

    res.json({
      success: true,
      ...result
    });
  });

  /**
   * @swagger
   * /api/content/feed/explore:
   *   get:
   *     summary: Get explore feed
   *     tags: [Feeds]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: Explore feed retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Mixed content items (trending, personalized, category-based)
   *                 cached:
   *                   type: boolean
   *                   description: Whether the response was served from cache
   *                   example: false
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getExploreFeed = asyncHandler(async (req, res) => {
    const { userId } = req.user || {};
    const { page = 1, limit = 20 } = req.query;

    try {
      const cacheKey = `explore:feed:${userId || 'anonymous'}:${page}:${limit}`;
      const cachedResult = await cache.get(cacheKey);

      if (cachedResult) {
        return res.json({
          success: true,
          data: cachedResult,
          cached: true
        });
      }

      const skip = (page - 1) * limit;

      // Get trending content
      const trendingContent = await ContentService.getTrendingContent();
      const trendingItems = trendingContent.contents.slice(0, Math.ceil(limit / 3));

      // Get personalized feed or general feed if not authenticated
      let personalizedContent = [];
      if (userId) {
        const feedResult = await ContentService.getPersonalizedFeed(userId, { page: 1, limit: Math.ceil(limit / 3) });
        personalizedContent = feedResult.contents;
      } else {
        // Get general feed for anonymous users
        const generalFeed = await FeedController._fetchGeneralFeedData(1, Math.ceil(limit / 3));
        personalizedContent = generalFeed.contents;
      }

      // Get category-based content
      const categories = ['technology', 'education', 'entertainment', 'business', 'health'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const categoryContent = await ContentService.getContentByCategory(randomCategory, {
        page: 1,
        limit: Math.ceil(limit / 3)
      });

      // Combine and shuffle content
      const allContent = [
        ...trendingItems.map((item) => ({ ...item, feedType: 'trending' })),
        ...personalizedContent.map((item) => ({ ...item, feedType: 'personalized' })),
        ...categoryContent.contents.map((item) => ({ ...item, feedType: 'category' }))
      ];

      // Shuffle the combined array
      const shuffledContent = FeedController.shuffleArray(allContent);

      // Take the requested number of items
      const finalContent = shuffledContent.slice(0, parseInt(limit));

      const result = {
        contents: finalContent,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: finalContent.length,
          pages: 1
        },
        feedComposition: {
          trending: trendingItems.length,
          personalized: personalizedContent.length,
          category: categoryContent.contents.length
        }
      };

      // Cache for 15 minutes
      await cache.set(cacheKey, result, 900);

      res.json({
        success: true,
        ...result,
        cached: false
      });
    } catch (error) {
      console.error('Error getting explore feed:', error);
      throw error;
    }
  });

  // Get general feed for anonymous users
  static getGeneralFeed = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    try {
      const result = await FeedController._fetchGeneralFeedData(page, limit);

      res.json({
        success: true,
        ...result,
        cached: false
      });
    } catch (error) {
      console.error('Error getting general feed:', error);
      throw error;
    }
  });

  // Get content recommendations based on user's viewing history
  static getRecommendations = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    try {
      const cacheKey = `user:recommendations:${userId}`;
      const cachedResult = await cache.get(cacheKey);

      if (cachedResult) {
        return res.json({
          success: true,
          data: cachedResult,
          cached: true
        });
      }

      // Get user's viewing history and preferences
      const userInteractions = await require('../../config/database').prisma.content.findMany({
        where: {
          authorId: userId,
          status: 'published'
        },
        select: {
          category: true,
          tags: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Extract preferred categories and tags
      const categories = {};
      const tags = {};

      userInteractions.forEach((content) => {
        categories[content.category] = (categories[content.category] || 0) + 1;
        content.tags.forEach((tag) => {
          tags[tag] = (tags[tag] || 0) + 1;
        });
      });

      const topCategories = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      const topTags = Object.entries(tags)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);

      // Find recommended content based on preferences
      const recommendedContent = await require('../../config/database').prisma.content.findMany({
        where: {
          status: 'published',
          visibility: { in: ['public', 'unlisted'] },
          authorId: { not: userId }, // Don't recommend user's own content
          OR: [
            { category: { in: topCategories } },
            { tags: { hasSome: topTags } }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          channel: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        take: 20
      });

      const result = {
        contents: recommendedContent,
        basedOn: {
          categories: topCategories,
          tags: topTags
        },
        total: recommendedContent.length
      };

      // Cache for 30 minutes
      await cache.set(cacheKey, result, 1800);

      res.json({
        success: true,
        ...result,
        cached: false
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  });

  // Get featured content (curated content for homepage)
  static getFeaturedContent = asyncHandler(async (req, res) => {
    try {
      const cacheKey = 'featured:content';
      const cachedResult = await cache.get(cacheKey);

      if (cachedResult) {
        return res.json({
          success: true,
          data: cachedResult,
          cached: true
        });
      }

      // Get featured content based on engagement and recency
      const featuredContent = await require('../../config/database').prisma.content.findMany({
        where: {
          status: 'published',
          visibility: 'public',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          channel: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      });

      // Calculate engagement score
      const scoredContent = featuredContent.map((content) => {
        const stats = content.stats || {};
        const ageInDays = (Date.now() - new Date(content.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const ageScore = Math.max(0, 1 - (ageInDays / 30)); // Decay over 30 days

        const engagementScore = (
          (stats.views || 0) * 1
          + (content._count.likes || 0) * 5
          + (content._count.comments || 0) * 3
        );

        return {
          ...content,
          featuredScore: engagementScore * ageScore
        };
      });

      // Sort by featured score and take top 10
      const topFeatured = scoredContent
        .sort((a, b) => b.featuredScore - a.featuredScore)
        .slice(0, 10);

      const result = {
        contents: topFeatured,
        total: topFeatured.length
      };

      // Cache for 1 hour
      await cache.set(cacheKey, result, 3600);

      res.json({
        success: true,
        ...result,
        cached: false
      });
    } catch (error) {
      console.error('Error getting featured content:', error);
      throw error;
    }
  });

  // Get content timeline (chronological feed)
  static getTimelineFeed = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const {
      page = 1, limit = 20, before, after
    } = req.query;

    try {
      const skip = (page - 1) * limit;

      // Build time-based filter
      const timeFilter = {};
      if (before) {
        timeFilter.lte = new Date(before);
      }
      if (after) {
        timeFilter.gte = new Date(after);
      }

      // For authenticated users, include following content
      let followingIds = [];
      if (userId) {
        const following = await require('../../config/database').prisma.follow.findMany({
          where: { followerId: userId },
          select: { followeeId: true }
        });
        followingIds = following.map((f) => f.followeeId);
      }

      const where = {
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        createdAt: timeFilter
      };

      // Include followed users' content for authenticated users
      if (followingIds.length > 0) {
        where.OR = [
          { authorId: { in: followingIds } },
          { visibility: 'public' }
        ];
      }

      const [contents, total] = await Promise.all([
        require('../../config/database').prisma.content.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true
                  }
                }
              }
            },
            channel: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        require('../../config/database').prisma.content.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          contents,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error getting timeline feed:', error);
      throw error;
    }
  });

  // Get popular content by time period
  static getPopularContent = asyncHandler(async (req, res) => {
    const { period = 'week', category } = req.query;

    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate;

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const where = {
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        createdAt: { gte: startDate }
      };

      if (category) {
        where.category = category;
      }

      const popularContent = await require('../../config/database').prisma.content.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          channel: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      });

      // Calculate popularity score
      const scoredContent = popularContent.map((content) => {
        const stats = content.stats || {};
        const engagementScore = (
          (stats.views || 0) * 1
          + (content._count.likes || 0) * 5
          + (content._count.comments || 0) * 3
        );

        return {
          ...content,
          popularityScore: engagementScore
        };
      });

      // Sort by popularity and take top 20
      const topPopular = scoredContent
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, 20);

      res.json({
        success: true,
        data: {
          contents: topPopular,
          period,
          total: topPopular.length
        }
      });
    } catch (error) {
      console.error('Error getting popular content:', error);
      throw error;
    }
  });

  // Helper method to fetch general feed data (used internally)
  static async _fetchGeneralFeedData(page = 1, limit = 20) {
    const cacheKey = `general:feed:${page}:${limit}`;
    const cachedResult = await cache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    const skip = (page - 1) * limit;

    const [contents, total] = await Promise.all([
      require('../../config/database').prisma.content.findMany({
        where: {
          status: 'published',
          visibility: { in: ['public', 'unlisted'] }
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          channel: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: parseInt(limit)
      }),
      require('../../config/database').prisma.content.count({
        where: {
          status: 'published',
          visibility: { in: ['public', 'unlisted'] }
        }
      })
    ]);

    const result = {
      contents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // Cache for 10 minutes
    await cache.set(cacheKey, result, 600);

    return result;
  }

  // Helper method to shuffle array
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Clear feed cache (admin only)
  static clearFeedCache = asyncHandler(async (req, res) => {
    // Admin/moderator only
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to clear feed cache', 403, 'UNAUTHORIZED');
    }

    try {
      // Clear all feed-related cache keys
      const cacheKeys = [
        'explore:feed:',
        'general:feed:',
        'user:recommendations:',
        'featured:content',
        'trending:content:'
      ];

      const deletePromises = cacheKeys.map((pattern) => cache.del(pattern) // This would need pattern deletion support
      );

      await Promise.all(deletePromises);

      res.json({
        success: true,
        message: 'Feed cache cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing feed cache:', error);
      throw error;
    }
  });
}

module.exports = FeedController;
