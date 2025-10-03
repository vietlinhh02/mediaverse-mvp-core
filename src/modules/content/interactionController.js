/**
 * @swagger
 * tags:
 *   - name: Content
 *     description: Content creation, management, and interaction endpoints
 *   - name: Interactions
 *     description: Content interaction endpoints (likes, comments, etc.)
 */

// Interaction controller for likes and comments on content
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { authenticateToken, requireActiveUser } = require('../../middleware/auth');
const { cache } = require('../../config/redis');
const NotificationService = require('../notifications/services/notificationService');

class InteractionController {
  /**
   * @swagger
   * /api/content/{id}/like:
   *   post:
   *     summary: Like content
   *     tags: [Interactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Content ID
   *     responses:
   *       200:
   *         description: Content liked successfully
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
   *                   example: "Content liked successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "like_123"
   *                     userId:
   *                       type: string
   *                       example: "user_123"
   *                     contentId:
   *                       type: string
   *                       example: "art_456"
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       409:
   *         description: Content already liked
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Content already liked"
   *                 code:
   *                   type: string
   *                   example: "ALREADY_LIKED"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static likeContent = asyncHandler(async (req, res) => {
    const { id: contentId } = req.params;
    const { userId } = req.user;

    try {
      // Check if like already exists
      const existingLike = await require('../../config/database').prisma.like.findUnique({
        where: {
          userId_contentId: {
            userId,
            contentId
          }
        }
      });

      if (existingLike) {
        throw new AppError('Content already liked', 409, 'ALREADY_LIKED');
      }

      // Check if content exists and is accessible
      const content = await require('../../config/database').prisma.content.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          status: true,
          visibility: true,
          authorId: true
        }
      });

      if (!content) {
        throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
      }

      if (content.status !== 'published') {
        throw new AppError('Cannot like unpublished content', 400, 'CONTENT_NOT_PUBLISHED');
      }

      if (content.visibility === 'private' && content.authorId !== userId) {
        throw new AppError('Cannot like private content', 403, 'UNAUTHORIZED');
      }

      // Create like
      const like = await require('../../config/database').prisma.like.create({
        data: {
          userId,
          contentId
        },
        include: {
          user: {
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

      // Update content stats
      await InteractionController.updateContentEngagement(contentId, 'like');

      // Create notification for content author (if not liking own content)
      if (content.authorId !== userId) {
        await NotificationService.createNotification(
          content.authorId,
          'like',
          'Someone liked your content',
          `${like.user.username || like.user.profile?.displayName || 'Someone'} liked your content "${content.title || 'Untitled'}"`,
          {
            contentId,
            contentTitle: content.title,
            likerId: userId,
            likerName: like.user.username || like.user.profile?.displayName || 'Someone',
            contentType: content.type || 'content'
          }
        );
      }

      // Update cache
      await InteractionController.updateLikeCache(contentId, 1);

      res.status(201).json({
        success: true,
        message: 'Content liked successfully',
        data: like
      });
    } catch (error) {
      console.error('Error liking content:', error);
      throw error;
    }
  });

  // Unlike content
  /**
   * @swagger
   * /api/content/{id}/like:
   *   delete:
   *     summary: Unlike content
   *     tags: [Interactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Content ID
   *     responses:
   *       200:
   *         description: Content unliked successfully
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
   *                   example: "Content unliked successfully"
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static unlikeContent = asyncHandler(async (req, res) => {
    const { id: contentId } = req.params;
    const { userId } = req.user;

    try {
      // Find and delete like
      const like = await require('../../config/database').prisma.like.findUnique({
        where: {
          userId_contentId: {
            userId,
            contentId
          }
        }
      });

      if (!like) {
        throw new AppError('Like not found', 404, 'LIKE_NOT_FOUND');
      }

      await require('../../config/database').prisma.like.delete({
        where: {
          userId_contentId: {
            userId,
            contentId
          }
        }
      });

      // Update content stats
      await InteractionController.updateContentEngagement(contentId, 'unlike');

      // Update cache
      await InteractionController.updateLikeCache(contentId, -1);

      res.json({
        success: true,
        message: 'Content unliked successfully'
      });
    } catch (error) {
      console.error('Error unliking content:', error);
      throw error;
    }
  });

  // Check if user liked content
  /**
   * @swagger
   * /api/content/{id}/like/status:
   *   get:
   *     summary: Check like status
   *     tags: [Interactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Content ID
   *     responses:
   *       200:
   *         description: Like status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     liked:
   *                       type: boolean
   *                       example: true
   *                     likeId:
   *                       type: string
   *                       example: "like_123"
   *                     likesCount:
   *                       type: integer
   *                       example: 42
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  /**
   * @swagger
   * /api/content/{id}/like/status:
   *   get:
   *     summary: Check like status for content
   *     tags: [Interactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Content ID
   *     responses:
   *       200:
   *         description: Like status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     liked:
   *                       type: boolean
   *                       example: true
   *                     likeId:
   *                       type: string
   *                       example: "like_123"
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static checkLikeStatus = asyncHandler(async (req, res) => {
    const { id: contentId } = req.params;
    const { userId } = req.user;

    try {
      const like = await require('../../config/database').prisma.like.findUnique({
        where: {
          userId_contentId: {
            userId,
            contentId
          }
        }
      });

      res.json({
        success: true,
        data: {
          liked: !!like,
          likeId: like?.id || null
        }
      });
    } catch (error) {
      console.error('Error checking like status:', error);
      throw error;
    }
  });

  // Get likes for content
  static getContentLikes = asyncHandler(async (req, res) => {
    const { id: contentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    try {
      const skip = (page - 1) * limit;

      const [likes, total] = await Promise.all([
        require('../../config/database').prisma.like.findMany({
          where: { contentId },
          include: {
            user: {
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
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        require('../../config/database').prisma.like.count({
          where: { contentId }
        })
      ]);

      res.json({
        success: true,
        data: likes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting content likes:', error);
      throw error;
    }
  });

  // Create comment
  static createComment = asyncHandler(async (req, res) => {
    const { id: contentId } = req.params;
    const { userId } = req.user;
    const { text, parentId } = req.body;

    try {
      // Check if content exists and is accessible
      const content = await require('../../config/database').prisma.content.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          status: true,
          visibility: true,
          authorId: true,
          title: true
        }
      });

      if (!content) {
        throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
      }

      if (content.status !== 'published') {
        throw new AppError('Cannot comment on unpublished content', 400, 'CONTENT_NOT_PUBLISHED');
      }

      if (content.visibility === 'private' && content.authorId !== userId) {
        throw new AppError('Cannot comment on private content', 403, 'UNAUTHORIZED');
      }

      // Check if parent comment exists (if provided)
      if (parentId) {
        const parentComment = await require('../../config/database').prisma.comment.findUnique({
          where: { id: parentId },
          select: { id: true, contentId: true }
        });

        if (!parentComment || parentComment.contentId !== contentId) {
          throw new AppError('Parent comment not found', 404, 'PARENT_COMMENT_NOT_FOUND');
        }
      }

      // Create comment
      const comment = await require('../../config/database').prisma.comment.create({
        data: {
          userId,
          contentId,
          parentId,
          text
        },
        include: {
          user: {
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
          parent: {
            select: {
              id: true,
              text: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: {
                      displayName: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              replies: true
            }
          }
        }
      });

      // Update content stats
      await InteractionController.updateContentEngagement(contentId, 'comment');

      // Create notification for content author (if not commenting on own content)
      if (content.authorId !== userId) {
        await NotificationService.createNotification(
          content.authorId,
          'comment',
          'New comment on your content',
          `${comment.user.username || comment.user.profile?.displayName || 'Someone'} commented on your content "${content.title || 'Untitled'}"`,
          {
            contentId,
            contentTitle: content.title,
            commenterId: userId,
            commenterName: comment.user.username || comment.user.profile?.displayName || 'Someone',
            commentId: comment.id,
            commentText: comment.text.substring(0, 100) + (comment.text.length > 100 ? '...' : ''),
            contentType: content.type || 'content',
            isReply: !!parentId
          }
        );
      }

      // Create notification for parent comment author (if it's a reply)
      if (parentId && comment.parent?.userId && comment.parent.userId !== userId && comment.parent.userId !== content.authorId) {
        await NotificationService.createNotification(
          comment.parent.userId,
          'comment',
          'Someone replied to your comment',
          `${comment.user.username || comment.user.profile?.displayName || 'Someone'} replied to your comment`,
          {
            contentId,
            contentTitle: content.title,
            commenterId: userId,
            commenterName: comment.user.username || comment.user.profile?.displayName || 'Someone',
            commentId: comment.id,
            parentCommentId: parentId,
            parentCommentText: comment.parent.text.substring(0, 100) + (comment.parent.text.length > 100 ? '...' : ''),
            commentText: comment.text.substring(0, 100) + (comment.text.length > 100 ? '...' : ''),
            contentType: content.type || 'content',
            isReply: true
          }
        );
      }

      // Update cache
      await InteractionController.updateCommentCache(contentId, 1);

      res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: comment
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  });

  // Update comment
  static updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { userId } = req.user;
    const { text } = req.body;

    try {
      // Find comment and check ownership
      const comment = await require('../../config/database').prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          user: {
            select: { id: true }
          }
        }
      });

      if (!comment) {
        throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
      }

      if (comment.userId !== userId) {
        const user = await require('../../config/database').prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });

        if (!user || !['admin', 'moderator'].includes(user.role)) {
          throw new AppError('Unauthorized to update this comment', 403, 'UNAUTHORIZED');
        }
      }

      // Update comment
      const updatedComment = await require('../../config/database').prisma.comment.update({
        where: { id: commentId },
        data: {
          text,
          updatedAt: new Date()
        },
        include: {
          user: {
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
          parent: {
            select: {
              id: true,
              text: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: {
                      displayName: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              replies: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Comment updated successfully',
        data: updatedComment
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  });

  // Delete comment
  static deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { userId } = req.user;

    try {
      // Find comment and check ownership
      const comment = await require('../../config/database').prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          user: {
            select: { id: true }
          }
        }
      });

      if (!comment) {
        throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
      }

      if (comment.userId !== userId) {
        const user = await require('../../config/database').prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });

        if (!user || !['admin', 'moderator'].includes(user.role)) {
          throw new AppError('Unauthorized to delete this comment', 403, 'UNAUTHORIZED');
        }
      }

      // Delete comment (replies will be cascade deleted)
      await require('../../config/database').prisma.comment.delete({
        where: { id: commentId }
      });

      // Update content stats
      const content = await require('../../config/database').prisma.content.findUnique({
        where: { id: comment.contentId },
        select: { id: true }
      });

      await InteractionController.updateContentEngagement(comment.contentId, 'comment_delete');

      // Update cache
      await InteractionController.updateCommentCache(comment.contentId, -1);

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  });

  // Get comments for content
  static getContentComments = asyncHandler(async (req, res) => {
    const { id: contentId } = req.params;
    const {
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    try {
      const skip = (page - 1) * limit;

      // Build orderBy clause based on sortBy parameter
      let orderBy;
      if (sortBy === 'likes') {
        orderBy = {
          _count: {
            likes: sortOrder
          }
        };
      } else if (sortBy === 'replies') {
        orderBy = {
          _count: {
            replies: sortOrder
          }
        };
      } else {
        orderBy = {
          [sortBy]: sortOrder
        };
      }

      // Get top-level comments
      const [comments, total] = await Promise.all([
        require('../../config/database').prisma.comment.findMany({
          where: {
            contentId,
            parentId: null // Only top-level comments
          },
          include: {
            user: {
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
                replies: true,
                likes: true
              }
            }
          },
          orderBy,
          skip,
          take: parseInt(limit)
        }),
        require('../../config/database').prisma.comment.count({
          where: {
            contentId,
            parentId: null
          }
        })
      ]);

      res.json({
        success: true,
        data: comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting content comments:', error);
      throw error;
    }
  });

  // Get comment replies
  static getCommentReplies = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
      const skip = (page - 1) * limit;

      const [replies, total] = await Promise.all([
        require('../../config/database').prisma.comment.findMany({
          where: { parentId: commentId },
          include: {
            user: {
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
                likes: true
              }
            }
          },
          orderBy: { createdAt: 'asc' },
          skip,
          take: parseInt(limit)
        }),
        require('../../config/database').prisma.comment.count({
          where: { parentId: commentId }
        })
      ]);

      res.json({
        success: true,
        data: replies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting comment replies:', error);
      throw error;
    }
  });

  // Like comment
  static likeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { userId } = req.user;

    try {
      // Check if comment exists
      const comment = await require('../../config/database').prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, userId: true }
      });

      if (!comment) {
        throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
      }

      // Check if like already exists
      const existingLike = await require('../../config/database').prisma.like.findFirst({
        where: {
          userId,
          commentId
        }
      });

      if (existingLike) {
        throw new AppError('Comment already liked', 409, 'ALREADY_LIKED');
      }

      // Create like
      const like = await require('../../config/database').prisma.like.create({
        data: {
          userId,
          commentId
        }
      });

      // Create notification for comment author
      if (comment.userId !== userId) {
        await InteractionController.createNotification(comment.userId, 'comment_like', {
          commentId,
          likerId: userId
        });
      }

      res.status(201).json({
        success: true,
        message: 'Comment liked successfully',
        data: like
      });
    } catch (error) {
      console.error('Error liking comment:', error);
      throw error;
    }
  });

  // Unlike comment
  static unlikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { userId } = req.user;

    try {
      // Find and delete like
      const like = await require('../../config/database').prisma.like.findFirst({
        where: {
          userId,
          commentId
        }
      });

      if (!like) {
        throw new AppError('Like not found', 404, 'LIKE_NOT_FOUND');
      }

      await require('../../config/database').prisma.like.delete({
        where: { id: like.id }
      });

      res.json({
        success: true,
        message: 'Comment unliked successfully'
      });
    } catch (error) {
      console.error('Error unliking comment:', error);
      throw error;
    }
  });

  // Share content
  /**
   * @swagger
   * /api/content/{id}/share:
   *   post:
   *     summary: Share content
   *     tags: [Interactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Content ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - platform
   *             properties:
   *               platform:
   *                 type: string
   *                 enum: [facebook, twitter, linkedin, whatsapp, telegram, copy]
   *                 description: Sharing platform
   *               message:
   *                 type: string
   *                 maxLength: 280
   *                 description: Custom message (optional)
   *     responses:
   *       200:
   *         description: Content shared successfully
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
   *                   example: "Content shared successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     shareId:
   *                       type: string
   *                       example: "share_123"
   *                     platform:
   *                       type: string
   *                       example: "twitter"
   *                     shareUrl:
   *                       type: string
   *                       example: "https://twitter.com/intent/tweet?text=..."
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static shareContent = asyncHandler(async (req, res) => {
    const { id: contentId } = req.params;
    const { userId } = req.user;
    const { platform, message } = req.body;

    try {
      // Validate platform
      const validPlatforms = ['facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'copy'];
      if (!validPlatforms.includes(platform)) {
        throw new AppError('Invalid platform', 400, 'INVALID_PLATFORM');
      }

      // Check if content exists and is accessible
      const content = await require('../../config/database').prisma.content.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          authorId: true,
          visibility: true,
          metadata: true
        }
      });

      if (!content) {
        throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND');
      }

      if (content.visibility === 'private' && content.authorId !== userId) {
        throw new AppError('Cannot share private content', 403, 'UNAUTHORIZED');
      }

      // Generate share URL based on platform
      const shareUrl = InteractionController.generateShareUrl(platform, content, message);
      const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create share record
      const share = await require('../../config/database').prisma.share.create({
        data: {
          id: shareId,
          userId,
          contentId,
          platform,
          message: message || content.title,
          url: shareUrl,
          metadata: {
            contentType: content.type,
            contentTitle: content.title,
            sharedAt: new Date().toISOString()
          }
        }
      });

      // Update content stats
      await InteractionController.updateContentEngagement(contentId, 'share');

      res.json({
        success: true,
        message: 'Content shared successfully',
        data: {
          shareId: share.id,
          platform,
          shareUrl,
          message: share.message
        }
      });
    } catch (error) {
      console.error('Error sharing content:', error);
      throw error;
    }
  });

  // Helper methods
  static async updateContentEngagement(contentId, action) {
    // Get current stats
    const content = await require('../../config/database').prisma.content.findUnique({
      where: { id: contentId },
      select: { stats: true }
    });

    if (!content) return;

    const currentStats = content.stats || {};
    const newStats = { ...currentStats };

    switch (action) {
      case 'like':
        newStats.likes = (newStats.likes || 0) + 1;
        break;
      case 'unlike':
        newStats.likes = Math.max(0, (newStats.likes || 0) - 1);
        break;
      case 'comment':
        newStats.comments = (newStats.comments || 0) + 1;
        break;
      case 'comment_delete':
        newStats.comments = Math.max(0, (newStats.comments || 0) - 1);
        break;
      case 'share':
        newStats.shares = (newStats.shares || 0) + 1;
        break;
    }

    // Update stats if changed
    if (JSON.stringify(currentStats) !== JSON.stringify(newStats)) {
      await require('../../config/database').prisma.content.update({
        where: { id: contentId },
        data: { stats: newStats }
      });
    }
  }

  static async updateLikeCache(contentId, change) {
    const cacheKey = `content:likes:${contentId}`;
    const currentLikes = await cache.get(cacheKey) || 0;
    await cache.set(cacheKey, Math.max(0, currentLikes + change), 3600);
  }

  static async updateCommentCache(contentId, change) {
    const cacheKey = `content:comments:${contentId}`;
    const currentComments = await cache.get(cacheKey) || 0;
    await cache.set(cacheKey, Math.max(0, currentComments + change), 3600);
  }

  static async createNotification(userId, type, data) {
    try {
      await require('../../config/database').prisma.notification.create({
        data: {
          userId,
          type,
          title: InteractionController.getNotificationTitle(type, data),
          message: InteractionController.getNotificationMessage(type, data),
          data
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  static getNotificationTitle(type, data) {
    switch (type) {
      case 'like':
        return 'Your content was liked';
      case 'comment':
        return 'New comment on your content';
      case 'reply':
        return 'New reply to your comment';
      case 'comment_like':
        return 'Your comment was liked';
      default:
        return 'New interaction';
    }
  }

  static getNotificationMessage(type, data) {
    switch (type) {
      case 'like':
        return `Someone liked your content "${data.contentTitle}"`;
      case 'comment':
        return `Someone commented on your content "${data.contentTitle}"`;
      case 'reply':
        return `Someone replied to your comment on "${data.contentTitle}"`;
      case 'comment_like':
        return 'Someone liked your comment';
      default:
        return 'You have a new interaction';
    }
  }

  static generateShareUrl(platform, content, customMessage) {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://yourdomain.com' // Replace with your actual domain
      : 'http://localhost:5000';

    const contentUrl = `${baseUrl}/content/${content.id}`;
    const message = encodeURIComponent(customMessage || content.title);
    const description = encodeURIComponent(content.description || '');

    switch (platform) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(contentUrl)}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${message}&url=${encodeURIComponent(contentUrl)}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(contentUrl)}`;
      case 'whatsapp':
        return `https://wa.me/?text=${message} ${encodeURIComponent(contentUrl)}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(contentUrl)}&text=${message}`;
      case 'copy':
        return contentUrl; // Just return the content URL for copying
      default:
        return contentUrl;
    }
  }

  // Get share statistics for content
  static getContentShares = asyncHandler(async (req, res) => {
    const { id: contentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    try {
      const skip = (page - 1) * limit;

      const [shares, total] = await Promise.all([
        require('../../config/database').prisma.share.findMany({
          where: { contentId },
          include: {
            user: {
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
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        require('../../config/database').prisma.share.count({
          where: { contentId }
        })
      ]);

      // Group shares by platform
      const sharesByPlatform = shares.reduce((acc, share) => {
        if (!acc[share.platform]) {
          acc[share.platform] = [];
        }
        acc[share.platform].push(share);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          shares,
          sharesByPlatform,
          summary: {
            total,
            facebook: shares.filter((s) => s.platform === 'facebook').length,
            twitter: shares.filter((s) => s.platform === 'twitter').length,
            linkedin: shares.filter((s) => s.platform === 'linkedin').length,
            whatsapp: shares.filter((s) => s.platform === 'whatsapp').length,
            telegram: shares.filter((s) => s.platform === 'telegram').length,
            copy: shares.filter((s) => s.platform === 'copy').length
          }
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting content shares:', error);
      throw error;
    }
  });

  // Hashtag processing and discovery system
  /**
   * @swagger
   * /api/content/hashtags:
   *   get:
   *     summary: Get trending hashtags
   *     tags: [Interactions]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of hashtags to return
   *       - in: query
   *         name: timeframe
   *         schema:
   *           type: string
   *           enum: [hour, day, week, month]
   *           default: day
   *         description: Timeframe for trending calculation
   *     responses:
   *       200:
   *         description: Trending hashtags retrieved successfully
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
   *                     properties:
   *                       hashtag:
   *                         type: string
   *                         example: "#javascript"
   *                       count:
   *                         type: integer
   *                         example: 42
   *                       trend:
   *                         type: string
   *                         example: "up"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getTrendingHashtags = asyncHandler(async (req, res) => {
    const { limit = 20, timeframe = 'day' } = req.query;

    try {
      // Calculate date range based on timeframe
      const now = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case 'hour':
          startDate.setHours(now.getHours() - 1);
          break;
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 1);
      }

      // Get trending hashtags from content tags
      const trendingHashtags = await require('../../config/database').prisma.$queryRaw`
        SELECT
          UNNEST(tags) as hashtag,
          COUNT(*) as count,
          'up' as trend
        FROM "content"
        WHERE
          tags IS NOT NULL
          AND "createdAt" >= ${startDate}
          AND status = 'published'
        GROUP BY UNNEST(tags)
        ORDER BY count DESC
        LIMIT ${parseInt(limit)}
      `;

      res.json({
        success: true,
        data: trendingHashtags.map((tag) => ({
          hashtag: tag.hashtag,
          count: parseInt(tag.count),
          trend: tag.trend
        })),
        timeframe,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      throw error;
    }
  });

  /**
   * @swagger
   * /api/content/hashtags/{hashtag}/content:
   *   get:
   *     summary: Get content by hashtag
   *     tags: [Interactions]
   *     parameters:
   *       - in: path
   *         name: hashtag
   *         required: true
   *         schema:
   *           type: string
   *         description: Hashtag without # symbol
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
   *         description: Items per page
   *       - in: query
   *         name: contentType
   *         schema:
   *           type: string
   *           enum: [article, video, document, all]
   *           default: all
   *         description: Filter by content type
   *     responses:
   *       200:
   *         description: Content with hashtag retrieved successfully
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
   *                     $ref: '#/components/schemas/Content'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       404:
   *         description: Hashtag not found
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getContentByHashtag = asyncHandler(async (req, res) => {
    const { hashtag } = req.params;
    const { page = 1, limit = 20, contentType = 'all' } = req.query;

    try {
      const skip = (page - 1) * limit;

      // Build where condition for content type
      const typeCondition = contentType !== 'all' ? { type: contentType } : {};

      const [content, total] = await Promise.all([
        require('../../config/database').prisma.content.findMany({
          where: {
            ...typeCondition,
            tags: {
              has: hashtag
            },
            status: 'published',
            visibility: {
              in: ['public', 'unlisted']
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
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        require('../../config/database').prisma.content.count({
          where: {
            ...typeCondition,
            tags: {
              has: hashtag
            },
            status: 'published',
            visibility: {
              in: ['public', 'unlisted']
            }
          }
        })
      ]);

      if (total === 0) {
        throw new AppError('No content found with this hashtag', 404, 'HASHTAG_NOT_FOUND');
      }

      res.json({
        success: true,
        data: content,
        hashtag: `#${hashtag}`,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting content by hashtag:', error);
      throw error;
    }
  });

  // Process hashtags in content text
  static processHashtags(text) {
    if (!text) return [];

    // Extract hashtags using regex
    const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
    const hashtags = text.match(hashtagRegex) || [];

    // Clean and normalize hashtags
    return hashtags.map((tag) => tag.toLowerCase().trim()).filter((tag, index, array) =>
      // Remove duplicates
      array.indexOf(tag) === index);
  }

  // Create community post
  /**
   * @swagger
   * /api/content/community/posts:
   *   post:
   *     summary: Create community post
   *     tags: [Interactions]
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
   *                 minLength: 5
   *                 maxLength: 200
   *                 description: Post title
   *               content:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 10000
   *                 description: Post content
   *               hashtags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Hashtags for the post
   *               visibility:
   *                 type: string
   *                 enum: [public, community, private]
   *                 default: public
   *                 description: Post visibility
   *     responses:
   *       201:
   *         description: Community post created successfully
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
   *                   example: "Community post created successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "post_123"
   *                     title:
   *                       type: string
   *                       example: "My Community Post"
   *                     content:
   *                       type: string
   *                       example: "This is my community post content..."
   *                     hashtags:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: ["#javascript", "#webdev"]
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static createCommunityPost = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const {
      title, content, hashtags = [], visibility = 'public'
    } = req.body;

    try {
      // Process hashtags from content if not provided
      const extractedHashtags = InteractionController.processHashtags(content);
      const allHashtags = [...new Set([...hashtags.map((h) => h.toLowerCase()), ...extractedHashtags])];

      // Create community post
      const post = await require('../../config/database').prisma.communityPost.create({
        data: {
          title,
          content,
          hashtags: allHashtags,
          visibility,
          authorId: userId,
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
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
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      });

      // Create notification for followers (if not own post)
      const followers = await require('../../config/database').prisma.follow.findMany({
        where: { followeeId: userId },
        select: { followerId: true }
      });

      for (const follow of followers) {
        if (follow.followerId !== userId) {
          await InteractionController.createNotification(follow.followerId, 'community_post', {
            postId: post.id,
            postTitle: post.title,
            authorId: userId
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Community post created successfully',
        data: post
      });
    } catch (error) {
      console.error('Error creating community post:', error);
      throw error;
    }
  });

  /**
   * @swagger
   * /api/content/community/posts:
   *   get:
   *     summary: Get community posts
   *     tags: [Interactions]
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
   *         description: Items per page
   *       - in: query
   *         name: hashtag
   *         schema:
   *           type: string
   *         description: Filter by hashtag
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [createdAt, likes, comments]
   *           default: createdAt
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Community posts retrieved successfully
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
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "post_123"
   *                       title:
   *                         type: string
   *                         example: "My Community Post"
   *                       content:
   *                         type: string
   *                         example: "This is my community post content..."
   *                       hashtags:
   *                         type: array
   *                         items:
   *                           type: string
   *                         example: ["#javascript", "#webdev"]
   *                       likesCount:
   *                         type: integer
   *                         example: 5
   *                       commentsCount:
   *                         type: integer
   *                         example: 3
   *                       author:
   *                         $ref: '#/components/schemas/User'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getCommunityPosts = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const {
      page = 1, limit = 20, hashtag, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    try {
      const skip = (page - 1) * limit;

      // Build where condition
      const whereCondition = {
        visibility: {
          in: ['public', 'community']
        }
      };

      // Add hashtag filter if provided
      if (hashtag) {
        whereCondition.hashtags = {
          has: hashtag.toLowerCase()
        };
      }

      // Build orderBy clause based on sortBy parameter
      let orderBy;
      if (sortBy === 'likes') {
        orderBy = {
          likes: {
            _count: sortOrder
          }
        };
      } else if (sortBy === 'comments') {
        orderBy = {
          comments: {
            _count: sortOrder
          }
        };
      } else {
        orderBy = {
          [sortBy]: sortOrder
        };
      }

      const [posts, total] = await Promise.all([
        require('../../config/database').prisma.communityPost.findMany({
          where: whereCondition,
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
          take: parseInt(limit)
        }),
        require('../../config/database').prisma.communityPost.count({
          where: whereCondition
        })
      ]);

      res.json({
        success: true,
        data: posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting community posts:', error);
      throw error;
    }
  });
}

module.exports = InteractionController;
