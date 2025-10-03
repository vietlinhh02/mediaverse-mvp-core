const recommendationService = require('./recommendationService');
const searchService = require('../../services/searchService'); // Import the new search service

class RecommendationController {
  async getPersonalizedFeed(req, res) {
    try {
      const { userId } = req.user;
      const options = {
        limit: parseInt(req.query.limit , 20) || 20,
        offset: parseInt(req.query.offset , 0) || 0,
        contentTypes: req.query.contentTypes || 'video,article,document',
        includeFollowing: req.query.includeFollowing === 'true'
      };

      const feed = await recommendationService.getPersonalizedFeed(userId, options);

      res.json({
        success: true,
        data: feed,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          hasMore: feed.length === options.limit
        }
      });
    } catch (error) {
      console.error('Error in getPersonalizedFeed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async getTrendingContent(req, res) {
    try {
      const options = {
        limit: parseInt(req.query.limit) || 20,
        timeframe: req.query.timeframe || '24h',
        contentTypes: req.query.contentTypes || 'video,article,document',
        categories: req.query.categories
      };

      const content = await recommendationService.getTrendingContent(options);

      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error in getTrendingContent:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async searchContent(req, res) {
    try {
      const {
        q, limit = 20, offset = 0, filters, sortBy = 'relevance'
      } = req.query;

      const { mapSortByToMeiliSearch } = require('../utils/searchHelpers');

      // Map sortBy to MeiliSearch format
      const sort = mapSortByToMeiliSearch(sortBy);

      // Use the new searchService for searching
      const searchResults = await searchService.search('content', q, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        filters, // Pass filters directly to Meilisearch
        sort
      });

      // Remove content type prefix from id to match database UUID format
      const transformedHits = searchResults.hits.map(hit => ({
        ...hit,
        id: hit.id.replace(/^(article|video|document)-/, '')
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
    } catch (error) {
      console.error('Error in searchContent:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async getContentByCategory(req, res) {
    try {
      const options = {
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        sortBy: req.query.sortBy || 'recent',
        timeframe: req.query.timeframe
      };

      const content = await recommendationService.getContentByCategory(req.params.category, options);

      res.json({
        success: true,
        data: content,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          hasMore: content.length === options.limit
        }
      });
    } catch (error) {
      console.error('Error in getContentByCategory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async getSimilarContent(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const options = {
        limit: parseInt(req.query.limit) || 10,
        excludeViewed: req.query.excludeViewed === 'true'
      };

      const content = await recommendationService.getSimilarContent(req.params.contentId, userId, options);

      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error in getSimilarContent:', error);

      if (error.message === 'Source content not found') {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Source content not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async trackInteraction(req, res) {
    try {
      const { contentId, interactionType } = req.body;
      const { userId } = req.user;

      await recommendationService.trackInteraction(userId, contentId, interactionType);

      res.json({
        success: true,
        message: 'Interaction tracked successfully'
      });
    } catch (error) {
      console.error('Error in trackInteraction:', error);

      if (error.message === 'Content not found') {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Content not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async getUserPreferences(req, res) {
    try {
      const { userId } = req.user;
      const preferences = await recommendationService.getUserPreferences(userId);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async updateUserPreferences(req, res) {
    try {
      const { userId } = req.user;
      const preferences = req.body;

      const updatedPreferences = await recommendationService.updateUserPreferences(userId, preferences);

      res.json({
        success: true,
        data: updatedPreferences,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async getDiscoveryStats(req, res) {
    try {
      const options = {
        timeframe: req.query.timeframe || '24h',
        categories: req.query.categories
      };

      const stats = await recommendationService.getDiscoveryStats(options);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getDiscoveryStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Generate weekly digest data for user
   */
  async generateWeeklyDigest(req, res) {
    try {
      const { userId } = req.user;
      const days = parseInt(req.query.days) || 7;

      const digestData = await recommendationService.generateWeeklyDigest(userId, days);

      res.json({
        success: true,
        data: digestData
      });
    } catch (error) {
      console.error('Error generating weekly digest:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Send weekly digest email to user
   */
  async sendWeeklyDigest(req, res) {
    try {
      const { userId } = req.user;

      const result = await recommendationService.sendWeeklyDigest(userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error sending weekly digest:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Send weekly digests to all eligible users (admin only)
   */
  async sendBulkWeeklyDigests(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const result = await recommendationService.sendBulkWeeklyDigests();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error sending bulk weekly digests:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = new RecommendationController();
