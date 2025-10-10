// User module routes
const express = require('express');
const UserController = require('./userController');
const FollowController = require('./followController');
const PreferencesController = require('./preferencesController');
const ConnectedAccountsController = require('./connectedAccountsController');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const { uploadMiddleware, handleUploadError } = require('../../middleware/upload');
const {
  validateProfileUpdate,
  
  validateSearch,
  validatePagination,
  validateUserId,
  validateProvider
} = require('./validation');

const router = express.Router();

// Initialize controllers
const userController = new UserController();
const followController = new FollowController();
const preferencesController = new PreferencesController();
const connectedAccountsController = new ConnectedAccountsController();

// User profile routes
router.get(
  '/profile/:id',
  validateUserId,
  optionalAuth,
  userController.getProfile.bind(userController)
);

router.put(
  '/profile',
  authenticateToken,
  validateProfileUpdate,
  userController.updateProfile.bind(userController)
);

router.post(
  '/upload-avatar',
  authenticateToken,
  uploadMiddleware.avatarMemory,
  handleUploadError,
  userController.uploadAvatar.bind(userController)
);

// Alternative endpoint for image field name
router.post(
  '/upload-image',
  authenticateToken,
  userController.uploadAvatar.bind(userController)
);

// Route for uploading a cover image
router.post(
  '/profile/upload-cover-image',
  authenticateToken,
  uploadMiddleware.coverImageMemory,
  handleUploadError,
  userController.uploadCoverImage.bind(userController)
);

// User search routes
router.get(
  '/search',
  validateSearch,
  optionalAuth,
  userController.searchUsers.bind(userController)
);

// Follow/unfollow routes
router.post(
  '/:id/follow',
  validateUserId,
  authenticateToken,
  followController.followUser.bind(followController)
);

router.delete(
  '/:id/unfollow',
  validateUserId,
  authenticateToken,
  followController.unfollowUser.bind(followController)
);

router.get(
  '/:id/followers',
  validateUserId,
  validatePagination,
  optionalAuth,
  followController.getFollowers.bind(followController)
);

router.get(
  '/:id/following',
  validateUserId,
  validatePagination,
  optionalAuth,
  followController.getFollowing.bind(followController)
);

router.get(
  '/:id/follow-status',
  validateUserId,
  optionalAuth,
  followController.getFollowStatus.bind(followController)
);

// Channel routes removed: channels are deprecated; content is uploaded to users

// User preferences routes
router.get(
  '/preferences',
  authenticateToken,
  preferencesController.getPreferences.bind(preferencesController)
);

router.put(
  '/preferences',
  authenticateToken,
  preferencesController.updatePreferences.bind(preferencesController)
);

router.patch(
  '/preferences/:section',
  authenticateToken,
  preferencesController.updatePreferenceSection.bind(preferencesController)
);

router.delete(
  '/preferences',
  authenticateToken,
  preferencesController.resetPreferences.bind(preferencesController)
);

// Connected accounts routes
router.get(
  '/connected-accounts',
  authenticateToken,
  connectedAccountsController.getConnectedAccounts.bind(connectedAccountsController)
);

router.delete(
  '/connected-accounts/:provider',
  validateProvider,
  authenticateToken,
  connectedAccountsController.disconnectAccount.bind(connectedAccountsController)
);

router.post(
  '/connected-accounts/:provider/link',
  validateProvider,
  authenticateToken,
  connectedAccountsController.initiateAccountLink.bind(connectedAccountsController)
);

module.exports = router;
