/**
 * @swagger
 * tags:
 *   - name: Content
 *     description: Content creation, management, and interaction endpoints
 *   - name: Articles
 *     description: Article-specific endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Article:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           description: Article unique identifier
 *         title:
 *           type: string
 *           description: Article title
 *         content:
 *           type: string
 *           description: Article content (markdown or HTML)
 *         excerpt:
 *           type: string
 *           description: Article excerpt/summary
 *         category:
 *           type: string
 *           description: Article category
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Article tags
 *         status:
 *           type: string
 *           enum: [draft, published, scheduled, archived]
 *           description: Article status
 *         visibility:
 *           type: string
 *           enum: [public, private, unlisted]
 *           description: Article visibility
 *         featuredImage:
 *           type: string
 *           format: uri
 *           description: Featured image URL
 *         channelId:
 *           type: string
 *           description: Associated channel ID
 *         authorId:
 *           type: string
 *           description: Author user ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         publishedAt:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 *           description: Additional article metadata
 *       example:
 *         id: "art_123"
 *         title: "Getting Started with React"
 *         content: "# Introduction\n\nReact is a JavaScript library..."
 *         excerpt: "A comprehensive guide to getting started with React development"
 *         category: "programming"
 *         tags: ["react", "javascript", "tutorial"]
 *         status: "published"
 *         visibility: "public"
 *         featuredImage: "https://example.com/image.jpg"
 */

// Article controller for managing blog posts and articles
const ContentService = require('./contentService');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { authenticateToken, requireActiveUser } = require('../../middleware/auth');
const searchService = require('../../services/searchService'); // Import the search service

