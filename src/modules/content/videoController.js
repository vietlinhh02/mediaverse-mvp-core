/**
 * @swagger
 * tags:
 *   - name: Content
 *     description: Content creation, management, and interaction endpoints
 *   - name: Videos
 *     description: Video-specific endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Content:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the content.
 *         type:
 *           type: string
 *           enum: [article, video, document, image]
 *           description: The type of content.
 *         authorId:
 *           type: string
 *         channelId:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *         visibility:
 *           type: string
 *           enum: [public, private, unlisted]
 *         category:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         publishedAt:
 *           type: string
 *           format: date-time
 *
 *     Video:
 *       allOf:
 *         - $ref: '#/components/schemas/Content'
 *         - type: object
 *           properties:
 *             metadata:
 *               type: object
 *               properties:
 *                 duration:
 *                   type: number
 *                   description: Video duration in seconds.
 *                 resolution:
 *                   type: string
 *                   description: Video resolution.
 *                 masterPlaylist:
 *                   type: string
 *                   format: uri
 *                   description: Master HLS playlist URL.
 *                 thumbnails:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Thumbnail URLs.
 *                 fileSize:
 *                   type: number
 *                   description: Original video file size in bytes.
 *       example:
 *         id: "vid_123"
 *         title: "React Tutorial for Beginners"
 *         description: "Learn React from scratch in this comprehensive tutorial"
 *         category: "programming"
 *         tags: ["react", "javascript", "tutorial"]
 *         status: "published"
 *         visibility: "public"
 *         metadata:
 *           duration: 1800
 *           resolution: "1920x1080"
 *           masterPlaylist: "/uploads/videos/segments_vid123/master.m3u8"
 *           thumbnails: ["/uploads/videos/thumb_vid123_001.jpg", "/uploads/videos/thumb_vid123_002.jpg"]
 *           fileSize: 104857600
 */

// Video controller for managing video content uploads and processing
const fs = require('fs/promises'); // Added missing import for fs
const path = require('path');
const ContentService = require('./contentService');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { authenticateToken, requireActiveUser } = require('../../middleware/auth');
const { uploadMiddleware, validateUploadedFile, handleUploadError } = require('../../middleware/upload');
const { videoQueue } = require('../../jobs/videoQueue');
const jobService = require('../media/services/jobService');
const streamingProcessor = require('../media/processors/streamingProcessor');
const NotificationService = require('../notifications/services/notificationService');
const searchService = require('../../services/searchService'); // Import the search service

class VideoController {
  /**
   * Send notifications when a video is uploaded
   */
  static async notifyVideoUpload(uploaderId, video, channelId) {
    try {
      // Get uploader info
      const uploader = await require('../../config/database').prisma.user.findUnique({
        where: { id: uploaderId },
        select: {
          id: true,
          username: true,
          profile: {
            select: { displayName: true }
          }
        }
      });

      if (!uploader) return;

      const uploaderName = uploader.profile?.displayName || uploader.username || 'Someone';
      let notificationRecipients = [];

      if (channelId) {
        // Notify channel followers
        const followers = await require('../../config/database').prisma.follow.findMany({
          where: { followeeId: channelId },
          select: { followerId: true },
          take: 1000 // Limit to prevent spam
        });

        notificationRecipients = followers.map((f) => f.followerId);
      } else {
        // Notify user's followers
        const followers = await require('../../config/database').prisma.follow.findMany({
          where: { followeeId: uploaderId },
          select: { followerId: true },
          take: 500 // Limit to prevent spam
        });

        notificationRecipients = followers.map((f) => f.followerId);
      }

      if (notificationRecipients.length === 0) return;

      // Create notifications for followers
      const notifications = notificationRecipients.map((followerId) => ({
        userId: followerId,
        type: 'upload',
        title: 'New video uploaded',
        content: `${uploaderName} uploaded a new video: "${video.title}"`,
        data: {
          videoId: video.id,
          videoTitle: video.title,
          uploaderId,
          uploaderName,
          channelId,
          contentType: 'video'
        }
      }));

      // Bulk create notifications
      await NotificationService.bulkCreateNotifications(notifications);

      console.log(` Notified ${notificationRecipients.length} followers about new video upload: ${video.title}`);
    } catch (error) {
      console.error('Failed to send video upload notifications:', error);
    }
  }

