// User module entry point
const routes = require('./routes');
const UserService = require('./userService');
const UserController = require('./userController');
const FollowController = require('./followController');
const PreferencesController = require('./preferencesController');

module.exports = {
  routes,
  UserService,
  UserController,
  FollowController,
  
  PreferencesController
};
