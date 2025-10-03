const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const NotificationService = require('../notifications/services/notificationService');
const searchService = require('../../services/searchService');

class RecommendationService {
  async getPersonalizedFeed(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      contentTypes = 'video,article,document',
      includeFollowing = true
    } = options;

    const contentTypeArray = contentTypes.split(',').map((type) => type.trim());

    try {
      // Get user's following list if includeFollowing is true
      let followingIds = [];
      if (includeFollowing) {
        const following = await prisma.follow.findMany({
          where: { followerId: userId },
          select: { followeeId: true }
        });
        followingIds = following.map((f) => f.followeeId);
      }

      // Get user's preferences from profile
      const userProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { preferences: true }
      });

      let preferredCategories = [];
      let preferredTags = [];
      if (userProfile?.preferences) {
        preferredCategories = userProfile.preferences.categories || [];
        preferredTags = userProfile.preferences.tags || [];
      }

      // Build where clause
      const whereClause = {
        status: 'published',
        visibility: 'public',
        type: { in: contentTypeArray },
        OR: []
      };

      // Add following content
      if (followingIds.length > 0) {
        whereClause.OR.push({
          authorId: { in: followingIds }
        });
      }

      // Add preferred categories
      if (preferredCategories.length > 0) {
        whereClause.OR.push({
          category: { in: preferredCategories }
        });
      }

      // Add preferred tags
      if (preferredTags.length > 0) {
        whereClause.OR.push({
          tags: { hasSome: preferredTags }
        });
      }

      // If no preferences, show trending content
      if (whereClause.OR.length === 0) {
        delete whereClause.OR;
      }

      const content = await prisma.content.findMany({
        where: whereClause,
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
          }
        },
        orderBy: [
          { trendingScore: 'desc' },
          { publishedAt: 'desc' }
        ],
        skip: offset,
        take: limit
      });

      return content || [];
    } catch (error) {
      console.error('Error getting personalized feed:', error);
      // Return empty array instead of throwing error when no content found
      return [];
    }
  }

  async getTrendingContent(options = {}) {
    const { limit = 20, offset = 0, contentTypes = 'video,article,document' } = options;
    const contentTypeArray = contentTypes.split(',').map((type) => type.trim());

    try {
      const content = await prisma.content.findMany({
        where: {
          status: 'published',
          visibility: 'public',
          type: { in: contentTypeArray }
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } }
            }
          },
          channel: { select: { id: true, name: true } }
        },
        orderBy: [{ trendingScore: 'desc' }, { publishedAt: 'desc' }],
        skip: offset,
        take: limit
      });
      return content || [];
    } catch (error) {
      console.error('Error getting trending content:', error);
      return [];
    }
  }

  async searchContent(query, options = {}) {
    try {
      const searchResults = await searchService.search('content', query, options);
      return searchResults;
    } catch (error) {
      console.error('Error searching content:', error);
      return { hits: [], nbHits: 0 };
    }
  }

  async getContentByCategory(category, options = {}) {
    const { limit = 20, offset = 0 } = options;
    try {
      const [content, total] = await Promise.all([
        prisma.content.findMany({
          where: {
            category,
            status: 'published',
            visibility: 'public'
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profile: { select: { displayName: true, avatarUrl: true } }
              }
            }
          },
          orderBy: [{ publishedAt: 'desc' }],
          skip: offset,
          take: limit
        }),
        prisma.content.count({
          where: {
            category,
            status: 'published',
            visibility: 'public'
          }
        })
      ]);
      return { content, total };
    } catch (error) {
      console.error(`Error getting content for category ${category}:`, error);
      return { content: [], total: 0 };
    }
  }

  async getSimilarContent(contentId, userId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    try {
      const originalContent = await prisma.content.findUnique({
        where: { id: contentId },
        select: { category: true, tags: true }
      });

      if (!originalContent) {
        return [];
      }

      const similarContent = await prisma.content.findMany({
        where: {
          id: { not: contentId },
          status: 'published',
          visibility: 'public',
          OR: [
            { category: originalContent.category },
            { tags: { hasSome: originalContent.tags } }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } }
            }
          }
        },
        orderBy: [{ trendingScore: 'desc' }, { publishedAt: 'desc' }],
        skip: offset,
        take: limit
      });
      return similarContent;
    } catch (error) {
      console.error(`Error getting similar content for ${contentId}:`, error);
      return [];
    }
  }

  async trackInteraction(userId, contentId, interactionType, data = {}) {
    try {
      if (interactionType === 'view') {
        await prisma.$transaction([
          prisma.contentView.create({
            data: {
              contentId,
              userId: userId || null,
              duration: data.duration,
              platform: data.platform,
              ipAddress: data.ipAddress,
              userAgent: data.userAgent,
              country: data.country,
              referrer: data.referrer
            }
          }),
          prisma.content.update({
            where: { id: contentId },
            data: { views: { increment: 1 } }
          })
        ]);
        return { success: true };
      }
      // Placeholder for other interactions (like, comment, etc.)
      // These are often handled in their own services but could be tracked here too.
      return { success: false, message: 'Interaction type not supported yet.' };
    } catch (error) {
      console.error(`Error tracking interaction (${interactionType}) for content ${contentId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getUserPreferences(userId) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { preferences: true }
      });
      return profile?.preferences || {};
    } catch (error) {
      console.error(`Error getting preferences for user ${userId}:`, error);
      return {};
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      const profile = await prisma.profile.update({
        where: { userId },
        data: {
          preferences: {
            ...((await this.getUserPreferences(userId)) || {}),
            ...preferences
          }
        },
        select: { preferences: true }
      });
      return profile.preferences;
    } catch (error) {
      console.error(`Error updating preferences for user ${userId}:`, error);
      throw new Error('Failed to update user preferences');
    }
  }

  async getDiscoveryStats(options = {}) {
    try {
      const [totalContent, contentByType, contentByCategory] = await Promise.all([
        prisma.content.count(),
        prisma.content.groupBy({
          by: ['type'],
          _count: { type: true }
        }),
        prisma.content.groupBy({
          by: ['category'],
          _count: { category: true },
          orderBy: { _count: { category: 'desc' } },
          take: 10
        })
      ]);

      return {
        totalContent,
        contentByType: contentByType.map((item) => ({ type: item.type, count: item._count.type })),
        contentByCategory: contentByCategory.map((item) => ({ category: item.category, count: item._count.category }))
      };
    } catch (error) {
      console.error('Error getting discovery stats:', error);
      return {};
    }
  }

  /**
   * Generate weekly digest data for a user
   */
  async generateWeeklyDigest(userId, days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get user's activity stats
      const [
        totalViews,
        totalLikes,
        totalComments,
        newFollowers,
        topContent,
        recommendedContent
      ] = await Promise.all([
        // Total content views by user in the period
        prisma.content.aggregate({
          where: {
            authorId: userId,
            createdAt: { gte: startDate, lte: endDate }
          },
          _sum: { viewCount: true }
        }),

        // Total likes received
        prisma.like.count({
          where: {
            content: {
              authorId: userId,
              createdAt: { gte: startDate, lte: endDate }
            }
          }
        }),

        // Total comments received
        prisma.comment.count({
          where: {
            content: {
              authorId: userId,
              createdAt: { gte: startDate, lte: endDate }
            }
          }
        }),

        // New followers
        prisma.follow.count({
          where: {
            followeeId: userId,
            createdAt: { gte: startDate, lte: endDate }
          }
        }),

        // User's top performing content
        prisma.content.findMany({
          where: {
            authorId: userId,
            createdAt: { gte: startDate, lte: endDate }
          },
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            type: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            createdAt: true
          }
        }),

        // Get personalized recommendations
        this.getPersonalizedFeed(userId, { limit: 3 })
      ]);

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          profile: {
            select: { displayName: true }
          }
        }
      });

      const userName = user?.profile?.displayName || user?.username || 'Creator';

      return {
        userName,
        userId,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days
        },
        stats: {
          views: totalViews._sum.viewCount || 0,
          likes: totalLikes,
          comments: totalComments,
          followers: newFollowers
        },
        topContent: topContent.map((content) => ({
          id: content.id,
          title: content.title,
          type: content.type,
          views: content.viewCount,
          likes: content.likeCount,
          comments: content.commentCount,
          createdAt: content.createdAt.toISOString().split('T')[0]
        })),
        recommendations: recommendedContent.slice(0, 3).map((content) => ({
          id: content.id,
          title: content.title,
          type: content.type,
          authorName: content.author?.profile?.displayName || content.author?.username || 'Unknown'
        })),
        newFollowers: [] // Could be populated with recent followers if needed
      };
    } catch (error) {
      console.error('❌ Failed to generate weekly digest:', error);
      throw error;
    }
  }

  /**
   * Send weekly digest to a user
   */
  async sendWeeklyDigest(userId) {
    try {
      // Generate digest data
      const digestData = await this.generateWeeklyDigest(userId, 7);

      // Check if user wants weekly digests
      const preferences = await NotificationService.getUserPreferences(userId);
      const digestEnabled = preferences.notifications?.frequency?.digest !== 'never';

      if (!digestEnabled) {
        console.log(`📧 Weekly digest skipped for user ${userId} - disabled in preferences`);
        return { skipped: true, reason: 'disabled' };
      }

      // Send digest email
      await NotificationService.sendWeeklyDigest(userId, digestData);

      console.log(`📧 Weekly digest sent to user ${userId}`);
      return { success: true, userId, digestData };
    } catch (error) {
      console.error('❌ Failed to send weekly digest:', error);
      throw error;
    }
  }

  /**
   * Send weekly digests to all eligible users
   */
  async sendBulkWeeklyDigests() {
    try {
      // Get users who have weekly digests enabled
      // This would need to be implemented based on user preferences
      // For now, we'll skip this complex query and use a simplified approach

      console.log('📧 Bulk weekly digest sending initiated');

      // In a real implementation, you'd:
      // 1. Query users with digest preferences enabled
      // 2. Batch process them
      // 3. Send digest emails

      // For demo purposes, we'll just log the action
      console.log('📧 Bulk weekly digest completed (placeholder implementation)');

      return { success: true, processed: 0 };
    } catch (error) {
      console.error('❌ Failed to send bulk weekly digests:', error);
      throw error;
    }
  }
}

module.exports = new RecommendationService();
