/**
 * Smart Recommendation Service
 * Recommends content based on user behavior (likes, views, comments)
 * Similar to Facebook/TikTok "For You" algorithm
 */

const { prisma } = require('../config/database');
const { cache } = require('../config/redis');

class SmartRecommendationService {
  /**
   * Get user's interaction history to build interest profile
   * @param {string} userId - User ID
   * @returns {Object} User interest profile
   */
  static async getUserInterestProfile(userId) {
    const cacheKey = `user:${userId}:interest-profile`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Get content user has interacted with (liked, commented, viewed)
    const [likedContent, commentedContent, viewHistory] = await Promise.all([
      // Content user liked
      prisma.like.findMany({
        where: { userId },
        include: {
          content: {
            select: {
              id: true,
              type: true,
              category: true,
              tags: true,
              authorId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Last 50 likes
      }),

      // Content user commented on
      prisma.comment.findMany({
        where: { userId },
        include: {
          content: {
            select: {
              id: true,
              type: true,
              category: true,
              tags: true,
              authorId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 30 // Last 30 comments
      }),

      // View history (if tracked)
      // This would require a ContentView model - placeholder for now
      Promise.resolve([])
    ]);

    // Aggregate interests from interactions
    const categoryScores = {};
    const tagScores = {};
    const contentTypeScores = {};
    const authorScores = {};

    // Weight different interactions
    const WEIGHTS = {
      like: 3, // Likes are strong signals
      comment: 5, // Comments are very strong signals
      view: 1 // Views are weak signals
    };

    // Process likes
    likedContent.forEach(({ content }) => {
      if (content) {
        categoryScores[content.category] = (categoryScores[content.category] || 0) + WEIGHTS.like;
        contentTypeScores[content.type] = (contentTypeScores[content.type] || 0) + WEIGHTS.like;
        authorScores[content.authorId] = (authorScores[content.authorId] || 0) + WEIGHTS.like;

        content.tags?.forEach((tag) => {
          tagScores[tag] = (tagScores[tag] || 0) + WEIGHTS.like;
        });
      }
    });

    // Process comments
    commentedContent.forEach(({ content }) => {
      if (content) {
        categoryScores[content.category] = (categoryScores[content.category] || 0) + WEIGHTS.comment;
        contentTypeScores[content.type] = (contentTypeScores[content.type] || 0) + WEIGHTS.comment;
        authorScores[content.authorId] = (authorScores[content.authorId] || 0) + WEIGHTS.comment;

        content.tags?.forEach((tag) => {
          tagScores[tag] = (tagScores[tag] || 0) + WEIGHTS.comment;
        });
      }
    });

    // Get top interests
    const topCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    const topTags = Object.entries(tagScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    const topContentTypes = Object.entries(contentTypeScores)
      .sort(([, a], [, b]) => b - a)
      .map(([type]) => type);

    const topAuthors = Object.entries(authorScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([authorId]) => authorId);

    const profile = {
      categories: topCategories,
      tags: topTags,
      contentTypes: topContentTypes,
      authors: topAuthors,
      totalInteractions: likedContent.length + commentedContent.length,
      lastUpdated: new Date()
    };

    // Cache for 1 hour
    await cache.set(cacheKey, profile, 3600);

    return profile;
  }

  /**
   * Get smart recommendations for user
   * Based on behavior, not just preferences
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Recommended content
   */
  static async getSmartRecommendations(userId, options = {}) {
    const { page = 1, limit = 20, excludeContentIds = [] } = options;
    const skip = (page - 1) * limit;

    // Get user's interest profile from behavior
    const interestProfile = await this.getUserInterestProfile(userId);

    // Build recommendation query
    const conditions = [];

    // 1. Content from authors user has engaged with (weight: high)
    if (interestProfile.authors.length > 0) {
      conditions.push({
        authorId: { in: interestProfile.authors }
      });
    }

    // 2. Content in categories user likes (weight: high)
    if (interestProfile.categories.length > 0) {
      conditions.push({
        category: { in: interestProfile.categories }
      });
    }

    // 3. Content with tags user is interested in (weight: medium)
    if (interestProfile.tags.length > 0) {
      conditions.push({
        tags: { hasSome: interestProfile.tags }
      });
    }

    // 4. If user is new (no interactions), use trending/popular content
    if (interestProfile.totalInteractions === 0) {
      // Get popular content from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const popularContent = await prisma.content.findMany({
        where: {
          status: 'published',
          visibility: { in: ['public', 'unlisted'] },
          createdAt: { gte: sevenDaysAgo },
          id: { notIn: excludeContentIds }
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
              comments: true,
              views: true
            }
          }
        },
        orderBy: [
          { views: { _count: 'desc' } },
          { likes: { _count: 'desc' } },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      });

      return popularContent;
    }

    // Build final query with OR conditions
    const where = {
      status: 'published',
      visibility: { in: ['public', 'unlisted'] },
      id: { notIn: excludeContentIds }
    };

    if (conditions.length > 0) {
      where.OR = conditions;
    }

    // Get recommended content
    const recommendedContent = await prisma.content.findMany({
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
            comments: true,
            views: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { views: { _count: 'desc' } }
      ],
      skip,
      take: limit
    });

    return recommendedContent;
  }

  /**
   * Get "For You" feed - Mix of personalized + trending + diverse
   * Like Facebook/TikTok algorithm
   * @param {string} userId - User ID
   * @param {Object} options - Feed options
   * @returns {Object} For You feed with mixed content
   */
  static async getForYouFeed(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const cacheKey = `user:${userId}:for-you-feed:${page}:${limit}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Get user's interest profile
    const interestProfile = await this.getUserInterestProfile(userId);

    // Calculate mix percentages based on user engagement level
    let mixRatio;

    if (interestProfile.totalInteractions === 0) {
      // New user: 100% trending/popular
      mixRatio = { trending: 0.7, diverse: 0.3, personalized: 0 };
    } else if (interestProfile.totalInteractions < 10) {
      // Low engagement: 60% personalized, 30% trending, 10% diverse
      mixRatio = { personalized: 0.6, trending: 0.3, diverse: 0.1 };
    } else {
      // Active user: 70% personalized, 20% trending, 10% diverse
      mixRatio = { personalized: 0.7, trending: 0.2, diverse: 0.1 };
    }

    const personalizedCount = Math.ceil(limit * mixRatio.personalized);
    const trendingCount = Math.ceil(limit * mixRatio.trending);
    const diverseCount = limit - personalizedCount - trendingCount;

    const contentPool = [];
    const usedIds = new Set();

    // 1. Get personalized content based on interests
    if (personalizedCount > 0) {
      const personalized = await this.getSmartRecommendations(userId, {
        page: 1,
        limit: personalizedCount * 2 // Get extra to account for filtering
      });

      personalized.forEach((content) => {
        if (!usedIds.has(content.id) && contentPool.length < personalizedCount) {
          contentPool.push({ ...content, feedSource: 'personalized' });
          usedIds.add(content.id);
        }
      });
    }

    // 2. Get trending content
    if (trendingCount > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trending = await prisma.content.findMany({
        where: {
          status: 'published',
          visibility: { in: ['public', 'unlisted'] },
          createdAt: { gte: sevenDaysAgo },
          id: { notIn: Array.from(usedIds) }
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
              comments: true,
              views: true
            }
          }
        },
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } }
        ],
        take: trendingCount
      });

      trending.forEach((content) => {
        if (!usedIds.has(content.id)) {
          contentPool.push({ ...content, feedSource: 'trending' });
          usedIds.add(content.id);
        }
      });
    }

    // 3. Get diverse content (random from categories user hasn't seen much)
    if (diverseCount > 0) {
      // Get all categories
      const allCategories = [
        'technology', 'education', 'entertainment', 'business',
        'health', 'lifestyle', 'science', 'sports', 'politics', 'travel', 'other'
      ];

      // Find categories user hasn't engaged with
      const unexploredCategories = allCategories.filter(
        (cat) => !interestProfile.categories.includes(cat)
      );

      if (unexploredCategories.length > 0) {
        const diverse = await prisma.content.findMany({
          where: {
            status: 'published',
            visibility: { in: ['public', 'unlisted'] },
            category: { in: unexploredCategories },
            id: { notIn: Array.from(usedIds) }
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
          orderBy: { createdAt: 'desc' },
          take: diverseCount
        });

        diverse.forEach((content) => {
          if (!usedIds.has(content.id)) {
            contentPool.push({ ...content, feedSource: 'diverse' });
            usedIds.add(content.id);
          }
        });
      }
    }

    // 4. Shuffle the content pool for variety
    const shuffled = this.shuffleArray(contentPool);

    // 5. Apply pagination
    const paginatedContent = shuffled.slice(skip, skip + limit);

    const result = {
      contents: paginatedContent,
      pagination: {
        page,
        limit,
        total: shuffled.length,
        pages: Math.ceil(shuffled.length / limit)
      },
      feedMix: {
        personalized: contentPool.filter((c) => c.feedSource === 'personalized').length,
        trending: contentPool.filter((c) => c.feedSource === 'trending').length,
        diverse: contentPool.filter((c) => c.feedSource === 'diverse').length
      },
      userEngagementLevel: interestProfile.totalInteractions
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get feed mix ratio based on engagement level
   * @param {number} totalInteractions - Total user interactions
   * @returns {Object} Mix ratios for personalized, trending, diverse
   */
  static getFeedMixRatio(totalInteractions) {
    if (totalInteractions === 0) {
      return { personalized: 0, trending: 0.7, diverse: 0.3 };
    } if (totalInteractions < 10) {
      return { personalized: 0.6, trending: 0.3, diverse: 0.1 };
    }
    return { personalized: 0.7, trending: 0.2, diverse: 0.1 };
  }

  /**
   * Build personalized content query from user profile
   * @param {Object} profile - User interest profile
   * @returns {Array} OR conditions for query
   */
  static buildPersonalizedQuery(profile) {
    const orConditions = [];

    if (profile.authors && profile.authors.length > 0) {
      orConditions.push({ authorId: { in: profile.authors } });
    }

    if (profile.categories && profile.categories.length > 0) {
      orConditions.push({ category: { in: profile.categories } });
    }

    if (profile.tags && profile.tags.length > 0) {
      orConditions.push({ tags: { hasSome: profile.tags } });
    }

    return orConditions;
  }

  /**
   * Track user interaction to improve recommendations
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @param {string} interactionType - like, comment, view, share
   */
  static async trackInteraction(userId, contentId, interactionType) {
    // Invalidate user's interest profile cache
    const cacheKey = `user:${userId}:interest-profile`;
    await cache.del(cacheKey);

    // Also invalidate for-you feed cache
    const feedCachePattern = `user:${userId}:for-you-feed:*`;
    // Note: Would need Redis SCAN to delete pattern, simplified here
    await cache.del(feedCachePattern);

    console.log(`Tracked ${interactionType} for user ${userId} on content ${contentId}`);
  }
}

module.exports = SmartRecommendationService;
