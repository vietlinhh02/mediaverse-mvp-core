const ContentService = require('./contentService');
const { prisma } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const { createVideoQueue, enqueueProcessVideo } = require('../../jobs/queues/videoQueue');
const { getObjectStream } = require('../../services/media/minioMediaStore');
const { queue } = require('../../config/redis');

class VideoController {
  /**
   * @swagger
   * tags:
   *   - name: Video
   *     description: Video management and streaming
   */

  /**
   * @swagger
   * /api/content/videos:
   *   get:
   *     summary: Get all videos
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: Items per page
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [published, draft, all]
   *           default: published
   *         description: Filter by status
   *       - in: query
   *         name: visibility
   *         schema:
   *           type: string
   *           enum: [public, private, unlisted, all]
   *           default: public
   *         description: Filter by visibility
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [recent, oldest, popular]
   *           default: recent
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Videos retrieved successfully
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
   */

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   get:
   *     summary: Get a video by ID
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *     responses:
   *       200:
   *         description: Video retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Content'
   */

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   put:
   *     summary: Update video metadata
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 minLength: 5
   *                 maxLength: 200
   *               description:
   *                 type: string
   *                 maxLength: 500
   *               category:
   *                 type: string
   *                 enum: [technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other]
   *               tags:
   *                 oneOf:
   *                   - type: array
   *                     items: { type: string, maxLength: 50 }
   *                     maxItems: 10
   *                   - type: string
   *               visibility:
   *                 type: string
   *                 enum: [public, private, unlisted]
   *               useAdaptiveStorage:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Video updated successfully
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
   *                 data:
   *                   $ref: '#/components/schemas/Content'
   */

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   delete:
   *     summary: Delete a video
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *     responses:
   *       200:
   *         description: Video deleted successfully
   */

  /**
   * @swagger
   * /api/content/videos/{id}/stream:
   *   get:
   *     summary: Stream HLS playlist
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *       - in: query
   *         name: res
   *         schema:
   *           type: string
   *           enum: [480p, 720p, 1080p]
   *         description: Video resolution
   *     responses:
   *       200:
   *         description: HLS playlist content
   *         content:
   *           application/vnd.apple.mpegurl:
   *             schema:
   *               type: string
   */

  /**
   * @swagger
   * /api/content/videos/{id}/thumbnail:
   *   put:
   *     summary: Update video thumbnail URL
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [thumbnailUrl]
   *             properties:
   *               thumbnailUrl:
   *                 type: string
   *                 format: uri
   *     responses:
   *       200:
   *         description: Thumbnail updated successfully
   */

  /**
   * @swagger
   * /api/content/videos/{id}/transcript:
   *   get:
   *     summary: Get video transcript
   *     tags: [Video]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *     responses:
   *       200:
   *         description: Transcript data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 videoId:
   *                   type: string
   *                 transcript:
   *                   type: string
   *                   nullable: true
   *                 status:
   *                   type: string
   *                   enum: [not_available]
   */

  /**
   * @swagger
   * /api/content/videos/{id}/reprocess:
   *   post:
   *     summary: Reprocess a video
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *     responses:
   *       200:
   *         description: Video queued for reprocessing
   */

  /**
   * @swagger
   * /api/content/admin/queue-status:
   *   get:
   *     summary: Get video processing queue status
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Queue status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 queueName:
   *                   type: string
   *                 length:
   *                   type: integer
   */

  /**
   * @swagger
   * /api/content/videos/{id}/stats:
   *   get:
   *     summary: Get video statistics
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *     responses:
   *       200:
   *         description: Video statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 views:
   *                   type: integer
   *                 likes:
   *                   type: integer
   *                 comments:
   *                   type: integer
   *                 duration:
   *                   type: integer
   *                 resolution:
   *                   type: string
   *                 fileSize:
   *                   type: integer
   *                 processingStatus:
   *                   type: string
   *                 engagementRate:
   *                   type: string
   */

  /**
   * @swagger
   * /api/content/videos/{id}/publish:
   *   post:
   *     summary: Publish a video
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Video ID
   *     responses:
   *       200:
   *         description: Video published successfully
   */