  /**
   * @swagger
   * /api/content/videos:
   *   post:
   *     summary: Upload a new video
   *     tags: [Videos]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - video
   *               - title
   *             properties:
   *               video:
   *                 type: string
   *                 format: binary
   *                 description: Video file to upload
   *               title:
   *                 type: string
   *                 description: Video title
   *               description:
   *                 type: string
   *                 description: Video description
   *               category:
   *                 type: string
   *                 description: Video category
   *               tags:
   *                 type: string
   *                 description: Video tags (comma-separated)
   *               channelId:
   *                 type: string
   *                 description: Channel ID to publish in
   *               visibility:
   *                 type: string
   *                 enum: [public, private, unlisted]
   *                 default: public
   *                 description: Video visibility
   *               useAdaptiveStorage:
   *                 type: boolean
   *                 default: true
   *                 description: Use adaptive storage (compress for storage, transcode on-demand for streaming)
   *             example:
   *               title: "React Tutorial for Beginners"
   *               description: "Learn React from scratch in this comprehensive tutorial"
   *               category: "programming"
   *               tags: "react,javascript,tutorial"
   *               channelId: "ch_123"
   *               visibility: "public"
   *               useAdaptiveStorage: true
   *     responses:
   *       201:
   *         description: Video uploaded successfully
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
   *                   example: "Video uploaded successfully. Processing will begin shortly."
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "vid_123"
   *                     title:
   *                       type: string
   *                       example: "React Tutorial for Beginners"
   *                     status:
   *                       type: string
   *                       example: "draft"
   *                     processingStatus:
   *                       type: string
   *                       example: "queued"
   *                     jobId:
   *                       type: string
   *                       example: "job_123"
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static uploadVideo = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { channelId, useAdaptiveStorage = true } = req.body;

    console.log('Received request body:', req.body);
    console.log('Received channelId:', channelId);
    console.log('Use adaptive storage:', useAdaptiveStorage);

    // Note: Upload is always allowed, but processing is limited to 3 concurrent jobs per user
    // The queue worker will handle the concurrency control

    // Validate channel ownership if channelId is provided and not empty
    if (channelId && channelId.trim() !== '') {
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

    // Check if file was uploaded
    if (!req.file) {
      throw new AppError('No video file uploaded', 400, 'NO_FILE_UPLOADED');
    }

    const videoFile = req.file;

    // Basic video metadata
    const videoData = {
      ...req.body,
      fileSize: videoFile.size,
      videoUrl: `/uploads/videos/${videoFile.filename}`,
      filename: videoFile.filename,
      originalName: videoFile.originalname,
      mimetype: videoFile.mimetype,
      uploadPath: videoFile.path,
      metadata: {
        processingStatus: 'queued'
      }
    };

    // Create video record in database
    const finalChannelId = (channelId && channelId.trim() !== '') ? channelId : null;
    const video = await ContentService.createVideo(userId, videoData, finalChannelId);

    // Create a job record in the database
    const jobPayload = {
      contentId: video.id,
      filePath: videoFile.path,
      originalName: videoFile.originalname
    };
    const dbJob = await jobService.createJob(userId, 'PROCESS_VIDEO', jobPayload);

    // Queue video processing job using Bull
    await videoQueue.add({
      ...jobPayload,
      dbJobId: dbJob.id,
      useAdaptiveStorage,
      userId // Include userId for concurrency control
    });

    // Send notifications asynchronously (don't block response)
    setImmediate(async () => {
      try {
        await VideoController.notifyVideoUpload(userId, video, finalChannelId);
      } catch (error) {
        console.error('Failed to send video upload notifications:', error);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully. Processing will begin shortly.',
      data: {
        id: video.id,
        title: video.title,
        status: video.status,
        processingStatus: 'queued',
        jobId: dbJob.id
      }
    });
  });

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   get:
   *     summary: Get video by ID
   *     tags: [Videos]
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
   *                   $ref: '#/components/schemas/Video'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const video = await ContentService.getContent(id, true); // Increment view count

    if (video.type !== 'video') {
      throw new AppError('Content is not a video', 400, 'INVALID_CONTENT_TYPE');
    }

    res.json({
      success: true,
      data: video
    });
  });

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   put:
   *     summary: Update a video
   *     tags: [Videos]
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
   *                 description: Video title
   *               description:
   *                 type: string
   *                 description: Video description
   *               category:
   *                 type: string
   *                 description: Video category
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Video tags
   *               visibility:
   *                 type: string
   *                 enum: [public, private, unlisted]
   *                 description: Video visibility
   *               useAdaptiveStorage:
   *                 type: boolean
   *                 default: true
   *                 description: Use adaptive storage (compress for storage, transcode on-demand for streaming)
   *             example:
   *               title: "Updated React Tutorial"
   *               description: "Updated version with new content"
   *               category: "programming"
   *               tags: ["react", "javascript", "tutorial", "updated"]
   *               visibility: "public"
   *               useAdaptiveStorage: true
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
   *                   example: "Video updated successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Video'
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
  static updateVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const updatedVideo = await ContentService.updateContent(id, req.body, userId);

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: updatedVideo
    });
  });

  /**
   * @swagger
   * /api/content/videos/{id}:
   *   delete:
   *     summary: Delete a video
   *     tags: [Videos]
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
   *                   example: "Video deleted successfully"
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static deleteVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    await ContentService.deleteContent(id, userId);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  });

  /**
   * @swagger
   * /api/content/videos/{id}/publish:
   *   post:
   *     summary: Publish a video
   *     tags: [Videos]
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
   *                   example: "Video published successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Video'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static publishVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const publishedVideo = await ContentService.publishContent(id, userId);

    res.json({
      success: true,
      message: 'Video published successfully',
      data: publishedVideo
    });
  });

  /**
   * @swagger
   * /api/content/users/{userId}/videos:
   *   get:
   *     summary: Get user's videos
   *     tags: [Videos]
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
   *         description: Video status filter
   *     responses:
   *       200:
   *         description: User's videos retrieved successfully
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
   *                     $ref: '#/components/schemas/Video'
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
  static getUserVideos = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20, status = 'published' } = req.query;

    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      require('../../config/database').prisma.content.findMany({
        where: {
          type: 'video',
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
          type: 'video',
          authorId: userId,
          status: status === 'all' ? undefined : status
        }
      })
    ]);

    res.json({
      success: true,
      data: videos,
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
   * /api/content/videos/search:
   *   get:
   *     summary: Search videos
   *     tags: [Videos]
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
   *                     $ref: '#/components/schemas/Video'
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
  static searchVideos = asyncHandler(async (req, res) => {
    const {
      q, limit = 20, offset = 0, sortBy = 'relevance'
    } = req.query;

    const { mapSortByToMeiliSearch } = require('../../utils/searchHelpers');

    // Combine existing filters from query with our mandatory filter
    const existingFilters = req.query.filters ? `${req.query.filters} AND ` : '';
    const filters = `${existingFilters}contentType = video`;

    // Map sortBy to MeiliSearch format
    const sort = mapSortByToMeiliSearch(sortBy);

    const searchResults = await searchService.search('content', q || '*', {
      limit: parseInt(limit),
      offset: parseInt(offset),
      filters,
      sort
    });

    // Remove 'video-' prefix from id to match database UUID format
    const transformedHits = searchResults.hits.map(hit => ({
      ...hit,
      id: hit.id.replace(/^video-/, '')
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
   * /api/content/videos/category/{category}:
   *   get:
   *     summary: Get videos by category
   *     tags: [Videos]
   *     parameters:
   *       - in: path
   *         name: category
   *         required: true
   *         schema:
   *           type: string
   *         description: Video category
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
   *                     $ref: '#/components/schemas/Video'
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
  static getVideosByCategory = asyncHandler(async (req, res) => {
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

  /**
   * @swagger
   * /api/content/videos/{id}/stream:
   *   get:
   *     summary: Stream video (HLS playlist)
   *     tags: [Videos]
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
   *         description: Resolution (optional)
   *     responses:
   *       200:
   *         description: HLS playlist
   *         content:
   *           application/vnd.apple.mpegurl:
   *             schema:
   *               type: string
   *               example: "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=480p\n/uploads/videos/segments_vid123/480p/playlist.m3u8"
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static streamVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { res: resolution } = req.query;

    const video = await ContentService.getContent(id, false);

    if (video.type !== 'video') {
      throw new AppError('Content is not a video', 400, 'INVALID_CONTENT_TYPE');
    }

    // Rely on the database as the single source of truth for processing status.
    if (video.status !== 'published' || video.metadata?.processingStatus !== 'completed') {
      throw new AppError('Video is not ready for streaming', 400, 'VIDEO_NOT_READY');
    }

    let masterPlaylistRelativePath = video.metadata?.masterPlaylist;

    // Handle adaptive storage: create HLS on-demand if not exists
    if (video.metadata?.useAdaptiveStorage && video.metadata?.compressedVideo) {
      try {
        const compressedVideoAbsPath = path.join(process.cwd(), video.metadata.compressedVideo);
        await fs.access(compressedVideoAbsPath);

        // Check if HLS already exists
        if (!masterPlaylistRelativePath || !(await fs.access(path.join(process.cwd(), masterPlaylistRelativePath)).then(() => true).catch(() => false))) {
          console.log(`Creating HLS on-demand for adaptive video ${id}`);
          const outputDir = path.dirname(compressedVideoAbsPath);
          const hlsOutputDir = path.join(outputDir, 'hls');
          const masterPlaylistAbsPath = await streamingProcessor.createHLS(compressedVideoAbsPath, hlsOutputDir);

          // Update metadata with new playlist path
          masterPlaylistRelativePath = path.relative(process.cwd(), masterPlaylistAbsPath).replace(/\\/g, '/');
          await ContentService.updateContent(id, {
            metadata: {
              ...video.metadata,
              masterPlaylist: masterPlaylistRelativePath
            }
          });
        }
      } catch (error) {
        console.error('Error in adaptive streaming:', error);
        throw new AppError('Failed to prepare video for streaming', 500, 'STREAMING_PREPARATION_FAILED');
      }
    }

    if (!masterPlaylistRelativePath) {
      // This error means processing finished but the playlist path wasn't saved correctly.
      throw new AppError('Video segments not found', 404, 'SEGMENTS_NOT_FOUND');
    }

    try {
      const masterPlaylistAbsPath = path.join(process.cwd(), masterPlaylistRelativePath);
      const hlsRootDir = path.dirname(masterPlaylistAbsPath);

      let playlistPathToSend;

      if (resolution) {
        // Serve a specific resolution's playlist
        playlistPathToSend = path.join(hlsRootDir, `${resolution}`, 'playlist.m3u8');
        console.log(`Serving playlist for video ${id}, resolution ${resolution}: ${playlistPathToSend}`);
      } else {
        // Serve the master playlist
        playlistPathToSend = masterPlaylistAbsPath;
        console.log(`Serving master playlist for video ${id}: ${playlistPathToSend}`);
      }

      // Ensure the file exists before attempting to read it
      await fs.access(playlistPathToSend);

      const playlist = await fs.readFile(playlistPathToSend, 'utf8');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(playlist);
    } catch (error) {
      console.error('Error serving playlist:', error);
      throw new AppError('Playlist not found', 404, 'PLAYLIST_NOT_FOUND');
    }
  });

  /**
   * @swagger
   * /api/content/videos/upload-status:
   *   get:
   *     summary: Get user's video upload status and limits
   *     tags: [Videos]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User's upload status
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
   *                     activeJobs:
   *                       type: number
   *                       example: 2
   *                     maxConcurrentUploads:
   *                       type: number
   *                       example: 3
   *                     canUpload:
   *                       type: boolean
   *                       example: true
   *                     recentJobs:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           type:
   *                             type: string
   *                           status:
   *                             type: string
   *                           progress:
   *                             type: number
   *                           createdAt:
   *                             type: string
   *                           format: date-time
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getUploadStatus = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    // Get active jobs count
    const activeJobsCount = await jobService.getUserActiveJobCount(userId, 'PROCESS_VIDEO');

    // Get recent jobs (last 10 jobs regardless of status)
    const recentJobs = await require('../../config/database').prisma.job.findMany({
      where: {
        userId,
        type: 'PROCESS_VIDEO'
      },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // User can always upload, but processing is limited to 3 concurrent jobs
    const canUpload = true;
    const queuedJobs = recentJobs.filter((job) => job.status === 'QUEUED').length;
    const processingJobs = recentJobs.filter((job) => job.status === 'PROCESSING').length;

    res.json({
      success: true,
      data: {
        activeJobs: activeJobsCount,
        maxConcurrentProcessing: 3,
        queuedJobs,
        processingJobs,
        canUpload, // Always true - user can upload unlimited videos
        canProcessImmediately: activeJobsCount < 3, // Whether video will be processed immediately
        recentJobs
      }
    });
  });

  /**
   * @swagger
   * /api/content/admin/queue-status:
   *   get:
   *     summary: Get video processing queue status (Admin only)
   *     tags: [Videos]
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
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     queueName:
   *                       type: string
   *                       example: "video-processing"
   *                     length:
   *                       type: number
   *                       example: 5
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getQueueStatus = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    // Check if user is admin
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to view queue status', 403, 'UNAUTHORIZED');
    }

    const { queue } = require('../../config/redis');
    const queueLength = await queue.length('video-processing');

    res.json({
      success: true,
      data: {
        queueName: 'video-processing',
        length: queueLength
      }
    });
  });

  // Reprocess video (admin/moderator only)
  static reprocessVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user is admin or moderator
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to reprocess videos', 403, 'UNAUTHORIZED');
    }

    const video = await ContentService.getContent(id, false);

    if (video.type !== 'video') {
      throw new AppError('Content is not a video', 400, 'INVALID_CONTENT_TYPE');
    }

    // Reset video status to draft and clear metadata
    const updatedVideo = await ContentService.updateContent(id, {
      status: 'draft',
      metadata: {
        ...video.metadata,
        error: null,
        duration: 0,
        resolution: 'unknown',
        thumbnailUrl: null
      }
    });

    // Queue for reprocessing if file exists
    if (video.metadata?.uploadPath) {
      const videoFile = {
        path: video.metadata.uploadPath,
        filename: video.metadata.filename,
        originalname: video.metadata.originalName,
        mimetype: video.metadata.mimetype,
        size: video.metadata.fileSize
      };

      // Create a job record in the database
      const jobPayload = {
        contentId: id,
        filePath: videoFile.path,
        originalName: videoFile.originalname
      };
      const dbJob = await jobService.createJob(req.user.id, 'PROCESS_VIDEO', jobPayload);

      // Queue video processing job using Bull
      await videoQueue.add({
        ...jobPayload,
        dbJobId: dbJob.id
      });
    }

    res.json({
      success: true,
      message: 'Video queued for reprocessing',
      data: updatedVideo
    });
  });

  // Get video statistics
  static getVideoStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const video = await ContentService.getContent(id, false);

    if (video.type !== 'video') {
      throw new AppError('Content is not a video', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check if user is the author or admin/moderator
    const canViewStats = video.authorId === userId
      || (req.user.role && ['admin', 'moderator'].includes(req.user.role));

    if (!canViewStats) {
      throw new AppError('Unauthorized to view video statistics', 403, 'UNAUTHORIZED');
    }

    const stats = {
      views: video.stats?.views || 0,
      likes: video._count?.likes || 0,
      comments: video._count?.comments || 0,
      duration: video.metadata?.duration || 0,
      resolution: video.metadata?.resolution || 'unknown',
      fileSize: video.metadata?.fileSize || 0,
      processingStatus: video.status === 'draft' ? 'processing'
        : video.status === 'published' ? 'completed'
          : video.status === 'failed' ? 'failed' : 'unknown',
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

  // Bulk update videos status
  static bulkUpdateVideos = asyncHandler(async (req, res) => {
    const { videoIds, status, visibility } = req.body;
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

    const updatedVideos = await Promise.all(
      videoIds.map((id) => ContentService.updateContent(id, updateData, userId))
    );

    res.json({
      success: true,
      message: `${updatedVideos.length} videos updated successfully`,
      data: updatedVideos
    });
  });

  // Get video transcript (placeholder for future implementation)
  static getVideoTranscript = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const video = await ContentService.getContent(id, false);

    if (video.type !== 'video') {
      throw new AppError('Content is not a video', 400, 'INVALID_CONTENT_TYPE');
    }

    // This would require speech-to-text processing in the future
    res.json({
      success: true,
      data: {
        videoId: video.id,
        transcript: null, // Placeholder
        status: 'not_available'
      }
    });
  });

  // Update video thumbnail
  static updateVideoThumbnail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const video = await ContentService.getContent(id, false);

    if (video.type !== 'video') {
      throw new AppError('Content is not a video', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check permission
    if (video.authorId !== userId) {
      const user = await require('../../config/database').prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || !['admin', 'moderator'].includes(user.role)) {
        throw new AppError('Unauthorized to update this video', 403, 'UNAUTHORIZED');
      }
    }

    const { thumbnailUrl } = req.body;

    const updatedVideo = await ContentService.updateContent(id, {
      metadata: {
        ...video.metadata,
        thumbnailUrl
      }
    });

    res.json({
      success: true,
      message: 'Video thumbnail updated successfully',
      data: updatedVideo
    });
  });

  // Get video recommendations
  static getVideoRecommendations = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const video = await ContentService.getContent(id, false);

    if (video.type !== 'video') {
      throw new AppError('Content is not a video', 400, 'INVALID_CONTENT_TYPE');
    }

    // Get videos with similar tags or category
    const recommendations = await require('../../config/database').prisma.content.findMany({
      where: {
        id: { not: id },
        type: 'video',
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        OR: [
          { category: video.category },
          { tags: { hasSome: video.tags } }
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
      take: 10
    });

    res.json({
      success: true,
      data: recommendations
    });
  });
}

module.exports = VideoController;
