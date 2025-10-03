// Auth module entry point
const authRoutes = require('./authRoutes');
const authService = require('./authService');
const authController = require('./authController');
const passwordController = require('./passwordController');
const oauthController = require('./oauthController');

module.exports = {
  routes: authRoutes,
  service: authService,
  controller: authController,
  passwordController,
  oauthController
};
