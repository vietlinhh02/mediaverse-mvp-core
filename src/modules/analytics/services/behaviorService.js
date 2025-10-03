const { redisCache } = require('../../../config/redis');
const prisma = require('../../../../prisma/prismaClient');

const USER_SESSION_TTL = 3600; // 1 hour

/**
 * Tracks a generic user action and stores it in a time-series list for the user's session.
 * @param {string} userId - The ID of the user.
 * @param {object} action - The action to track (e.g., { type: 'navigation', page: '/home' }).
 */
exports.trackUserAction = async (userId, action) => {
  if (!userId || !action) return;

  const key = `user:${userId}:session:actions`;
  const actionWithTimestamp = { ...action, timestamp: Date.now() };

  // Add action to the list and set/update TTL
  await redisCache.lPush(key, JSON.stringify(actionWithTimestamp));
  await redisCache.expire(key, USER_SESSION_TTL);
};

/**
 * Records a specific interaction with a piece of content.
 * @param {string} contentId - The ID of the content.
 * @param {string} userId - The ID of the user.
 * @param {'view_start' | 'view_complete' | 'pause' | 'seek'} type - The type of interaction.
 * @param {object} metadata - Additional data (e.g., { seekTo: 120 }).
 */
exports.recordContentInteraction = async (contentId, userId, type, metadata = {}) => {
  if (!contentId || !userId || !type) return;

  const interaction = {
    userId,
    type,
    metadata,
    timestamp: Date.now()
  };

  // Store in a list specific to the content
  const key = `content:${contentId}:interactions`;
  await redisCache.lPush(key, JSON.stringify(interaction));
};

/**
 * Updates user preferences in a Redis hash.
 * This acts as a cache layer on top of the primary database.
 * @param {string} userId - The ID of the user.
 * @param {object} prefs - An object of preferences to update (e.g., { favoriteCategory: 'tech', theme: 'dark' }).
 */
exports.updateUserPreferences = async (userId, prefs) => {
  if (!userId || !prefs) return;

  const key = `user:${userId}:preferences`;

  // hSet accepts an object, making it easy to update multiple fields
  await redisCache.hSet(key, prefs);

  // Note: You might want to also persist this to your primary DB (e.g., Profile model)
};

/**
 * Generates recommendation data based on user's recent content interactions.
 * This is a simplified example that finds the most interacted-with categories.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} An object containing weighted categories for recommendations.
 */
exports.generateRecommendationData = async (userId) => {
  if (!userId) return null;

  // 1. Get user's recent interactions (e.g., from their session)
  // This is a simplified approach. A real system might look at longer-term history.
  const interactionsKey = `user:${userId}:session:actions`;
  const recentActions = await redisCache.lRange(interactionsKey, 0, 50);

  if (!recentActions || recentActions.length === 0) {
    return { weightedCategories: {}, message: 'No recent activity.' };
  }

  const contentIds = recentActions
    .map((action) => JSON.parse(action))
    .filter((action) => action.type === 'view_content' && action.contentId)
    .map((action) => action.contentId);

  if (contentIds.length === 0) {
    return { weightedCategories: {}, message: 'No recent content views.' };
  }

  // 2. Fetch categories for the interacted content
  const contents = await prisma.content.findMany({
    where: {
      id: { in: contentIds }
    },
    select: {
      category: true
    }
  });

  // 3. Calculate weights for each category
  const categoryWeights = contents.reduce((acc, content) => {
    acc[content.category] = (acc[content.category] || 0) + 1;
    return acc;
  }, {});

  // 4. Store the weighted data in Redis for the recommendation engine to use
  const recommendationsKey = `user:${userId}:recommendations`;
  await redisCache.set(recommendationsKey, JSON.stringify({ weightedCategories: categoryWeights }), { EX: 86400 }); // Cache for 24 hours

  return { weightedCategories: categoryWeights };
};
