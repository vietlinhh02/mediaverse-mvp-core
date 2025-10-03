/* eslint-disable global-require, no-await-in-loop */
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { authConfig } = require('../../config/auth');
const authService = require('./authService');
const { prisma } = require('../../config/database');

class OAuthController {
  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize Passport OAuth strategies
   */
  initializeStrategies() {
    // Google OAuth Strategy
    if (authConfig.oauth.google.clientID) {
      passport.use(new GoogleStrategy({
        clientID: authConfig.oauth.google.clientID,
        clientSecret: authConfig.oauth.google.clientSecret,
        callbackURL: authConfig.oauth.google.callbackURL
      }, this.handleOAuthCallback.bind(this, 'google')));
    }

    // GitHub OAuth Strategy
    if (authConfig.oauth.github.clientID) {
      passport.use(new GitHubStrategy({
        clientID: authConfig.oauth.github.clientID,
        clientSecret: authConfig.oauth.github.clientSecret,
        callbackURL: authConfig.oauth.github.callbackURL
      }, this.handleOAuthCallback.bind(this, 'github')));
    }

    // Facebook OAuth Strategy
    if (authConfig.oauth.facebook.clientID) {
      passport.use(new FacebookStrategy({
        clientID: authConfig.oauth.facebook.clientID,
        clientSecret: authConfig.oauth.facebook.clientSecret,
        callbackURL: authConfig.oauth.facebook.callbackURL,
        profileFields: ['id', 'emails', 'name', 'picture.type(large)']
      }, this.handleOAuthCallback.bind(this, 'facebook')));
    }

    // Passport serialization (not used for JWT, but required)
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            status: true
          }
        });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Handle OAuth callback from providers
   */
  async handleOAuthCallback(provider, accessToken, refreshToken, profile, done) {
    try {
      const oauthData = this.extractProfileData(provider, profile);

      // Check if user already exists with this OAuth account
      let user = await prisma.user.findFirst({
        where: {
          oauthProviders: {
            path: [provider, 'id'],
            equals: oauthData.providerId
          }
        },
        include: {
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              preferences: true
            }
          }
        }
      });

      if (user) {
        // User exists, update OAuth data if needed
        const { passwordHash: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      }

      // Check if user exists with same email
      user = await prisma.user.findUnique({
        where: { email: oauthData.email.toLowerCase() },
        include: {
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              preferences: true
            }
          }
        }
      });

      if (user) {
        // Link OAuth account to existing user
        const updatedUser = await authService.linkOAuthAccount(user.id, {
          provider,
          providerId: oauthData.providerId,
          profile: oauthData
        });
        return done(null, updatedUser);
      }

      // Create new user with OAuth data
      const newUser = await OAuthController.createOAuthUser(provider, oauthData);
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }

  /**
   * Extract profile data from OAuth provider
   */
  extractProfileData(provider, profile) {
    const baseData = {
      providerId: profile.id,
      email: '',
      name: '',
      username: '',
      avatarUrl: ''
    };

    switch (provider) {
      case 'google':
        return {
          ...baseData,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName || '',
          username: OAuthController.generateUsername(profile.displayName || profile.emails?.[0]?.value),
          avatarUrl: profile.photos?.[0]?.value || ''
        };

      case 'github':
        return {
          ...baseData,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName || profile.username,
          username: profile.username,
          avatarUrl: profile.photos?.[0]?.value || ''
        };

      case 'facebook':
        return {
          ...baseData,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName || `${profile.name?.givenName} ${profile.name?.familyName}`.trim(),
          username: OAuthController.generateUsername(profile.displayName || profile.emails?.[0]?.value),
          avatarUrl: profile.photos?.[0]?.value || ''
        };

      default:
        return baseData;
    }
  }

  /**
   * Generate unique username from name or email
   */
  static generateUsername(nameOrEmail) {
    if (!nameOrEmail) return `user_${Date.now()}`;

    let username = nameOrEmail
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 20);

    if (!username) {
      username = `user_${Date.now()}`;
    }

    return username;
  }

  /**
   * Create new user from OAuth data
   */
  static async createOAuthUser(provider, oauthData) {
    const {
      email, name, username, providerId, avatarUrl
    } = oauthData;

    // Ensure unique username
    let finalUsername = username;
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
      finalUsername = `${username}_${counter}`;
      counter += 1; // eslint-disable-line no-plusplus
    }

    // Create user and profile in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username: finalUsername,
          role: 'user',
          status: 'active',
          oauthProviders: {
            [provider]: {
              id: providerId,
              email,
              name,
              linkedAt: new Date().toISOString()
            }
          }
        }
      });

      // Create profile
      await tx.profile.create({
        data: {
          userId: newUser.id,
          displayName: name || finalUsername,
          avatarUrl: avatarUrl || null,
          preferences: {
            notifications: {
              email: true,
              push: true,
              inApp: true
            },
            privacy: {
              profileVisibility: 'public',
              showEmail: false
            }
          },
          stats: {
            followersCount: 0,
            followingCount: 0,
            contentCount: 0
          }
        }
      });

      return newUser;
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Google OAuth initiation
   * GET /api/auth/google
   */
  static googleAuth(req, res, next) {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  }

  /**
   * Google OAuth callback
   * GET /api/auth/google/callback
   */
  static async googleCallback(req, res, next) {
    passport.authenticate('google', { session: false }, async (err, user) => {
      if (err) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=Authentication failed`);
      }

      try {
        // Generate tokens
        const tokens = await authService.generateTokens(user);

        // Store refresh token
        const { cache } = require('../../config/redis'); // eslint-disable-line global-require
        await cache.set(
          `refresh_token:${user.id}:${tokens.refreshTokenId}`,
          JSON.stringify({
            userId: user.id,
            tokenId: tokens.refreshTokenId,
            createdAt: new Date().toISOString()
          }),
          7 * 24 * 60 * 60
        );

        // Redirect to client with tokens
        const redirectUrl = `${process.env.CLIENT_URL}/auth/success?`
          + `accessToken=${tokens.accessToken}&`
          + `refreshToken=${tokens.refreshToken}&`
          + `expiresIn=${tokens.expiresIn}`;

        res.redirect(redirectUrl);
      } catch (error) {
        res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
      }
    })(req, res, next);
  }

  /**
   * GitHub OAuth initiation
   * GET /api/auth/github
   */
  static githubAuth(req, res, next) {
    passport.authenticate('github', {
      scope: ['user:email']
    })(req, res, next);
  }

  /**
   * GitHub OAuth callback
   * GET /api/auth/github/callback
   */
  static async githubCallback(req, res, next) {
    passport.authenticate('github', { session: false }, async (err, user) => {
      if (err) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=Authentication failed`);
      }

      try {
        const tokens = await authService.generateTokens(user);

        const { cache } = require('../../config/redis');
        await cache.set(
          `refresh_token:${user.id}:${tokens.refreshTokenId}`,
          JSON.stringify({
            userId: user.id,
            tokenId: tokens.refreshTokenId,
            createdAt: new Date().toISOString()
          }),
          7 * 24 * 60 * 60
        );

        const redirectUrl = `${process.env.CLIENT_URL}/auth/success?`
          + `accessToken=${tokens.accessToken}&`
          + `refreshToken=${tokens.refreshToken}&`
          + `expiresIn=${tokens.expiresIn}`;

        res.redirect(redirectUrl);
      } catch (error) {
        res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
      }
    })(req, res, next);
  }

  /**
   * Facebook OAuth initiation
   * GET /api/auth/facebook
   */
  static facebookAuth(req, res, next) {
    passport.authenticate('facebook', {
      scope: ['email']
    })(req, res, next);
  }

  /**
   * Facebook OAuth callback
   * GET /api/auth/facebook/callback
   */
  static async facebookCallback(req, res, next) {
    passport.authenticate('facebook', { session: false }, async (err, user) => {
      if (err) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=Authentication failed`);
      }

      try {
        const tokens = await authService.generateTokens(user);

        const { cache } = require('../../config/redis');
        await cache.set(
          `refresh_token:${user.id}:${tokens.refreshTokenId}`,
          JSON.stringify({
            userId: user.id,
            tokenId: tokens.refreshTokenId,
            createdAt: new Date().toISOString()
          }),
          7 * 24 * 60 * 60
        );

        const redirectUrl = `${process.env.CLIENT_URL}/auth/success?`
          + `accessToken=${tokens.accessToken}&`
          + `refreshToken=${tokens.refreshToken}&`
          + `expiresIn=${tokens.expiresIn}`;

        res.redirect(redirectUrl);
      } catch (error) {
        res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
      }
    })(req, res, next);
  }
}

module.exports = OAuthController;
