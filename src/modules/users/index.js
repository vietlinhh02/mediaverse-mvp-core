// User module entry point
const routes = require('./routes');
const UserService = require('./userService');
const UserController = require('./userController');
const FollowController = require('./followController');
const ChannelController = require('./channelController');
const PreferencesController = require('./preferencesController');

module.exports = {
  routes,
  UserService,
  UserController,
  FollowController,
  ChannelController,
  PreferencesController
};
