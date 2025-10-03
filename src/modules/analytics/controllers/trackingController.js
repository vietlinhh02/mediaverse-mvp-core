const { redisCache } = require('../../../config/redis');
const prisma = require('../../../../prisma/prismaClient');

/**
 * @desc    Tracks a view event for a piece of content.
 * @route   POST /api/analytics/view
 * @access  Public
 */
exports.trackView = async (req, res, next) => {
  const {
    contentId, userId, duration, source
  } = req.body;

  if (!contentId) {
    return res.status(400).json({ message: 'contentId is required' });
  }

  try {
    const viewEvent = {
      contentId,
      userId, // Can be null for anonymous users
      duration, // in seconds
      source, // e.g., 'recommendation', 'search', 'direct'
      timestamp: Date.now()
    };

    // Push to a Redis list for batch processing later
    await redisCache.lPush('analytics:views', JSON.stringify(viewEvent));

    // Increment a counter in a hash for real-time stats
    await redisCache.hIncrBy(`content:${contentId}:stats`, 'views', 1);

    res.status(202).json({ message: 'View event received' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tracks an engagement event (like, comment, share).
 * @route   POST /api/analytics/engagement
 * @access  Public
 */
exports.trackEngagement = async (req, res, next) => {
  const { contentId, userId, type } = req.body; // type: 'like', 'comment', 'share'

  if (!contentId || !type) {
    return res.status(400).json({ message: 'contentId and type are required' });
  }

  const validTypes = ['likes', 'comments', 'shares'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid engagement type' });
  }

  try {
    // Increment a counter in a hash for real-time stats
    await redisCache.hIncrBy(`content:${contentId}:stats`, type, 1);

    res.status(200).json({ message: 'Engagement event tracked' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregated stats for a piece of content.
 * @route   GET /api/analytics/content/:id/stats
 * @access  Public
 */
exports.getContentStats = async (req, res, next) => {
  const { id: contentId } = req.params;

  try {
    const redisKey = `content:${contentId}:stats`;
    let stats = await redisCache.hGetAll(redisKey);

    // If stats are not in Redis, fetch from DB and cache it
    if (!stats || Object.keys(stats).length === 0) {
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { views: true }
      });

      const likes = await prisma.like.count({ where: { contentId } });
      const comments = await prisma.comment.count({ where: { contentId } });
      const shares = await prisma.share.count({ where: { contentId } });

      if (!content) {
        return res.status(404).json({ message: 'Content not found' });
      }

      stats = {
        views: content.views.toString(),
        likes: likes.toString(),
        comments: comments.toString(),
        shares: shares.toString()
      };

      // Cache the stats in Redis for future requests
      await redisCache.hSet(redisKey, stats);
    }

    // Convert string values from Redis to numbers
    const numericStats = Object.entries(stats).reduce((acc, [key, value]) => {
      acc[key] = parseInt(value, 10);
      return acc;
    }, {});

    res.status(200).json(numericStats);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tracks content view duration heartbeat.
 * @route   POST /api/analytics/heartbeat
 * @access  Public
 */
exports.trackHeartbeat = async (req, res, next) => {
  const {
    contentId, userId, duration, referrer, userAgent
  } = req.body;

  if (!contentId) {
    return res.status(400).json({ message: 'contentId is required' });
  }

  // Mock service to get country from IP
  const getCountryFromIp = (ip) => {
    // In a real application, you would use a service like MaxMind GeoIP
    console.log(`IP address received: ${ip}`);
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      return 'Local';
    }
    // For demonstration, returning a mock country
    return 'US';
  };

  try {
    const ipAddress = req.ip;
    const country = getCountryFromIp(ipAddress);

    await prisma.contentView.create({
      data: {
        contentId,
        userId,
        duration,
        referrer,
        userAgent,
        ipAddress,
        country,
        platform: req.headers['x-platform'] || 'web' // e.g., 'web', 'mobile-ios', 'mobile-android'
      }
    });

    res.status(202).json({ message: 'Heartbeat received' });
  } catch (error) {
    next(error);
  }
};