class ArticleController {
  /**
   * @swagger
   * /api/content/articles:
   *   post:
   *     summary: Create a new article
   *     tags: [Articles]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - content
   *             properties:
   *               title:
   *                 type: string
   *                 description: Article title
   *               content:
   *                 type: string
   *                 description: Article content
   *               excerpt:
   *                 type: string
   *                 description: Article excerpt/summary
   *               category:
   *                 type: string
   *                 description: Article category
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Article tags
   *               featuredImage:
   *                 type: string
   *                 format: uri
   *                 description: Featured image URL
   *               channelId:
   *                 type: string
   *                 description: Channel ID to publish in
   *               status:
   *                 type: string
   *                 enum: [draft, published, scheduled]
   *                 default: draft
   *                 description: Article status
   *               visibility:
   *                 type: string
   *                 enum: [public, private, unlisted]
   *                 default: public
   *                 description: Article visibility
   *               scheduledAt:
   *                 type: string
   *                 format: date-time
   *                 description: Scheduled publish time
   *             example:
   *               title: "Getting Started with React"
   *               content: "# Introduction\n\nReact is a JavaScript library..."
   *               excerpt: "A comprehensive guide to getting started with React development"
   *               category: "programming"
   *               tags: ["react", "javascript", "tutorial"]
   *               featuredImage: "https://example.com/image.jpg"
   *               channelId: "ch_123"
   *               status: "draft"
   *               visibility: "public"
   *     responses:
   *       201:
   *         description: Article created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Article created successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Article'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static createArticle = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { channelId } = req.body;

    // Validate channel ownership if channelId is provided
    if (channelId) {
      const channel = await require('../../config/database').prisma.channel.findUnique({
        where: { id: channelId },
        select: { ownerId: true }
      });

      if (!channel) {
        throw new AppError('Channel not found', 404, 'CHANNEL_NOT_FOUND');
      }

      if (channel.ownerId !== userId) {
        throw new AppError('Unauthorized to create content in this channel', 403, 'UNAUTHORIZED');
      }
    }

    // Handle file upload if present
    const articleData = { ...req.body };
    if (req.file) {
      articleData.featuredImage = `/uploads/images/${req.file.filename}`;
    }

    const article = await ContentService.createArticle(userId, articleData, channelId);

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article
    });
  });

  /**
   * @swagger
   * /api/content/articles/{id}:
   *   put:
   *     summary: Update an article
   *     tags: [Articles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Article ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 description: Article title
   *               content:
   *                 type: string
   *                 description: Article content
   *               excerpt:
   *                 type: string
   *                 description: Article excerpt/summary
   *               category:
   *                 type: string
   *                 description: Article category
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Article tags
   *               featuredImage:
   *                 type: string
   *                 format: uri
   *                 description: Featured image URL
   *               status:
   *                 type: string
   *                 enum: [draft, published, scheduled]
   *                 description: Article status
   *               visibility:
   *                 type: string
   *                 enum: [public, private, unlisted]
   *                 description: Article visibility
   *               scheduledAt:
   *                 type: string
   *                 format: date-time
   *                 description: Scheduled publish time
   *             example:
   *               title: "Updated React Guide"
   *               content: "# Updated Introduction\n\nNew content here..."
   *               category: "programming"
   *               tags: ["react", "javascript", "tutorial", "updated"]
   *     responses:
   *       200:
   *         description: Article updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Article updated successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Article'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static updateArticle = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    // Handle file upload if present
    const updateData = { ...req.body };
    if (req.file) {
      updateData.featuredImage = `/uploads/images/${req.file.filename}`;
    }

    const updatedArticle = await ContentService.updateContent(id, updateData, userId);

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: updatedArticle
    });
  });

  /**
   * @swagger
   * /api/content/articles/{id}:
   *   get:
   *     summary: Get article by ID
   *     tags: [Articles]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Article ID
   *     responses:
   *       200:
   *         description: Article retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Article'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getArticle = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const article = await ContentService.getContent(id);

    if (article.type !== 'article') {
      throw new AppError('Content is not an article', 400, 'INVALID_CONTENT_TYPE');
    }

    res.json({
      success: true,
      data: article
    });
  });

  /**
   * @swagger
   * /api/content/articles/slug/{slug}:
   *   get:
   *     summary: Get article by slug
   *     tags: [Articles]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *         description: Article slug (SEO-friendly URL)
   *     responses:
   *       200:
   *         description: Article retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Article'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getArticleBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    // Find article by generating slug from title or storing slug in metadata
    const articles = await require('../../config/database').prisma.content.findMany({
      where: {
        type: 'article',
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
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    // Simple slug matching (in production, you might want to store slugs in database)
    const article = articles.find((a) => a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slug
      || a.metadata?.slug === slug);

    if (!article) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    // Increment view count
    await ContentService.updateContentStats(article.id, {
      views: (article.stats?.views || 0) + 1
    });

    res.json({
      success: true,
      data: article
    });
  });

  /**
   * @swagger
   * /api/content/articles/{id}:
   *   delete:
   *     summary: Delete an article
   *     tags: [Articles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Article ID
   *     responses:
   *       200:
   *         description: Article deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Article deleted successfully"
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static deleteArticle = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    await ContentService.deleteContent(id, userId);

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  });

  /**
   * @swagger
   * /api/content/articles/{id}/publish:
   *   post:
   *     summary: Publish an article
   *     tags: [Articles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Article ID
   *     responses:
   *       200:
   *         description: Article published successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Article published successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Article'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static publishArticle = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const publishedArticle = await ContentService.publishContent(id, userId);

    res.json({
      success: true,
      message: 'Article published successfully',
      data: publishedArticle
    });
  });

  /**
   * @swagger
   * /api/content/users/{userId}/articles:
   *   get:
   *     summary: Get user's articles
   *     tags: [Articles]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
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
   *         name: status
   *         schema:
   *           type: string
   *           enum: [published, draft, all]
   *           default: published
   *         description: Article status filter
   *     responses:
   *       200:
   *         description: User's articles retrieved successfully
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
   *                     $ref: '#/components/schemas/Article'
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
   *                       example: 100
   *                     pages:
   *                       type: integer
   *                       example: 5
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getUserArticles = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20, status = 'published' } = req.query;

    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      require('../../config/database').prisma.content.findMany({
        where: {
          type: 'article',
          authorId: userId,
          status: status === 'all' ? undefined : status
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      require('../../config/database').prisma.content.count({
        where: {
          type: 'article',
          authorId: userId,
          status: status === 'all' ? undefined : status
        }
      })
    ]);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  });

  /**
   * @swagger
   * /api/content/articles:
   *   get:
   *     summary: Get all articles
   *     tags: [Articles]
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
   *         name: status
   *         schema:
   *           type: string
   *           enum: [published, draft, all]
   *           default: published
   *         description: Article status filter
   *     responses:
   *       200:
   *         description: Articles retrieved successfully
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
   *                     $ref: '#/components/schemas/Article'
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
   *                       example: 100
   *                     pages:
   *                       type: integer
   *                       example: 5
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getAllArticles = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status = 'published' } = req.query;

    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      require('../../config/database').prisma.content.findMany({
        where: {
          type: 'article',
          status: status === 'all' ? undefined : status,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      require('../../config/database').prisma.content.count({
        where: {
          type: 'article',
          status: status === 'all' ? undefined : status,
          visibility: { in: ['public', 'unlisted'] }
        }
      })
    ]);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  });

  /**
   * @swagger
   * /api/content/articles/search:
   *   get:
   *     summary: Search articles
   *     tags: [Articles]
   *     parameters:
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Search query
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by category
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         description: Filter by tags (comma-separated)
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
   *         description: Articles retrieved successfully
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
   *                     $ref: '#/components/schemas/Article'
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
   *                       example: 50
   *                     pages:
   *                       type: integer
   *                       example: 3
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static searchArticles = asyncHandler(async (req, res) => {
    const {
      q, limit = 20, offset = 0, sortBy = 'relevance'
    } = req.query;

    const { mapSortByToMeiliSearch } = require('../../utils/searchHelpers');

    // Combine existing filters from query with our mandatory filter
    const existingFilters = req.query.filters ? `${req.query.filters} AND ` : '';
    const filters = `${existingFilters}contentType = article`;

    // Map sortBy to MeiliSearch format
    const sort = mapSortByToMeiliSearch(sortBy);

    const searchResults = await searchService.search('content', q || '*', {
      limit: parseInt(limit),
      offset: parseInt(offset),
      filters,
      sort
    });

    // Remove 'article-' prefix from id to match database UUID format
    const transformedHits = searchResults.hits.map(hit => ({
      ...hit,
      id: hit.id.replace(/^article-/, '')
    }));

    res.json({
      success: true,
      data: transformedHits,
      pagination: {
        limit: searchResults.limit,
        offset: searchResults.offset,
        total: searchResults.estimatedTotalHits,
        hasMore: (searchResults.offset + searchResults.hits.length) < searchResults.estimatedTotalHits
      }
    });
  });

  /**
   * @swagger
   * /api/content/articles/category/{category}:
   *   get:
   *     summary: Get articles by category
   *     tags: [Articles]
   *     parameters:
   *       - in: path
   *         name: category
   *         required: true
   *         schema:
   *           type: string
   *         description: Article category
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
   *         description: Articles retrieved successfully
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
   *                     $ref: '#/components/schemas/Article'
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
   *                       example: 45
   *                     pages:
   *                       type: integer
   *                       example: 3
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getArticlesByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await ContentService.getContentByCategory(category, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      ...result
    });
  });

  // Get article statistics
  static getArticleStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const article = await ContentService.getContent(id, false);

    if (article.type !== 'article') {
      throw new AppError('Content is not an article', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check if user is the author or admin/moderator
    const canViewStats = article.authorId === userId
      || (req.user.role && ['admin', 'moderator'].includes(req.user.role));

    if (!canViewStats) {
      throw new AppError('Unauthorized to view article statistics', 403, 'UNAUTHORIZED');
    }

    const stats = {
      views: article.stats?.views || 0,
      likes: article._count?.likes || 0,
      comments: article._count?.comments || 0,
      readingTime: article.metadata?.readingTime || 0,
      wordCount: article.metadata?.wordCount || 0,
      engagementRate: 0
    };

    // Calculate engagement rate
    if (stats.views > 0) {
      stats.engagementRate = ((stats.likes + stats.comments) / stats.views * 100).toFixed(2);
    }

    res.json({
      success: true,
      data: stats
    });
  });

  // Get related articles
  static getRelatedArticles = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const article = await ContentService.getContent(id, false);

    if (article.type !== 'article') {
      throw new AppError('Content is not an article', 400, 'INVALID_CONTENT_TYPE');
    }

    const relatedArticles = await require('../../config/database').prisma.content.findMany({
      where: {
        id: { not: id },
        type: 'article',
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        OR: [
          { category: article.category },
          { tags: { hasSome: article.tags } }
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
      take: 6
    });

    res.json({
      success: true,
      data: relatedArticles
    });
  });

  // Bulk update articles status
  static bulkUpdateArticles = asyncHandler(async (req, res) => {
    const { articleIds, status, visibility } = req.body;
    const { userId } = req.user;

    // Check if user is admin or moderator
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to perform bulk operations', 403, 'UNAUTHORIZED');
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (visibility) updateData.visibility = visibility;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No update fields provided', 400, 'INVALID_REQUEST');
    }

    const updatedArticles = await Promise.all(
      articleIds.map((id) => ContentService.updateContent(id, updateData, userId))
    );

    res.json({
      success: true,
      message: `${updatedArticles.length} articles updated successfully`,
      data: updatedArticles
    });
  });

  // Get article revisions (for future implementation)
  static getArticleRevisions = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // This would require a revisions table in the future
    // For now, return basic info
    const article = await ContentService.getContent(id, false);

    if (article.type !== 'article') {
      throw new AppError('Content is not an article', 400, 'INVALID_CONTENT_TYPE');
    }

    res.json({
      success: true,
      data: {
        current: article,
        revisions: [] // Placeholder for future implementation
      }
    });
  });

  /**
   * @swagger
   * /api/content/articles/{id}/featured-image:
   *   post:
   *     summary: Upload featured image for article
   *     description: Upload a featured/thumbnail image for an article
   *     tags: [Articles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Article ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - image
   *             properties:
   *               image:
   *                 type: string
   *                 format: binary
   *                 description: Featured image file (JPEG, PNG, WebP)
   *     responses:
   *       200:
   *         description: Image uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     featuredImage:
   *                       type: string
   *                       description: URL of uploaded image
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static uploadFeaturedImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    if (!req.file) {
      throw new AppError('No image file provided', 400, 'NO_FILE');
    }

    // Build the image URL
    const imageUrl = `/uploads/images/${req.file.filename}`;

    // Update article with featured image
    const updatedArticle = await ContentService.updateContent(id, {
      featuredImage: imageUrl
    }, userId);

    res.json({
      success: true,
      message: 'Featured image uploaded successfully',
      data: {
        featuredImage: imageUrl,
        article: updatedArticle
      }
    });
  });
}

module.exports = ArticleController;
