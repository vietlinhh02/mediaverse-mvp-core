// Content module routes
const express = require('express');

const router = express.Router();

// Import controllers
const ArticleController = require('./articleController');
const { DocumentController, FolderController } = require('./documentController');
const FeedController = require('./feedController');
const InteractionController = require('./interactionController');

// Import middleware
const { authenticateToken, requireActiveUser } = require('../../middleware/auth');
const { uploadMiddleware, handleUploadError } = require('../../middleware/upload');
const { trackLike, trackComment } = require('../../middleware/trackInteraction');

// Import validation middleware
const {
  validateArticleCreate,
  validateArticleUpdate,
  validateDocumentUpload,
  validateCommentCreate,
  validateCommentUpdate,
  validateCommentQuery,
  validateContentSearch,
  validateFeed,
  validateCategoryContent,
  validateContentId,
  validateCategory,
  validateShareContent,
  validateExtractText,
  validateGenerateDownloadLink,
  validateBulkMoveDocuments,
  validateCreateFolder,
  validateGetFolders,
  validateFolderDocuments
} = require('./validation');

// Article routes
router.post(
  '/articles',
  authenticateToken,
  requireActiveUser,
  uploadMiddleware.contentFilesMemory, // memory storage
  handleUploadError,
  validateArticleCreate,
  ArticleController.createArticle
);

router.get(
  '/articles',
  ArticleController.getAllArticles
);

router.get(
  '/articles/search',
  validateContentSearch,
  ArticleController.searchArticles
);

router.get(
  '/articles/category/:category',
  validateCategory, // Validate the :category parameter
  ArticleController.getArticlesByCategory
);

router.get(
  '/articles/:id',
  validateContentId,
  ArticleController.getArticle
);

router.get(
  '/articles/slug/:slug',
  ArticleController.getArticleBySlug
);

router.put(
  '/articles/:id',
  authenticateToken,
  requireActiveUser,
  uploadMiddleware.contentFilesMemory, // memory storage
  handleUploadError,
  validateContentId,
  validateArticleUpdate,
  ArticleController.updateArticle
);

// Upload featured image for article
router.post(
  '/articles/:id/featured-image',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  uploadMiddleware.imageMemory,
  handleUploadError,
  ArticleController.uploadFeaturedImage
);

router.delete(
  '/articles/:id',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  ArticleController.deleteArticle
);

router.post(
  '/articles/:id/publish',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  ArticleController.publishArticle
);

router.get(
  '/users/:userId/articles',
  ArticleController.getUserArticles
);

router.get(
  '/articles/:id/stats',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  ArticleController.getArticleStats
);

router.get(
  '/articles/:id/related',
  validateContentId,
  ArticleController.getRelatedArticles
);

router.put(
  '/articles/bulk-update',
  authenticateToken,
  requireActiveUser,
  ArticleController.bulkUpdateArticles
);

router.get(
  '/articles/:id/revisions',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  ArticleController.getArticleRevisions
);

// Video routes
const VideoController = require('./videoController');
const { optionalAuth, requireModerator } = require('../../middleware/auth');

// Listing
router.get(
  '/videos',
  optionalAuth,
  VideoController.getAllVideos
);

// Get
router.get(
  '/videos/:id',
  optionalAuth,
  validateContentId,
  VideoController.getVideo
);

// Update
router.put(
  '/videos/:id',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  VideoController.updateVideo
);

// Delete
router.delete(
  '/videos/:id',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  VideoController.deleteVideo
);

// Stream
router.get(
  '/videos/:id/stream',
  optionalAuth,
  validateContentId,
  VideoController.stream
);

// Reprocess (admin/moderator)
router.post(
  '/videos/:id/reprocess',
  authenticateToken,
  requireModerator,
  validateContentId,
  VideoController.reprocess
);

// Queue status (admin/moderator)
router.get(
  '/admin/queue-status',
  authenticateToken,
  requireModerator,
  VideoController.queueStatus
);

// Stats
router.get(
  '/videos/:id/stats',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  VideoController.stats
);

// Placeholder transcript endpoint
router.get(
  '/videos/:id/transcript',
  validateContentId,
  async (req, res) => res.json({ success: true, data: { videoId: req.params.id, transcript: null, status: 'not_available' } })
);

// Publish video
router.post(
  '/videos/:id/publish',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  VideoController.publish
);

// Update video thumbnail
router.put(
  '/videos/:id/thumbnail',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  VideoController.updateThumbnail
);

// Upload status for current user
router.get(
  '/videos/upload-status',
  authenticateToken,
  requireActiveUser,
  VideoController.uploadStatus
);

// Document routes
router.post(
  '/documents',
  authenticateToken,
  requireActiveUser,
  uploadMiddleware.documentMemory,
  handleUploadError,
  validateDocumentUpload,
  DocumentController.uploadDocument
);

router.get(
  '/documents',
  DocumentController.getAllDocuments
);

router.get(
  '/documents/search',
  validateContentSearch,
  DocumentController.searchDocuments
);

router.get(
  '/documents/category/:category',
  validateCategoryContent,
  DocumentController.getDocumentsByCategory
);

router.get(
  '/documents/:id',
  validateContentId,
  DocumentController.getDocument
);