  /**
   * @swagger
   * /api/content/videos/upload-status:
   *   get:
   *     summary: Get upload and processing status for current user
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Upload status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 activeJobs:
   *                   type: integer
   *                 maxConcurrentProcessing:
   *                   type: integer
   *                 queuedJobs:
   *                   type: integer
   *                 processingJobs:
   *                   type: integer
   *                 canUpload:
   *                   type: boolean
   *                 canProcessImmediately:
   *                   type: boolean
   *                 recentJobs:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       type:
   *                         type: string
   *                       status:
   *                         type: string
   *                       progress:
   *                         type: integer
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   */

  /**
   * @swagger
   * /api/uploads/videos/chunk/init:
   *   post:
   *     summary: Initialize chunked video upload
   *     tags: [Uploads]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [filename, totalSize, chunkSize, title, category]
   *             properties:
   *               filename:
   *                 type: string
   *               contentType:
   *                 type: string
   *                 example: video/mp4
   *               totalSize:
   *                 type: integer
   *                 minimum: 1
   *               chunkSize:
   *                 type: integer
   *                 minimum: 1
   *               title:
   *                 type: string
   *                 minLength: 5
   *                 maxLength: 200
   *               description:
   *                 type: string
   *                 maxLength: 500
   *               category:
   *                 type: string
   *                 enum: [technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other]
   *               tags:
   *                 oneOf:
   *                   - type: array
   *                     items: { type: string, maxLength: 50 }
   *                     maxItems: 10
   *                   - type: string
   *               visibility:
   *                 type: string
   *                 enum: [public, private, unlisted]
   *                 default: public
   *               status:
   *                 type: string
   *                 enum: [draft, published]
   *                 default: draft
   *               
   *               useAdaptiveStorage:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       200:
   *         description: Upload initialized
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
   *                     uploadId:
   *                       type: string
   */

  /**
   * @swagger
   * /api/content/videos:
   *   get:
   *     summary: Get all videos
   *     tags: [Video]
   */
  static async getAllVideos(req, res) {
    try {
      const { page = 1, limit = 20, status = 'published', visibility, sortBy = 'recent' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const userId = req.user?.id || req.user?.userId;  // Current user ID

      const where = { type: 'video' };
      
      // Handle status filtering
      if (status !== 'all') {
        where.status = status === 'draft' ? 'draft' : 'published';
      }

      console.log('Debug getAllVideos:', { userId, status, visibility, where: JSON.stringify(where) });

      // Handle visibility filtering based on user authentication and ownership
      if (where.status === 'draft') {
        // Draft content: only show to owner
        if (!userId) {
          // Anonymous user: return empty result for draft content
          where.id = 'nonexistent'; // This will return no results
        } else {
          where.authorId = userId; // Only show user's own drafts
        }
      } else if (where.status === 'published') {
        // Published content: show public and unlisted (private only for owner)
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
      }

      console.log('After status filtering:', { where: JSON.stringify(where) });

      // Apply additional visibility filter if specified
      if (visibility && visibility !== 'all') {
        if (where.OR) {
          // If we have OR conditions, filter them by the specified visibility
          where.OR = where.OR.filter(condition => {
            if (condition.visibility) {
              return condition.visibility === visibility;
            }
            return true; // Keep conditions without visibility (like authorId filters)
          });
        } else {
          // For both draft and published content, add visibility filter
          where.visibility = visibility;
        }
      }

      console.log('Final where clause:', { where: JSON.stringify(where) });

      const orderBy = sortBy === 'popular' ? { views: 'desc' } : (sortBy === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' });

      const [items, total] = await Promise.all([
        prisma.content.findMany({ where, orderBy, skip, take: Number(limit), include: {
          author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          _count: { select: { likes: true, comments: true } }
        } }),
        prisma.content.count({ where })
      ]);

      res.json({ success: true, data: items.map(ContentService.transformContentResponse), pagination: {
        page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit))
      }});
    } catch (error) {
      res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
    }
  }

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   get:
   *     summary: Get a video by ID
   *     tags: [Video]
   */
  static async getVideo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId; // Current user ID
      
      const content = await prisma.content.findUnique({
        where: { id },
        include: {
          author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          _count: { select: { likes: true, comments: true } }
        }
      });
      
