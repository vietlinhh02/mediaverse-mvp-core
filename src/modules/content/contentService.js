// Content service for managing articles, videos, and documents
const { prisma, handleDatabaseError } = require('../../config/database');
const { cache } = require('../../config/redis');
const { AppError } = require('../../middleware/errorHandler');

class ContentService {
  // Helper method to transform content response (map body to content for API)
  static transformContentResponse(content) {
    if (!content) return null;

    // Map body field to content for API response
    if (content.body !== undefined) {
      content.content = content.body;
      delete content.body;
    }

    // Transform MinIO URLs to proxy URLs for security
    if (content.featuredImage) {
      content.featuredImage = ContentService.transformMinIOUrlToProxy(content.featuredImage);
    }

    // Transform metadata URLs if present
    if (content.metadata) {
      const metadata = { ...content.metadata };
      
      // Transform thumbnail URLs
      if (metadata.thumbnailUrl) {
        metadata.thumbnailUrl = ContentService.transformMinIOUrlToProxy(metadata.thumbnailUrl);
      }
      // Transform document URL if present
      if (metadata.documentUrl) {
        metadata.documentUrl = ContentService.transformMinIOUrlToProxy(metadata.documentUrl);
      }
      
      // Transform thumbnail array
      if (metadata.thumbnails && Array.isArray(metadata.thumbnails)) {
        metadata.thumbnails = metadata.thumbnails.map(url => ContentService.transformMinIOUrlToProxy(url));
      }
      
      // Transform HLS URLs
      if (metadata.hlsMasterUrl) {
        metadata.hlsMasterUrl = ContentService.transformMinIOUrlToProxy(metadata.hlsMasterUrl);
      }
      
      if (metadata.hlsStreams && Array.isArray(metadata.hlsStreams)) {
        metadata.hlsStreams = metadata.hlsStreams.map(stream => ({
          ...stream,
          playlistUrl: ContentService.transformMinIOUrlToProxy(stream.playlistUrl)
        }));
      }
      
      content.metadata = metadata;
    }

    return content;
  }

  // Helper method to transform MinIO URLs to proxy URLs
  static transformMinIOUrlToProxy(url) {
    if (!url || typeof url !== 'string') return url;
    
    // Check if it's already a proxy URL
    if (url.includes('/api/storage/')) return url;
    
    // Check if it's a MinIO URL (s3:// or http://localhost:9000)
    if (url.startsWith('s3://') || url.includes('localhost:9000') || url.includes('minio')) {
      // Extract bucket and object key from different URL formats
      let bucket, objectKey;
      
      if (url.startsWith('s3://')) {
        // s3://bucket/key format
        const s3Match = url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
        if (s3Match) {
          bucket = s3Match[1];
          objectKey = s3Match[2];
        }
      } else if (url.includes('localhost:9000') || url.includes('minio')) {
        // http://localhost:9000/bucket/key format
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          bucket = pathParts[0];
          objectKey = pathParts.slice(1).join('/');
        }
      }
      
      if (bucket && objectKey) {
        return `/api/storage/${bucket}/${objectKey}`;
      }
    }
    
