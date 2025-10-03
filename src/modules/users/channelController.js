// Channel controller for channel management
const UserService = require('./userService');
const { logger } = require('../../middleware/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     Channel:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Channel ID
 *         ownerId:
 *           type: string
 *           description: Owner user ID
 *         name:
 *           type: string
 *           description: Channel name
 *         description:
 *           type: string
 *           description: Channel description
 *         category:
 *           type: string
 *           enum: [technology, education, entertainment, business, health, lifestyle, other]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         subscriberCount:
 *           type: integer
 *         contentCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         owner:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             username:
 *               type: string
 *             profile:
 *               type: object
 *               properties:
 *                 displayName:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 */

const userService = new UserService();

class ChannelController {
  /**
   * @swagger
   * /api/users/channels:
   *   post:
   *     summary: Create a new channel
   *     tags: [Channels]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - category
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 100
   *               description:
   *                 type: string
   *                 maxLength: 500
   *               category:
   *                 type: string
   *                 enum: [technology, education, entertainment, business, health, lifestyle, other]
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                   maxLength: 50
   *                 maxItems: 10
   *           examples:
   *             tech_channel:
   *               summary: Create a technology channel
   *               value:
   *                 name: "Tech Talk Daily"
   *                 description: "Daily discussions about latest technology trends and innovations"
   *                 category: "technology"
   *                 tags: ["programming", "ai", "web-development"]
   *             education_channel:
   *               summary: Create an education channel
   *               value:
   *                 name: "Learn with Fun"
   *                 description: "Making learning enjoyable with interactive content"
   *                 category: "education"
   *                 tags: ["math", "science", "learning"]
   *             business_channel:
   *               summary: Create a business channel
   *               value:
   *                 name: "Business Insights"
   *                 description: "Insights and tips for entrepreneurs and business professionals"
   *                 category: "business"
   *                 tags: ["startup", "marketing", "finance"]
   *     responses:
   *       201:
   *         description: Channel created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Channel'
   *                 message:
   *                   type: string
   *             examples:
   *               success_response:
   *                 value:
   *                   success: true
   *                   data:
   *                     id: "cmftoa3o000012uf4ue6jp4hg"
   *                     ownerId: "cmftoa3o000012uf4ue6jp4hg"
   *                     name: "Tech Talk Daily"
   *                     description: "Daily discussions about latest technology trends and innovations"
   *                     category: "technology"
   *                     tags: ["programming", "ai", "web-development"]
   *                     subscriberCount: 0
   *                     contentCount: 0
   *                     createdAt: "2024-09-21T10:30:00Z"
   *                     updatedAt: "2024-09-21T10:30:00Z"
   *                     owner:
   *                       id: "cmftoa3o000012uf4ue6jp4hg"
   *                       username: "techguru"
   *                       profile:
   *                         displayName: "Tech Guru"
   *                         avatarUrl: "https://example.com/avatar.jpg"
   *                   message: "Channel created successfully"
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication required
   *       409:
   *         description: Channel name already exists
   */
  // POST /api/channels - Create a new channel
  async createChannel(req, res) {
    try {
      const { userId } = req.user;
      const channelData = req.body;

      // Validate required fields
      if (!channelData.name || !channelData.category) {
        return res.status(400).json({
          error: 'Name and category are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validate category
      const validCategories = ['technology', 'education', 'entertainment', 'business', 'health', 'lifestyle', 'other'];
      if (!validCategories.includes(channelData.category)) {
        return res.status(400).json({
          error: 'Invalid category',
          code: 'INVALID_CATEGORY',
          validCategories
        });
      }

      const channel = await userService.createChannel(userId, channelData);

      logger.info({
        message: 'Channel created successfully',
        userId,
        channelId: channel.id,
        channelName: channel.name
      });

      res.status(201).json({
        success: true,
        data: channel,
        message: 'Channel created successfully'
      });
    } catch (error) {
      logger.error({
        message: 'Create channel error',
        error: error.message,
        userId: req.user?.userId,
        channelData: req.body
      });

      if (error.message === 'Channel name already exists') {
        return res.status(409).json({
          error: error.message,
          code: 'CHANNEL_NAME_EXISTS'
        });
      }

      res.status(500).json({
        error: 'Failed to create channel',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/channels/{id}:
   *   put:
   *     summary: Update channel
   *     tags: [Channels]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Channel ID
   *         example: "cmftoa3o000012uf4ue6jp4hg"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 100
   *               description:
   *                 type: string
   *                 maxLength: 500
   *               category:
   *                 type: string
   *                 enum: [technology, education, entertainment, business, health, lifestyle, other]
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                   maxLength: 50
   *                 maxItems: 10
   *               bannerImageUrl:
   *                 type: string
   *                 format: url
   *                 description: "URL for the channel's banner image"
   *               trailerContentId:
   *                 type: string
   *                 description: "ID of the content to be used as a channel trailer"
   *               featuredContent:
   *                 type: object
   *                 description: "JSON object for featured content sections"
   *           examples:
   *             update_name_description:
   *               summary: Update channel name and description
   *               value:
   *                 name: "Advanced Tech Talks"
   *                 description: "Deep dive into advanced technology topics and cutting-edge innovations"
   *             update_category_tags:
   *               summary: Update category and tags
   *               value:
   *                 category: "education"
   *                 tags: ["programming", "ai", "machine-learning", "data-science"]
   *             update_partial:
   *               summary: Partial update - only description
   *               value:
   *                 description: "Updated channel description with more details"
   *     responses:
   *       200:
   *         description: Channel updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Channel'
   *                 message:
   *                   type: string
   *             examples:
   *               update_success:
   *                 value:
   *                   success: true
   *                   data:
   *                     id: "cmftoa3o000012uf4ue6jp4hg"
   *                     ownerId: "cmftoa3o000012uf4ue6jp4hg"
   *                     name: "Advanced Tech Talks"
   *                     description: "Deep dive into advanced technology topics and cutting-edge innovations"
   *                     category: "technology"
   *                     tags: ["programming", "ai", "machine-learning", "data-science"]
   *                     subscriberCount: 25
   *                     contentCount: 15
   *                     createdAt: "2024-09-21T10:30:00Z"
   *                     updatedAt: "2024-09-21T11:45:00Z"
   *                     owner:
   *                       id: "cmftoa3o000012uf4ue6jp4hg"
   *                       username: "techguru"
   *                       profile:
   *                         displayName: "Tech Guru"
   *                         avatarUrl: "https://example.com/avatar.jpg"
   *                   message: "Channel updated successfully"
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to update this channel
   *       404:
   *         description: Channel not found
   */
  // PUT /api/channels/:id - Update channel
  async updateChannel(req, res) {
    try {
      const channelId = req.params.id;
      const { userId } = req.user;
      const updates = req.body;

      // Validate featuredContent if it is provided and is not a valid object
      if (updates.featuredContent && typeof updates.featuredContent !== 'object') {
        return res.status(400).json({
          error: 'featuredContent must be a valid JSON object',
          code: 'INVALID_FEATURED_CONTENT'
        });
      }

      // Validate category if provided
      if (updates.category) {
        const validCategories = ['technology', 'education', 'entertainment', 'business', 'health', 'lifestyle', 'other'];
        if (!validCategories.includes(updates.category)) {
          return res.status(400).json({
            error: 'Invalid category',
            code: 'INVALID_CATEGORY',
            validCategories
          });
        }
      }

      const channel = await userService.updateChannel(channelId, userId, updates);

      logger.info({
        message: 'Channel updated successfully',
        userId,
        channelId,
        updates: Object.keys(updates)
      });

      res.json({
        success: true,
        data: channel,
        message: 'Channel updated successfully'
      });
    } catch (error) {
      logger.error({
        message: 'Update channel error',
        error: error.message,
        userId: req.user?.userId,
        channelId: req.params.id,
        updates: req.body
      });

      if (error.message === 'Channel not found') {
        return res.status(404).json({
          error: error.message,
          code: 'CHANNEL_NOT_FOUND'
        });
      }

      if (error.message === 'Not authorized to update this channel') {
        return res.status(403).json({
          error: error.message,
          code: 'UNAUTHORIZED'
        });
      }

      res.status(500).json({
        error: 'Failed to update channel',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/channels/{id}/banner:
   *   post:
   *     summary: Upload channel banner
   *     tags: [Channels]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Channel ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               banner:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Banner uploaded successfully
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
   *                     bannerImageUrl:
   *                       type: string
   *       400:
   *         description: No file uploaded
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized
   *       404:
   *         description: Channel not found
   */
  async uploadChannelBanner(req, res) {
    try {
      const channelId = req.params.id;
      const { userId } = req.user;

      if (!req.file) {
        return res.status(400).json({
          error: 'No banner image uploaded',
          code: 'MISSING_FILE'
        });
      }

      const result = await userService.uploadChannelBanner(channelId, userId, req.file);

      logger.info({
        message: 'Channel banner uploaded successfully',
        userId,
        channelId
      });

      res.json({
        success: true,
        data: {
          bannerImageUrl: result.bannerImageUrl
        },
        message: 'Channel banner uploaded successfully'
      });
    } catch (error) {
      logger.error({
        message: 'Upload channel banner error',
        error: error.message,
        userId: req.user?.userId,
        channelId: req.params.id
      });

      if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message, code: 'UNAUTHORIZED' });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message, code: 'CHANNEL_NOT_FOUND' });
      }

      res.status(500).json({
        error: 'Failed to upload channel banner',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/channels/{id}:
   *   get:
   *     summary: Get channel by ID
   *     tags: [Channels]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Channel ID
   *         example: "cmftoa3o000012uf4ue6jp4hg"
   *     responses:
   *       200:
   *         description: Channel retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Channel'
   *             examples:
   *               channel_detail:
   *                 value:
   *                   success: true
   *                   data:
   *                     id: "cmftoa3o000012uf4ue6jp4hg"
   *                     ownerId: "cmftoa3o000012uf4ue6jp4hg"
   *                     name: "Tech Talk Daily"
   *                     description: "Daily discussions about latest technology trends and innovations"
   *                     category: "technology"
   *                     tags: ["programming", "ai", "web-development"]
   *                     subscriberCount: 1250
   *                     contentCount: 89
   *                     createdAt: "2024-09-21T10:30:00Z"
   *                     updatedAt: "2024-09-21T15:20:00Z"
   *                     owner:
   *                       id: "cmftoa3o000012uf4ue6jp4hg"
   *                       username: "techguru"
   *                       profile:
   *                         displayName: "Tech Guru"
   *                         avatarUrl: "https://example.com/avatar.jpg"
   *       404:
   *         description: Channel not found
   */
  // GET /api/channels/:id - Get channel by ID
  async getChannel(req, res) {
    try {
      const channelId = req.params.id;

      const channel = await userService.getChannel(channelId);

      res.json({
        success: true,
        data: channel
      });
    } catch (error) {
      logger.error({
        message: 'Get channel error',
        error: error.message,
        channelId: req.params.id,
        userId: req.user?.userId
      });

      if (error.message === 'Channel not found') {
        return res.status(404).json({
          error: error.message,
          code: 'CHANNEL_NOT_FOUND'
        });
      }

      res.status(500).json({
        error: 'Failed to get channel',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/{id}/channels:
   *   get:
   *     summary: Get user's channels
   *     tags: [Channels]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *         example: "cmftoa3o000012uf4ue6jp4hg"
   *     responses:
   *       200:
   *         description: User channels retrieved successfully
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
   *                     channels:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Channel'
   *                     total:
   *                       type: integer
   *             examples:
   *               user_channels:
   *                 value:
   *                   success: true
   *                   data:
   *                     channels:
   *                       - id: "cmftoa3o000012uf4ue6jp4hg"
   *                         ownerId: "cmftoa3o000012uf4ue6jp4hg"
   *                         name: "Tech Talk Daily"
   *                         description: "Daily discussions about latest technology trends and innovations"
   *                         category: "technology"
   *                         tags: ["programming", "ai", "web-development"]
   *                         subscriberCount: 1250
   *                         contentCount: 89
   *                         createdAt: "2024-09-21T10:30:00Z"
   *                         updatedAt: "2024-09-21T15:20:00Z"
   *                         owner:
   *                           id: "cmftoa3o000012uf4ue6jp4hg"
   *                           username: "techguru"
   *                           profile:
   *                             displayName: "Tech Guru"
   *                             avatarUrl: "https://example.com/avatar.jpg"
   *                       - id: "cmftoa3o000013uf4ue6jp4hi"
   *                         ownerId: "cmftoa3o000012uf4ue6jp4hg"
   *                         name: "Business Insights"
   *                         description: "Insights and tips for entrepreneurs and business professionals"
   *                         category: "business"
   *                         tags: ["startup", "marketing", "finance"]
   *                         subscriberCount: 890
   *                         contentCount: 45
   *                         createdAt: "2024-09-20T08:15:00Z"
   *                         updatedAt: "2024-09-21T12:00:00Z"
   *                         owner:
   *                           id: "cmftoa3o000012uf4ue6jp4hg"
   *                           username: "techguru"
   *                           profile:
   *                             displayName: "Tech Guru"
   *                             avatarUrl: "https://example.com/avatar.jpg"
   *                     total: 2
   */
  // GET /api/users/:id/channels - Get user's channels
  async getUserChannels(req, res) {
    try {
      const userId = req.params.id;

      const channels = await userService.getUserChannels(userId);

      res.json({
        success: true,
        data: {
          channels,
          total: channels.length
        }
      });
    } catch (error) {
      logger.error({
        message: 'Get user channels error',
        error: error.message,
        userId: req.params.id,
        requesterId: req.user?.userId
      });

      res.status(500).json({
        error: 'Failed to get user channels',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/channels/{id}:
   *   delete:
   *     summary: Delete channel
   *     tags: [Channels]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Channel ID
   *         example: "cmftoa3o000012uf4ue6jp4hg"
   *     responses:
   *       200:
   *         description: Channel deleted successfully
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
   *             examples:
   *               delete_success:
   *                 value:
   *                   success: true
   *                   data:
   *                     success: true
   *                     message: "Channel deleted successfully"
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to delete this channel
   *       404:
   *         description: Channel not found
   */
  // DELETE /api/channels/:id - Delete channel
  async deleteChannel(req, res) {
    try {
      const channelId = req.params.id;
      const { userId } = req.user;

      const result = await userService.deleteChannel(channelId, userId);

      logger.info({
        message: 'Channel deleted successfully',
        userId,
        channelId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({
        message: 'Delete channel error',
        error: error.message,
        userId: req.user?.userId,
        channelId: req.params.id
      });

      if (error.message === 'Channel not found') {
        return res.status(404).json({
          error: error.message,
          code: 'CHANNEL_NOT_FOUND'
        });
      }

      if (error.message === 'Not authorized to delete this channel') {
        return res.status(403).json({
          error: error.message,
          code: 'UNAUTHORIZED'
        });
      }

      res.status(500).json({
        error: 'Failed to delete channel',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/channels:
   *   get:
   *     summary: Get all channels with filtering
   *     tags: [Channels]
   *     parameters:
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
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *           enum: [technology, education, entertainment, business, health, lifestyle, other]
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *           maxLength: 100
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [createdAt, updatedAt, name, subscribers]
   *           default: createdAt
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: Channels retrieved successfully
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
   *                     channels:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Channel'
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
   *             examples:
   *               channels_list:
   *                 value:
   *                   success: true
   *                   data:
   *                     channels:
   *                       - id: "cmftoa3o000012uf4ue6jp4hg"
   *                         ownerId: "cmftoa3o000012uf4ue6jp4hg"
   *                         name: "Tech Talk Daily"
   *                         description: "Daily discussions about latest technology trends and innovations"
   *                         category: "technology"
   *                         tags: ["programming", "ai", "web-development"]
   *                         subscriberCount: 1250
   *                         contentCount: 89
   *                         createdAt: "2024-09-21T10:30:00Z"
   *                         updatedAt: "2024-09-21T15:20:00Z"
   *                         owner:
   *                           id: "cmftoa3o000012uf4ue6jp4hg"
   *                           username: "techguru"
   *                           profile:
   *                             displayName: "Tech Guru"
   *                             avatarUrl: "https://example.com/avatar.jpg"
   *                       - id: "cmftoa3o000013uf4ue6jp4hi"
   *                         ownerId: "cmftoa3o000013uf4ue6jp4hj"
   *                         name: "Learn with Fun"
   *                         description: "Making learning enjoyable with interactive content"
   *                         category: "education"
   *                         tags: ["math", "science", "learning"]
   *                         subscriberCount: 890
   *                         contentCount: 67
   *                         createdAt: "2024-09-20T08:15:00Z"
   *                         updatedAt: "2024-09-21T12:00:00Z"
   *                         owner:
   *                           id: "cmftoa3o000013uf4ue6jp4hj"
   *                           username: "eduteacher"
   *                           profile:
   *                             displayName: "Education Teacher"
   *                             avatarUrl: "https://example.com/avatar2.jpg"
   *                       - id: "cmftoa3o000014uf4ue6jp4hk"
   *                         ownerId: "cmftoa3o000014uf4ue6jp4hl"
   *                         name: "Business Insights"
   *                         description: "Insights and tips for entrepreneurs and business professionals"
   *                         category: "business"
   *                         tags: ["startup", "marketing", "finance"]
   *                         subscriberCount: 650
   *                         contentCount: 45
   *                         createdAt: "2024-09-19T14:20:00Z"
   *                         updatedAt: "2024-09-21T09:30:00Z"
   *                         owner:
   *                           id: "cmftoa3o000014uf4ue6jp4hl"
   *                           username: "businessman"
   *                           profile:
   *                             displayName: "Business Expert"
   *                             avatarUrl: "https://example.com/avatar3.jpg"
   *                     pagination:
   *                       page: 1
   *                       limit: 20
   *                       total: 3
   *                       pages: 1
   */
  // GET /api/channels - Get all channels with pagination and filtering
  async getChannels(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pagination = {
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 50)
      };

      const { prisma } = require('../../config/database');

      // Build where clause
      const where = {};
      if (category) {
        where.category = category;
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Build order by clause
      const orderBy = {};
      if (sortBy === 'subscribers') {
        orderBy.subscriberCount = sortOrder;
      } else {
        orderBy[sortBy] = sortOrder;
      }

      const [channels, total] = await Promise.all([
        prisma.channel.findMany({
          where,
          include: {
            owner: {
              include: {
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true
                  }
                }
              }
            },
            _count: {
              select: { content: true }
            }
          },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy
        }),
        prisma.channel.count({ where })
      ]);

      const result = {
        channels: channels.map((channel) => ({
          ...channel,
          contentCount: channel._count.content
        })),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit)
        }
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({
        message: 'Get channels error',
        error: error.message,
        query: req.query,
        userId: req.user?.userId
      });

      res.status(500).json({
        error: 'Failed to get channels',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = ChannelController;
