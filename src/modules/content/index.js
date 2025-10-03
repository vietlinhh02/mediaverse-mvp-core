// Content module entry point
// This module handles content creation, management, and interactions

// Export all content-related components
module.exports = {
  // Controllers
  ArticleController: require('./articleController'),
  VideoController: require('./videoController'),
  DocumentController: require('./documentController'),
  FeedController: require('./feedController'),
  InteractionController: require('./interactionController'),

  // Services
  ContentService: require('./contentService'),

  // Validation
  ...require('./validation'),

  // Routes
  routes: require('./routes')
};
