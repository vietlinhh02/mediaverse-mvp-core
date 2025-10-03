const { body, param, query } = require('express-validator');

// Validation for personalized feed endpoint
const validatePersonalizedFeed = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('contentTypes')
    .optional()
    .isString()
    .withMessage('Content types must be a string'),
  query('includeFollowing')
    .optional()
    .isBoolean()
    .withMessage('Include following must be a boolean')
];

// Validation for trending content endpoint
const validateTrendingContent = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('timeframe')
    .optional()
    .isIn(['1h', '6h', '24h', '7d', '30d'])
    .withMessage('Timeframe must be one of: 1h, 6h, 24h, 7d, 30d'),
  query('contentTypes')
    .optional()
    .isString()
    .withMessage('Content types must be a string'),
  query('categories')
    .optional()
    .isString()
    .withMessage('Categories must be a string')
];

// Validation for search content endpoint
const validateSearchContent = [
  query('q')
    .exists()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query is required and must be 1-200 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('contentTypes')
    .optional()
    .isString()
    .withMessage('Content types must be a string'),
  query('categories')
    .optional()
    .isString()
    .withMessage('Categories must be a string'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'recent', 'popular', 'trending'])
    .withMessage('Sort by must be one of: relevance, recent, popular, trending')
];

// Validation for category content endpoint
const validateCategoryContent = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('sortBy')
    .optional()
    .isIn(['recent', 'popular', 'trending'])
    .withMessage('Sort by must be one of: recent, popular, trending'),
  query('timeframe')
    .optional()
    .isIn(['today', 'week', 'month'])
    .withMessage('Timeframe must be one of: today, week, month')
];

// Validation for similar content endpoint
const validateSimilarContent = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('excludeViewed')
    .optional()
    .isBoolean()
    .withMessage('Exclude viewed must be a boolean')
];

// Validation for interaction tracking endpoint
const validateInteractionTracking = [
  body('contentId')
    .exists()
    .isUUID()
    .withMessage('Content ID is required and must be a valid UUID'),
  body('interactionType')
    .exists()
    .isIn(['view', 'like', 'share', 'save', 'watch'])
    .withMessage('Interaction type must be one of: view, like, share, save, watch')
];

// Validation for user preferences endpoint
const validateUserPreferences = [
  body('categories')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Categories must be an array with max 20 items'),
  body('categories.*')
    .optional()
    .isString()
    .withMessage('Each category must be a string'),
  body('tags')
    .optional()
    .isArray({ max: 50 })
    .withMessage('Tags must be an array with max 50 items'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string')
];

// Validation for discovery stats endpoint
const validateDiscoveryStats = [
  query('timeframe')
    .optional()
    .isIn(['1h', '6h', '24h', '7d', '30d'])
    .withMessage('Timeframe must be one of: 1h, 6h, 24h, 7d, 30d'),
  query('categories')
    .optional()
    .isString()
    .withMessage('Categories must be a string')
];

// Validation for content ID parameter
const validateContentId = [
  param('contentId')
    .isUUID()
    .withMessage('Content ID must be a valid UUID')
];

// Validation for category parameter
const validateCategory = [
  param('category')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be 2-50 characters')
];

module.exports = {
  validatePersonalizedFeed,
  validateTrendingContent,
  validateSearchContent,
  validateCategoryContent,
  validateSimilarContent,
  validateInteractionTracking,
  validateUserPreferences,
  validateDiscoveryStats,
  validateContentId,
  validateCategory
};
