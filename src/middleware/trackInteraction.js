/**
 * Middleware to track user interactions for smart recommendations
 */

const SmartRecommendationService = require('../services/smartRecommendationService');
const { cache } = require('../config/redis');

/**
 * Track interaction and invalidate cache
 */
const trackInteraction = async (userId) => {
  if (!userId) return;
  
  try {
    // Invalidate user's interest profile cache
    const cacheKey = `user:${userId}:interest-profile`;
    await cache.del(cacheKey);
  } catch (error) {
    console.error('Error tracking interaction:', error);
  }
};

/**
 * Middleware: Track when user likes content
 */
const trackLike = (req, res, next) => {
  // Store original send
  const originalSend = res.send;
  
  res.send = function(data) {
    // Track after successful response
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      trackInteraction(req.user.userId || req.user.id).catch(err => 
        console.error('Track like error:', err)
      );
    }
    
    // Call original send
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware: Track when user comments
 */
const trackComment = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      trackInteraction(req.user.userId || req.user.id).catch(err => 
        console.error('Track comment error:', err)
      );
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware: Track when user views content (lightweight)
 */
const trackView = (req, res, next) => {
  // Views are tracked but with lower weight
  // Can be enhanced later to track in database
  next();
};

module.exports = {
  trackLike,
  trackComment,
  trackView
};
