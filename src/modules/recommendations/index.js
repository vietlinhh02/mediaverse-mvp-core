// Recommendations module entry point
// This module will handle content recommendations and discovery

module.exports = {
  recommendationRoutes: require('./routes'),
  RecommendationService: require('./recommendationService')
};