router.get(
  '/documents/:id/preview',
  validateContentId,
  DocumentController.getDocumentPreview
);

router.get(
  '/documents/:id/download',
  authenticateToken,
  validateContentId,
  DocumentController.downloadDocument
);

router.put(
  '/documents/:id',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  DocumentController.updateDocument
);

router.delete(
  '/documents/:id',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  DocumentController.deleteDocument
);

router.post(
  '/documents/:id/publish',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  DocumentController.publishDocument
);

router.get(
  '/users/:userId/documents',
  DocumentController.getUserDocuments
);

router.get(
  '/documents/:id/processing-status',
  authenticateToken,
  validateContentId,
  DocumentController.getDocumentProcessingStatus
);

router.post(
  '/documents/:id/reprocess',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  DocumentController.reprocessDocument
);

router.get(
  '/documents/:id/stats',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  DocumentController.getDocumentStats
);

router.put(
  '/documents/bulk-update',
  authenticateToken,
  requireActiveUser,
  DocumentController.bulkUpdateDocuments
);

router.get(
  '/documents/:id/search',
  validateContentId,
  DocumentController.searchInDocument
);

router.get(
  '/documents/:id/recommendations',
  validateContentId,
  DocumentController.getDocumentRecommendations
);

// New document endpoints
router.get(
  '/documents/:id/extract-text',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  validateExtractText,
  DocumentController.extractText
);

router.post(
  '/documents/:id/download-link',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  validateGenerateDownloadLink,
  DocumentController.generateDownloadLink
);

router.put(
  '/documents/bulk-move',
  authenticateToken,
  requireActiveUser,
  validateBulkMoveDocuments,
  DocumentController.bulkMoveDocuments
);

// Folder routes
router.post(
  '/folders',
  authenticateToken,
  requireActiveUser,
  validateCreateFolder,
  FolderController.createFolder
);

router.get(
  '/folders',
  authenticateToken,
  requireActiveUser,
  validateGetFolders,
  FolderController.getFolders
);

router.get(
  '/folders/:folderId/documents',
  authenticateToken,
  requireActiveUser,
  validateFolderDocuments,
  FolderController.getFolderDocuments
);

// Feed routes
router.get(
  '/feed/personalized',
  authenticateToken,
  requireActiveUser,
  validateFeed,
  FeedController.getPersonalizedFeed
);

router.get(
  '/feed/explore',
  FeedController.getExploreFeed
);

router.get(
  '/feed/general',
  validateFeed,
  FeedController.getGeneralFeed
);

router.get(
  '/feed/recommendations',
  authenticateToken,
  requireActiveUser,
  FeedController.getRecommendations
);

router.get(
  '/feed/featured',
  FeedController.getFeaturedContent
);

router.get(
  '/feed/timeline',
  validateFeed,
  FeedController.getTimelineFeed
);

router.get(
  '/feed/popular',
  FeedController.getPopularContent
);

router.get(
  '/feed/trending',
  FeedController.getTrendingContent
);

router.get(
  '/feed/category/:category',
  validateCategoryContent,
  FeedController.getContentByCategory
);

// Clear cache route (admin only)
router.post(
  '/feed/clear-cache',
  authenticateToken,
  requireActiveUser,
  FeedController.clearFeedCache
);

// Interaction routes (likes and comments)
router.post(
  '/:id/like',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  trackLike,
  InteractionController.likeContent
);

router.delete(
  '/:id/like',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  InteractionController.unlikeContent
);

router.get(
  '/:id/like-status',
  authenticateToken,
  validateContentId,
  InteractionController.checkLikeStatus
);

router.get(
  '/:id/like/status',
  authenticateToken,
  validateContentId,
  InteractionController.checkLikeStatus
);

router.get(
  '/:id/likes',
  validateContentId,
  InteractionController.getContentLikes
);

router.post(
  '/:id/comments',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  validateCommentCreate,
  trackComment,
  InteractionController.createComment
);

router.put(
  '/comments/:commentId',
  authenticateToken,
  requireActiveUser,
  validateCommentUpdate,
  InteractionController.updateComment
);

router.delete(
  '/comments/:commentId',
  authenticateToken,
  requireActiveUser,
  InteractionController.deleteComment
);

router.get(
  '/:id/comments',
  validateContentId,
  validateCommentQuery,
  InteractionController.getContentComments
);

router.get(
  '/comments/:commentId/replies',
  InteractionController.getCommentReplies
);

router.post(
  '/comments/:commentId/like',
  authenticateToken,
  requireActiveUser,
  trackLike,
  InteractionController.likeComment
);

router.delete(
  '/comments/:commentId/like',
  authenticateToken,
  requireActiveUser,
  InteractionController.unlikeComment
);

// Content sharing routes
router.post(
  '/:id/share',
  authenticateToken,
  requireActiveUser,
  validateContentId,
  validateShareContent,
  InteractionController.shareContent
);

router.get(
  '/:id/shares',
  validateContentId,
  InteractionController.getContentShares
);

// Hashtag routes
router.get(
  '/hashtags',
  InteractionController.getTrendingHashtags
);

router.get(
  '/hashtags/:hashtag/content',
  InteractionController.getContentByHashtag
);


// Admin routes removed - will be rebuilt from scratch

module.exports = router;
