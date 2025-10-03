// User module routes
const express = require('express');
const UserController = require('./userController');
const FollowController = require('./followController');
const ChannelController = require('./channelController');
const PreferencesController = require('./preferencesController');
const ConnectedAccountsController = require('./connectedAccountsController');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const { uploadMiddleware, handleUploadError } = require('../../middleware/upload');
const {
  validateProfileUpdate,
  validateChannelCreate,
  validateChannelUpdate,
  validateSearch,
  validatePagination,
  validateChannelList,
  validateUserId,
  validateChannelId,
  validateProvider
} = require('./validation');

const router = express.Router();

// Initialize controllers
const userController = new UserController();
const followController = new FollowController();
const channelController = new ChannelController();
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
  uploadMiddleware.imageMemory,
  handleUploadError,
  userController.uploadAvatar.bind(userController)
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

// Channel routes
router.post(
  '/channels',
  authenticateToken,
  validateChannelCreate,
  channelController.createChannel.bind(channelController)
);

router.put(
  '/channels/:id',
  validateChannelId,
  authenticateToken,
  validateChannelUpdate,
  channelController.updateChannel.bind(channelController)
);

router.get(
  '/channels/:id',
  validateChannelId,
  optionalAuth,
  channelController.getChannel.bind(channelController)
);

router.get(
  '/:id/channels',
  validateUserId,
  optionalAuth,
  channelController.getUserChannels.bind(channelController)
);

router.delete(
  '/channels/:id',
  validateChannelId,
  authenticateToken,
  channelController.deleteChannel.bind(channelController)
);

router.get(
  '/channels',
  validateChannelList,
  optionalAuth,
  channelController.getChannels.bind(channelController)
);

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
