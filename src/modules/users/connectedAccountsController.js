// Connected accounts controller for OAuth account management
const { prisma } = require('../../config/database');
const { logger } = require('../../middleware/logger');
const authService = require('../auth/authService');

/**
 * @swagger
 * components:
 *   schemas:
 *     ConnectedAccount:
 *       type: object
 *       properties:
 *         provider:
 *           type: string
 *           enum: [google, github, facebook]
 *           description: OAuth provider name
 *         id:
 *           type: string
 *           description: Provider user ID
 *         email:
 *           type: string
 *           description: Email from provider
 *         name:
 *           type: string
 *           description: Display name from provider
 *         linkedAt:
 *           type: string
 *           format: date-time
 *           description: When the account was linked
 *     ConnectedAccountsList:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             connectedAccounts:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ConnectedAccount'
 *             availableProviders:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of OAuth providers that can be connected
 */

class ConnectedAccountsController {
  /**
   * @swagger
   * /api/users/connected-accounts:
   *   get:
   *     summary: Get user's connected OAuth accounts
   *     tags: [Connected Accounts]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Connected accounts retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ConnectedAccountsList'
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  async getConnectedAccounts(req, res) {
    try {
      const { userId } = req.user;

      // Get user with OAuth providers data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          oauthProviders: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Transform OAuth providers data to connected accounts format
      const connectedAccounts = [];
      const oauthProviders = user.oauthProviders || {};

      Object.entries(oauthProviders).forEach(([provider, data]) => {
        connectedAccounts.push({
          provider,
          id: data.id,
          email: data.email,
          name: data.name,
          linkedAt: data.linkedAt
        });
      });

      // Available providers (configured OAuth providers)
      const availableProviders = [];
      if (process.env.GOOGLE_CLIENT_ID) availableProviders.push('google');
      if (process.env.GITHUB_CLIENT_ID) availableProviders.push('github');
      if (process.env.FACEBOOK_CLIENT_ID) availableProviders.push('facebook');

      logger.info({
        message: 'Connected accounts retrieved',
        userId,
        connectedCount: connectedAccounts.length
      });

      res.json({
        success: true,
        data: {
          connectedAccounts,
          availableProviders
        }
      });
    } catch (error) {
      logger.error({
        message: 'Get connected accounts error',
        error: error.message,
        userId: req.user?.userId
      });

      res.status(500).json({
        error: 'Failed to get connected accounts',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/connected-accounts/{provider}:
   *   delete:
   *     summary: Disconnect an OAuth account
   *     tags: [Connected Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [google, github, facebook]
   *         description: OAuth provider to disconnect
   *     responses:
   *       200:
   *         description: Account disconnected successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Cannot disconnect - validation error
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Provider not connected
   *       500:
   *         description: Internal server error
   */
  async disconnectAccount(req, res) {
    try {
      const { userId } = req.user;
      const { provider } = req.params;

      // Validate provider
      const validProviders = ['google', 'github', 'facebook'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({
          error: 'Invalid OAuth provider',
          code: 'INVALID_PROVIDER'
        });
      }

      // Get user with OAuth providers data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          oauthProviders: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const oauthProviders = user.oauthProviders || {};

      // Check if the provider is connected
      if (!oauthProviders[provider]) {
        return res.status(404).json({
          error: `${provider} account is not connected`,
          code: 'PROVIDER_NOT_CONNECTED'
        });
      }

      // Check if user has password or other OAuth accounts to prevent lockout
      const hasPassword = !!user.passwordHash;
      const connectedProviders = Object.keys(oauthProviders);
      const hasOtherProviders = connectedProviders.length > 1;

      if (!hasPassword && !hasOtherProviders) {
        return res.status(400).json({
          error: 'Cannot disconnect the only login method. Please set a password first.',
          code: 'LAST_LOGIN_METHOD'
        });
      }

      // Remove the provider from oauthProviders
      const updatedOAuthProviders = { ...oauthProviders };
      delete updatedOAuthProviders[provider];

      // Update user in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          oauthProviders: Object.keys(updatedOAuthProviders).length > 0 
            ? updatedOAuthProviders 
            : null
        }
      });

      logger.info({
        message: 'OAuth account disconnected',
        userId,
        provider,
        remainingProviders: Object.keys(updatedOAuthProviders)
      });

      res.json({
        success: true,
        message: `${provider} account disconnected successfully`
      });
    } catch (error) {
      logger.error({
        message: 'Disconnect account error',
        error: error.message,
        userId: req.user?.userId,
        provider: req.params.provider
      });

      res.status(500).json({
        error: 'Failed to disconnect account',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/users/connected-accounts/{provider}/link:
   *   post:
   *     summary: Initiate OAuth account linking
   *     tags: [Connected Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [google, github, facebook]
   *         description: OAuth provider to link
   *     responses:
   *       200:
   *         description: OAuth URL generated for account linking
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     authUrl:
   *                       type: string
   *                       description: OAuth authorization URL
   *                     provider:
   *                       type: string
   *                       description: OAuth provider name
   *       400:
   *         description: Invalid provider or already connected
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  async initiateAccountLink(req, res) {
    try {
      const { userId } = req.user;
      const { provider } = req.params;

      // Validate provider
      const validProviders = ['google', 'github', 'facebook'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({
          error: 'Invalid OAuth provider',
          code: 'INVALID_PROVIDER'
        });
      }

      // Check if provider is configured
      const providerConfigs = {
        google: process.env.GOOGLE_CLIENT_ID,
        github: process.env.GITHUB_CLIENT_ID,
        facebook: process.env.FACEBOOK_CLIENT_ID
      };

      if (!providerConfigs[provider]) {
        return res.status(400).json({
          error: `${provider} OAuth is not configured`,
          code: 'PROVIDER_NOT_CONFIGURED'
        });
      }

      // Get user to check if provider is already connected
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          oauthProviders: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const oauthProviders = user.oauthProviders || {};
      if (oauthProviders[provider]) {
        return res.status(400).json({
          error: `${provider} account is already connected`,
          code: 'PROVIDER_ALREADY_CONNECTED'
        });
      }

      // Generate OAuth URL with state parameter for linking
      const state = Buffer.from(JSON.stringify({
        userId,
        action: 'link',
        timestamp: Date.now()
      })).toString('base64');

      const authUrls = {
        google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback')}&response_type=code&scope=profile%20email&state=${state}`,
        github: `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback')}&scope=user:email&state=${state}`,
        facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback')}&scope=email&state=${state}`
      };

      const authUrl = authUrls[provider];

      logger.info({
        message: 'Account linking initiated',
        userId,
        provider
      });

      res.json({
        success: true,
        data: {
          authUrl,
          provider
        }
      });
    } catch (error) {
      logger.error({
        message: 'Initiate account link error',
        error: error.message,
        userId: req.user?.userId,
        provider: req.params.provider
      });

      res.status(500).json({
        error: 'Failed to initiate account linking',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = ConnectedAccountsController;