      if (!content) {
        return res.status(404).json({ error: 'Video not found', code: 'NOT_FOUND' });
      }

      // Check access permissions
      if (content.status === 'draft') {
        // Draft content: only owner can view
        if (!userId || content.authorId !== userId) {
          return res.status(404).json({ error: 'Video not found', code: 'NOT_FOUND' });
        }
      } else if (content.status === 'published') {
        // Published content: check visibility
        if (content.visibility === 'private') {
          // Private content: only owner can view
          if (!userId || content.authorId !== userId) {
            return res.status(404).json({ error: 'Video not found', code: 'NOT_FOUND' });
          }
        } else if (content.visibility === 'unlisted') {
          // Unlisted content: anyone with link can view (no additional check needed)
          // This allows sharing via direct link
        } else if (content.visibility === 'public') {
          // Public content: anyone can view (no additional check needed)
        }
      }

      // Increment view count if not the owner
      if (userId !== content.authorId) {
        await prisma.content.update({
          where: { id },
          data: { views: { increment: 1 } }
        });
      }

      res.json({ success: true, data: ContentService.transformContentResponse(content) });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message, code: error.code || 'INTERNAL_ERROR' });
    }
  }

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   put:
   *     summary: Update video metadata
   *     tags: [Video]
   */
  static async updateVideo(req, res) {
    try {
      const { id } = req.params;
      const updated = await ContentService.updateContent(id, req.body, req.user?.id);
      res.json({ success: true, message: 'Video updated successfully', data: updated });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message || 'Update failed', code: error.code || 'INTERNAL_ERROR' });
    }
  }

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   delete:
   *     summary: Delete a video
   *     tags: [Video]
   */
  static async deleteVideo(req, res) {
    try {
      const { id } = req.params;
      const result = await ContentService.deleteContent(id, req.user?.id);
      res.json({ success: true, message: result.message });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message, code: error.code || 'INTERNAL_ERROR' });
    }
  }

  /**
   * @swagger
   * /api/content/videos/{id}/stream:
   *   get:
   *     summary: Stream HLS playlist
   *     tags: [Video]
   */
  static async stream(req, res) {
    try {
      const { id } = req.params;
      const { res: quality } = req.query;
      const content = await prisma.content.findUnique({ where: { id } });
      if (!content) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      if (content.type !== 'video') return res.status(400).json({ error: 'Content is not a video', code: 'INVALID_CONTENT_TYPE' });
      if (content.status !== 'published' || content.processingStatus !== 'completed') return res.status(400).json({ error: 'Video is not ready', code: 'VIDEO_NOT_READY' });

      // Generate proxy URL for HLS streaming
      const bucket = 'videos';
      const baseKey = content.metadata?.hlsMasterKey || `hls/${id}/master.m3u8`;
      const objectKey = quality ? `hls/${id}/${quality}/playlist.m3u8` : baseKey;
      
      // Redirect to proxy URL instead of streaming directly
      const proxyUrl = `/api/storage/${bucket}/${objectKey}`;
      res.redirect(proxyUrl);
    } catch (error) {
      const status = error.$metadata?.httpStatusCode === 404 ? 404 : 500;
      res.status(status).json({ error: status === 404 ? 'Playlist not found' : error.message, code: status === 404 ? 'PLAYLIST_NOT_FOUND' : 'STREAMING_PREPARATION_FAILED' });
    }
  }

  /**
   * @swagger
   * /api/content/videos/upload-status:
   *   get:
   *     summary: Get upload and processing status for current user
   *     tags: [Video]
   */
  static async uploadStatus(req, res) {
    try {
      const userId = req.user.id;
      const activeJobs = await prisma.job.count({ where: { userId, status: { in: ['PENDING', 'PROCESSING'] }, type: 'PROCESS_VIDEO' } });
      const queuedJobs = await prisma.job.count({ where: { userId, status: 'PENDING', type: 'PROCESS_VIDEO' } });
      const processingJobs = await prisma.job.count({ where: { userId, status: 'PROCESSING', type: 'PROCESS_VIDEO' } });
      const recentJobs = await prisma.job.findMany({ where: { userId, type: 'PROCESS_VIDEO' }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, type: true, status: true, progress: true, createdAt: true } });
      res.json({ success: true, data: { activeJobs, maxConcurrentProcessing: 3, queuedJobs, processingJobs, canUpload: true, canProcessImmediately: activeJobs < 3, recentJobs } });
    } catch (error) {
      res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
    }
  }


  /**
   * @swagger
   * /api/content/videos/{id}/publish:
   *   post:
   *     summary: Publish a video
   *     tags: [Video]
   */
  static async publish(req, res) {
    try {
      const { id } = req.params;
      const updated = await ContentService.publishContent(id, req.user?.id);
      res.json({ success: true, message: 'Video published successfully', data: updated });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message, code: error.code || 'INTERNAL_ERROR' });
    }
  }

  /**
   * @swagger
   * /api/content/videos/{id}/thumbnail:
   *   put:
   *     summary: Update video thumbnail URL
   *     tags: [Video]
   */
  static async updateThumbnail(req, res) {
    try {
      const { id } = req.params;
      const { thumbnailUrl } = req.body || {};
      if (!thumbnailUrl) return res.status(400).json({ error: 'thumbnailUrl is required', code: 'VALIDATION_ERROR' });
      const existing = await prisma.content.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      const metadata = { ...(existing.metadata || {}), thumbnails: [thumbnailUrl] };
      const updated = await prisma.content.update({ where: { id }, data: { metadata } });
      res.json({ success: true, message: 'Video thumbnail updated successfully', data: ContentService.transformContentResponse(updated) });
    } catch (error) {
      res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
    }
  }

  /**
   * @swagger
   * /api/content/videos/{id}/reprocess:
   *   post:
   *     summary: Reprocess a video
   *     tags: [Video]
   */
  static async reprocess(req, res) {
    try {
      const { id } = req.params;
      const content = await prisma.content.findUnique({ where: { id } });
      if (!content) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      if (content.type !== 'video') return res.status(400).json({ error: 'Not a video', code: 'INVALID_CONTENT_TYPE' });
      const sourceKey = content.metadata?.sourceObjectKey;
      if (!sourceKey) return res.status(400).json({ error: 'No source found', code: 'SOURCE_NOT_FOUND' });

      await prisma.content.update({ where: { id }, data: { status: 'draft', processingStatus: 'queued', metadata: { ...content.metadata, error: null } } });
      const queue = createVideoQueue();
      const { jobId } = await enqueueProcessVideo(queue, { contentId: id, sourceObjectKey: sourceKey, userId: content.authorId });
      res.json({ success: true, message: 'Video queued for reprocessing', data: { jobId } });
    } catch (error) {
      res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
    }
  }

  /**
   * @swagger
   * /api/content/admin/queue-status:
   *   get:
   *     summary: Get video queue status
   *     tags: [Video]
   */
  static async queueStatus(req, res) {
    try {
      // Per-user queues used; return total length across all registered queues
      const { redisQueue } = require('../../config/redis');
      const { REGISTRY_KEY } = require('../../jobs/queues/videoQueue');
      const queues = await redisQueue.sMembers(REGISTRY_KEY);
      let total = 0;
      for (const qn of queues || []) {
        // queue.length uses list_queue:<queueName>
        // reuse helper for convenience
        // eslint-disable-next-line no-await-in-loop
        total += await require('../../config/redis').queue.length(qn);
      }
      res.json({ success: true, data: { queues: queues || [], total } });
    } catch (error) {
      res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
    }
  }

  /**
   * @swagger
   * /api/content/videos/{id}/stats:
   *   get:
   *     summary: Get video stats
   *     tags: [Video]
   */
  static async stats(req, res) {
    try {
      const { id } = req.params;
      const content = await prisma.content.findUnique({ where: { id } });
      if (!content) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      const stats = {
        views: content.stats?.views || 0,
        likes: content.likesCount || 0,
        comments: content.commentsCount || 0,
        duration: content.metadata?.duration || 0,
        resolution: content.metadata?.resolution || 'unknown',
        fileSize: content.metadata?.fileSize || 0,
        processingStatus: content.processingStatus || 'unknown',
        engagementRate: ((content.likesCount + content.commentsCount) / Math.max(1, content.stats?.views || 0) * 100).toFixed(2)
      };
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
    }
  }
}

module.exports = VideoController;