    return url;
  }

  // Helper method to calculate reading time for articles
  static calculateReadingTime(content, wordsPerMinute = 200) {
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(readingTime, 1); // Minimum 1 minute
  }

  // Helper method to generate content metadata
  static generateContentMetadata(content, type, additionalData = {}) {
    const metadata = {
      wordCount: 0,
      readingTime: 0,
      tags: content.tags || [],
      category: content.category,
      ...additionalData
    };

    // Only set processingStatus for content types that need background processing
    if (type === 'video' || type === 'document') {
      metadata.processingStatus = metadata.processingStatus || 'queued';
    } else if (type === 'article') {
      // Articles don't need background processing
      metadata.processingStatus = 'completed';
    }

    if (type === 'article' && content.content) {
      metadata.wordCount = content.content.split(/\s+/).length;
      metadata.readingTime = this.calculateReadingTime(content.content);
    }

    return metadata;
  }

  // Helper method to update content stats
  static async updateContentStats(contentId, statsUpdate = {}) {
    const cacheKey = `content:stats:${contentId}`;

    try {
      // Get current stats from cache or database
      let currentStats = await cache.get(cacheKey);

      if (!currentStats) {
        const content = await prisma.content.findUnique({
          where: { id: contentId },
          select: { stats: true }
        });

        if (!content) {
          throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
        }

        currentStats = content.stats || {};
      }

      // Update stats
      const updatedStats = { ...currentStats, ...statsUpdate };

      // Update in database
      await prisma.content.update({
        where: { id: contentId },
        data: { stats: updatedStats }
      });

      // Update cache
      await cache.set(cacheKey, updatedStats, 3600); // Cache for 1 hour

      return updatedStats;
    } catch (error) {
      console.error('Error updating content stats:', error);
      throw handleDatabaseError(error, 'updateContentStats');
    }
  }

  // Create article
  static async createArticle(userId, articleData) {
    try {
      const baseMetadata = this.generateContentMetadata(articleData, 'article');
      const metadata = {
        ...baseMetadata,
        processingStatus: 'completed',
        uploadStatus: 'completed'
      };

      const content = await prisma.content.create({
        data: {
          type: 'article',
          title: articleData.title,
          body: articleData.content,
          description: articleData.description,
          featuredImage: articleData.featuredImage || null,
          category: articleData.category,
          tags: articleData.tags || [],
          metadata,
          status: articleData.status || 'draft',
          visibility: articleData.visibility || 'public',
          // For articles, consider processing done by default
          uploadStatus: 'completed',
          processingStatus: 'completed',
          author: {
            connect: { id: userId }
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
          }
        }
      });

      // Cache the content
      await cache.set(`content:${content.id}`, content, 3600);

      return this.transformContentResponse(content);
    } catch (error) {
      console.error('Error creating article:', error);
      throw handleDatabaseError(error, 'createArticle');
    }
  }

  // Create video
  static async createVideo(userId, videoData) {
    try {
      const metadata = this.generateContentMetadata(videoData, 'video', {
        duration: videoData.duration || 0,
        resolution: videoData.resolution || 'unknown',
        fileSize: videoData.fileSize || 0,
        videoUrl: videoData.videoUrl,
        // Use upload and processing status from videoData if provided
        uploadStatus: videoData.uploadStatus || 'pending',
        processingStatus: videoData.processingStatus || 'queued',
        useAdaptiveStorage: videoData.useAdaptiveStorage
      });

      const content = await prisma.content.create({
        data: {
          type: 'video',
          title: videoData.title,
          description: videoData.description,
          category: videoData.category,
          tags: videoData.tags || [],
          metadata,
          status: videoData.status || 'draft',
          visibility: videoData.visibility || 'public',
          author: {
            connect: { id: userId }
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
          }
        }
      });

      // Cache the content
      await cache.set(`content:${content.id}`, content, 3600);

      return this.transformContentResponse(content);
    } catch (error) {
      console.error('Error creating video:', error);
      throw handleDatabaseError(error, 'createVideo');
    }
  }

  // Create document
  static async createDocument(userId, documentData) {
    try {
      const metadata = this.generateContentMetadata(documentData, 'document', {
        pageCount: documentData.pageCount || 0,
        fileSize: documentData.fileSize || 0,
        documentUrl: documentData.documentUrl,
        textContent: documentData.textContent
      });

      const content = await prisma.content.create({
        data: {
          type: 'document',
          title: documentData.title,
          description: documentData.description,
          category: documentData.category,
          tags: documentData.tags || [],
          metadata,
          status: documentData.status || 'draft',
          visibility: documentData.visibility || 'public',
          author: {
            connect: { id: userId }
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
          }
        }
      });

      // Cache the content
      await cache.set(`content:${content.id}`, content, 3600);

      return this.transformContentResponse(content);
    } catch (error) {
      console.error('Error creating document:', error);
      throw handleDatabaseError(error, 'createDocument');
    }
  }

  // Update content
  static async updateContent(contentId, updateData, userId = null) {
    try {
      // Check if content exists and user has permission
      const existingContent = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          author: {
            select: { id: true }
          }
        }
      });

      if (!existingContent) {
        throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
      }

      // Check permission (author or admin/moderator)
      if (userId && existingContent.authorId !== userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });

        if (!user || !['admin', 'moderator'].includes(user.role)) {
          throw new AppError('Unauthorized to update this content', 403, 'UNAUTHORIZED');
        }
      }

      // Map 'content' field to 'body' field (for database schema compatibility)
      if (updateData.content !== undefined) {
        updateData.body = updateData.content;
        delete updateData.content;
      }

      // Handle video-specific fields that should go into metadata FIRST
      // This must be done before any other processing
      const videoFields = {};
      if (updateData.filename) videoFields.filename = updateData.filename;
      if (updateData.originalName) videoFields.originalName = updateData.originalName;
      if (updateData.mimetype) videoFields.mimetype = updateData.mimetype;
      if (updateData.fileSize) videoFields.fileSize = updateData.fileSize;
      if (updateData.uploadPath) videoFields.uploadPath = updateData.uploadPath;
      if (updateData.videoUrl) videoFields.videoUrl = updateData.videoUrl;

      // Remove video-specific fields from updateData immediately
      delete updateData.filename;
      delete updateData.originalName;
      delete updateData.mimetype;
      delete updateData.fileSize;
      delete updateData.uploadPath;
      delete updateData.videoUrl;

      // Generate updated metadata if content is being updated
      let metadata = existingContent.metadata || {};
      if (updateData.body && existingContent.type === 'article') {
        const newMetadata = this.generateContentMetadata(
          { content: updateData.body, tags: updateData.tags || existingContent.tags, category: updateData.category || existingContent.category },
          'article'
        );
        metadata = { ...metadata, ...newMetadata };
      }

      // If metadata is provided in updateData, merge it
      if (updateData.metadata || Object.keys(videoFields).length > 0) {
        metadata = { ...metadata, ...updateData.metadata, ...videoFields };
        delete updateData.metadata; // Remove metadata from updateData to avoid conflict
      }

      // Filter updateData to only include fields that exist in the schema
      const allowedFields = [
        'type', 'title', 'body', 'description', 'featuredImage', 'status', 'visibility',
        'category', 'tags', 'stats', 'uploadStatus', 'processingStatus', 'views',
        'likesCount', 'commentsCount', 'trendingScore', 'relevanceScore', 'publishedAt'
      ];

      const filteredUpdateData = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredUpdateData[field] = updateData[field];
        }
      }

      const updatedContent = await prisma.content.update({
        where: { id: contentId },
        data: {
          ...filteredUpdateData,
          metadata,
          updatedAt: new Date()
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
          }
        }
      });

      // Update cache
      await cache.set(`content:${contentId}`, updatedContent, 3600);

      return this.transformContentResponse(updatedContent);
    } catch (error) {
      console.error('Error updating content:', error);
      throw handleDatabaseError(error, 'updateContent');
    }
  }

  // Delete content
  static async deleteContent(contentId, userId = null) {
    try {
      // Check if content exists and user has permission
      const existingContent = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          author: {
            select: { id: true }
          }
        }
      });

      if (!existingContent) {
        throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
      }

      // Check permission (author or admin/moderator)
      if (userId && existingContent.authorId !== userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });

        if (!user || !['admin', 'moderator'].includes(user.role)) {
          throw new AppError('Unauthorized to delete this content', 403, 'UNAUTHORIZED');
        }
      }

      // Delete related data (likes, comments will be cascade deleted)
      await prisma.content.delete({
        where: { id: contentId }
      });

      // Remove from cache
      await cache.del(`content:${contentId}`);
      await cache.del(`content:stats:${contentId}`);

      return { success: true, message: 'Content deleted successfully' };
    } catch (error) {
      console.error('Error deleting content:', error);
      throw handleDatabaseError(error, 'deleteContent');
    }
  }

  // Publish content
  static async publishContent(contentId, userId = null) {
    try {
      const content = await this.updateContent(contentId, {
        status: 'published',
        publishedAt: new Date()
      }, userId);

      return content;
    } catch (error) {
      console.error('Error publishing content:', error);
      throw handleDatabaseError(error, 'publishContent');
    }
  }

  // Get content by ID
  static async getContent(contentId, incrementViews = false) {
    try {
      const cacheKey = `content:${contentId}`;
      let content = await cache.get(cacheKey);

      if (!content) {
        content = await prisma.content.findUnique({
          where: { id: contentId },
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

        if (!content) {
          throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
        }

        // Cache for 1 hour
        await cache.set(cacheKey, content, 3600);
      }

      // Increment view count if requested
      if (incrementViews && content.status === 'published') {
        await this.updateContentStats(contentId, {
          views: (content.stats?.views || 0) + 1
        });
      }

      return this.transformContentResponse(content);
    } catch (error) {
      console.error('Error getting content:', error);
      throw handleDatabaseError(error, 'getContent');
    }
  }

  // Search content with full-text search
  static async searchContent(searchParams, userId = null) {
    try {
      const {
        q,
        type = 'all',
        category,
        tags = [],
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = searchParams;

      const skip = (page - 1) * limit;

      // Build search conditions
      const where = {
        status: 'published'
      };

      // Handle visibility filtering based on user authentication and ownership
      if (userId) {
        // Authenticated user: can see public, unlisted, and their own private content
        where.OR = [
          { visibility: 'public' },
          { visibility: 'unlisted' },
          { visibility: 'private', authorId: userId }
        ];
      } else {
        // Anonymous user: only public content
        where.visibility = 'public';
      }

      if (type !== 'all') {
        where.type = type;
      }

      if (category) {
        where.category = category;
      }

      if (tags.length > 0) {
        where.tags = { hasEvery: tags };
      }

      // Full-text search using PostgreSQL tsvector
      const searchCondition = q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } }
        ]
      } : {};

      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      // For trending content, use engagement-based sorting
      if (sortBy === 'trending') {
        orderBy.createdAt = 'desc';
      }

      const [contents, total] = await Promise.all([
        prisma.content.findMany({
          where: { ...where, ...searchCondition },
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
          orderBy,
          skip,
          take: limit
        }),
        prisma.content.count({
          where: { ...where, ...searchCondition }
        })
      ]);

      return {
        contents: contents.map((content) => this.transformContentResponse(content)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error searching content:', error);
      throw handleDatabaseError(error, 'searchContent');
    }
  }

  // Get personalized feed
  static async getPersonalizedFeed(userId, feedParams) {
    try {
      const {
        page = 1, limit = 20, useSmartAlgorithm = true, type, category
      } = feedParams;
      const skip = (page - 1) * limit;

      console.log('🔍 [PersonalizedFeed] feedParams:', feedParams);
      console.log('🔍 [PersonalizedFeed] type filter:', type);
      console.log('🔍 [PersonalizedFeed] category filter:', category);

      // Build base filter from feedParams
      const baseFilter = {
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        ...(type && { type }),
        ...(category && { category })
      };

      console.log('🔍 [PersonalizedFeed] baseFilter:', JSON.stringify(baseFilter, null, 2));

      // Use smart recommendation algorithm (Facebook/TikTok style)
      if (useSmartAlgorithm) {
        const SmartRecommendationService = require('../../services/smartRecommendationService');

        // Get user interest profile from behavior
        const profile = await SmartRecommendationService.getUserInterestProfile(userId);
        const mixRatio = SmartRecommendationService.getFeedMixRatio(profile.totalInteractions);

        const personalizedCount = Math.ceil(limit * mixRatio.personalized);
        const trendingCount = Math.ceil(limit * mixRatio.trending);
        const diverseCount = limit - personalizedCount - trendingCount;

        const contentPool = [];
        const usedIds = new Set();

        // 1. Get personalized content (based on behavior)
        if (personalizedCount > 0 && profile.totalInteractions > 0) {
          const personalizedQuery = SmartRecommendationService.buildPersonalizedQuery(profile);

          if (personalizedQuery.length > 0) {
            const whereClause = {
              ...baseFilter,
              OR: personalizedQuery
            };
            console.log('🔍 [Personalized Query] where:', JSON.stringify(whereClause, null, 2));

            const personalized = await prisma.content.findMany({
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
                _count: {
                  select: {
                    likes: true,
                    comments: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: personalizedCount * 2
            });

            personalized.forEach((content) => {
              if (!usedIds.has(content.id) && contentPool.length < personalizedCount) {
                contentPool.push({ ...content, feedSource: 'personalized' });
                usedIds.add(content.id);
              }
            });
          }
        }

        // 2. Get trending content (popular in last 7 days)
        if (trendingCount > 0) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const trending = await prisma.content.findMany({
            where: {
              ...baseFilter,
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
                  comments: true
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

        // 3. Get diverse content (unexplored categories)
        if (diverseCount > 0) {
          const allCategories = [
            'technology', 'education', 'entertainment', 'business',
            'health', 'lifestyle', 'science', 'sports', 'politics', 'travel', 'other'
          ];

          const unexploredCategories = allCategories.filter(
            (cat) => !profile.categories.includes(cat)
          );

          if (unexploredCategories.length > 0) {
            const diverse = await prisma.content.findMany({
              where: {
                ...baseFilter,
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

        // 4. Shuffle for variety
        const shuffled = SmartRecommendationService.shuffleArray(contentPool);
        const paginatedContent = shuffled.slice(skip, skip + limit);

        return {
          contents: paginatedContent.map((content) => this.transformContentResponse(content)),
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
          userEngagementLevel: profile.totalInteractions
        };
      }

      // Fallback: Traditional preference-based feed
      // Get user preferences and following
      const [user, following] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: {
              select: { preferences: true }
            }
          }
        }),
        prisma.follow.findMany({
          where: { followerId: userId },
          select: { followeeId: true }
        })
      ]);

      const followingIds = following.map((f) => f.followeeId);
      const userPreferences = user.profile?.preferences || {};

      // Build feed query based on preferences and following
      const where = {
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        OR: [
          { authorId: { in: followingIds } }, // Content from followed users
          {
            category: {
              in: userPreferences.preferredCategories || []
            }
          }, // Content in preferred categories
          {
            tags: {
              hasSome: userPreferences.preferredTags || []
            }
          } // Content with preferred tags
        ]
      };

      const [contents, total] = await Promise.all([
        prisma.content.findMany({
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
          take: limit
        }),
        prisma.content.count({ where })
      ]);

      return {
        contents: contents.map((content) => this.transformContentResponse(content)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting personalized feed:', error);
      throw handleDatabaseError(error, 'getPersonalizedFeed');
    }
  }

  // Get trending content
  static async getTrendingContent(category = null) {
    try {
      const cacheKey = `trending:content:${category || 'all'}`;
      const cachedResult = await cache.get(cacheKey);

      if (cachedResult) {
        return cachedResult;
      }

      // Calculate trending score based on engagement
      const where = {
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      };

      if (category) {
        where.category = category;
      }

      const contents = await prisma.content.findMany({
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
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      });

      // Calculate trending score
      const scoredContents = contents.map((content) => {
        const stats = content.stats || {};
        const ageInHours = (Date.now() - new Date(content.createdAt).getTime()) / (1000 * 60 * 60);
        const ageScore = Math.max(0, 1 - (ageInHours / 168)); // Decay over 7 days

        const engagementScore = (
          (stats.views || 0) * 1
          + (content._count.likes || 0) * 5
          + (content._count.comments || 0) * 3
        );

        return {
          ...content,
          trendingScore: engagementScore * ageScore
        };
      });

      // Sort by trending score and take top 20
      const trendingContent = scoredContents
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 20)
        .map((content) => this.transformContentResponse(content));

      const result = { contents: trendingContent };

      // Cache for 30 minutes
      await cache.set(cacheKey, result, 1800);

      return result;
    } catch (error) {
      console.error('Error getting trending content:', error);
      throw handleDatabaseError(error, 'getTrendingContent');
    }
  }

  // Get content by category
  static async getContentByCategory(category, paginationParams) {
    try {
      const { page = 1, limit = 20 } = paginationParams;
      const skip = (page - 1) * limit;

      const [contents, total] = await Promise.all([
        prisma.content.findMany({
          where: {
            status: 'published',
            visibility: { in: ['public', 'unlisted'] },
            category
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
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.content.count({
          where: {
            status: 'published',
            visibility: { in: ['public', 'unlisted'] },
            category
          }
        })
      ]);

      return {
        contents: contents.map((content) => this.transformContentResponse(content)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting content by category:', error);
      throw handleDatabaseError(error, 'getContentByCategory');
    }
  }
}

module.exports = ContentService;
