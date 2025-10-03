const bcrypt = require('bcrypt');
const { v7: uuidv7 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../config/database');
const { cache } = require('../../config/redis');
const { jwtUtils, authConfig } = require('../../config/auth');
const EmailService = require('../notifications/services/emailService');
const searchService = require('../../services/searchService'); // Import searchService

const OTP_VALIDITY_MINUTES = 10;

// Helper function to transform user data for Meilisearch
function transformUserToDocument(userWithProfile) {
  return {
    id: userWithProfile.id,
    username: userWithProfile.username,
    displayName: userWithProfile.profile?.displayName,
    bio: userWithProfile.profile?.bio,
    avatarUrl: userWithProfile.profile?.avatarUrl,
    isVerified: userWithProfile.profile?.isVerified,
    role: userWithProfile.role,
    status: userWithProfile.status,
    createdAt: Math.floor(new Date(userWithProfile.createdAt).getTime() / 1000)
  };
}

class AuthService {
  /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Object} User object without password
     */
  static async registerUser(userData) {
    const { email, username, password } = userData;

    // Check for existing user with same email or username
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('Email already registered');
      }
      if (existingUser.username === username.toLowerCase()) {
        throw new Error('Username already taken');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, authConfig.bcrypt.saltRounds);

    // Create user and profile in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          passwordHash,
          role: 'user',
          status: 'active'
        }
      });

      // Create default profile
      await tx.profile.create({
        data: {
          userId: newUser.id,
          displayName: username,
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

    // --- Meilisearch Sync ---
    // After the transaction is successful, we have a complete user and profile.
    // Now is the perfect time to sync to Meilisearch.
    try {
      const userWithProfile = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true }
      });
      if (userWithProfile) {
        const document = transformUserToDocument(userWithProfile);
        await searchService.addOrUpdateDocuments('users', [document]);
      }
    } catch (searchError) {
      // Log the error but don't fail the registration process
      console.error('Failed to sync new user to Meilisearch:', searchError);
    }
    // --- End Meilisearch Sync ---

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    // Send welcome email
    await EmailService.sendWelcomeEmail(user.email, {
      userId: user.id,
      username: user.username,
      displayName: user.profile ? user.profile.displayName : user.username
    });

    return userWithoutPassword;
  }

  /**
     * Login user with email/username and password
     * @param {Object} credentials - Login credentials
     * @returns {Object} User and tokens
     */
  static async loginUser(credentials) {
    const { identifier, password } = credentials;

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() }
        ]
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

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check user status
    if (user.status !== 'active') {
      throw new Error(`Account is ${user.status}`);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token in Redis
    await cache.set(
      `refresh_token:${user.id}:${tokens.refreshTokenId}`,
      JSON.stringify({
        userId: user.id,
        tokenId: tokens.refreshTokenId,
        createdAt: new Date().toISOString()
      }),
      7 * 24 * 60 * 60 // 7 days in seconds
    );

    // Return user without sensitive fields
    const {
      passwordHash, otp, otpExpiresAt, ...userWithoutPassword
    } = user;
    return {
      user: userWithoutPassword,
      ...tokens
    };
  }

  /**
     * Generate access and refresh tokens
     * @param {Object} user - User object
     * @returns {Object} Tokens and metadata
     */
  static async generateTokens(user) {
    const refreshTokenId = uuidv7();

    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status
    };

    const accessToken = jwtUtils.generateAccessToken(payload);
    const refreshToken = jwtUtils.generateRefreshToken({
      ...payload,
      tokenId: refreshTokenId
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      expiresIn: this.getAccessTokenExpiryInSeconds(),
      tokenType: 'Bearer'
    };
  }

  /**
     * Convert JWT expiry string to seconds
     * @returns {number} Expiry time in seconds
     */
  static getAccessTokenExpiryInSeconds() {
    const { authConfig } = require('../../config/auth');
    const expiry = authConfig.jwt.accessTokenExpiry;

    // Parse expiry string (e.g., '2h', '15m', '1d')
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 2 * 60 * 60; // Default 2 hours

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 60 * 60;
      case 'd': return num * 24 * 60 * 60;
      default: return 2 * 60 * 60; // Default 2 hours
    }
  }

  /**
     * Validate JWT token
     * @param {string} token - JWT token
     * @returns {Object} Decoded token payload
     */
  static async validateToken(token) {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await cache.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwtUtils.verifyToken(token);

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active') {
        throw new Error('User account is not active');
      }

      return { ...decoded, user };
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
     * Refresh access token using refresh token
     * @param {string} refreshToken - Refresh token
     * @returns {Object} New tokens
     */
  static async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwtUtils.verifyToken(refreshToken);

      // Check if refresh token exists in Redis
      const storedToken = await cache.get(`refresh_token:${decoded.userId}:${decoded.tokenId}`);
      if (!storedToken) {
        throw new Error('Refresh token not found or expired');
      }

      // Get current user data
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active') {
        throw new Error('User account is not active');
      }

      // Generate new tokens
      const newTokens = await this.generateTokens(user);

      // Remove old refresh token and store new one
      await cache.del(`refresh_token:${decoded.userId}:${decoded.tokenId}`);
      await cache.set(
        `refresh_token:${user.id}:${newTokens.refreshTokenId}`,
        JSON.stringify({
          userId: user.id,
          tokenId: newTokens.refreshTokenId,
          createdAt: new Date().toISOString()
        }),
        7 * 24 * 60 * 60 // 7 days in seconds
      );

      // Blacklist old refresh token
      await cache.set(`blacklist:${refreshToken}`, 'true', 7 * 24 * 60 * 60);

      return {
        user,
        ...newTokens
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
     * Logout user and invalidate tokens
     * @param {string} userId - User ID
     * @param {string} accessToken - Access token to blacklist
     * @param {string} refreshToken - Refresh token to invalidate
     */
  static async logout(userId, accessToken, refreshToken) {
    try {
      // Decode refresh token to get token ID
      const decoded = jwtUtils.verifyToken(refreshToken);

      // Remove refresh token from Redis
      await cache.del(`refresh_token:${userId}:${decoded.tokenId}`);

      // Blacklist both tokens
      await Promise.all([
        cache.set(`blacklist:${accessToken}`, 'true', 15 * 60), // 15 minutes
        cache.set(`blacklist:${refreshToken}`, 'true', 7 * 24 * 60 * 60) // 7 days
      ]);

      return { success: true };
    } catch (error) {
      // Even if token decoding fails, try to blacklist the tokens
      await Promise.all([
        cache.set(`blacklist:${accessToken}`, 'true', 15 * 60),
        cache.set(`blacklist:${refreshToken}`, 'true', 7 * 24 * 60 * 60)
      ]);

      return { success: true };
    }
  }

  /**
     * Generate password reset token
     * @param {string} email - User email
     * @returns {Object} Reset token info
     */
  static async generatePasswordResetToken(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal if email exists or not
      return { success: true };
    }

    const resetToken = uuidv7();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in Redis
    await cache.set(
      `password_reset:${resetToken}`,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      }),
      60 * 60 // 1 hour in seconds
    );

    return {
      success: true,
      resetToken,
      expiresAt
    };
  }

  /**
     * Reset password using reset token
     * @param {string} resetToken - Password reset token
     * @param {string} newPassword - New password
     * @returns {Object} Success status
     */
  static async resetPassword(resetToken, newPassword) {
    // Get reset token data from Redis
    const tokenDataStr = await cache.get(`password_reset:${resetToken}`);
    if (!tokenDataStr) {
      throw new Error('Invalid or expired reset token');
    }

    const tokenData = JSON.parse(tokenDataStr);
    const { userId, expiresAt } = tokenData;

    // Check if token is expired
    if (new Date() > new Date(expiresAt)) {
      await cache.del(`password_reset:${resetToken}`);
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, authConfig.bcrypt.saltRounds);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    // Remove reset token
    await cache.del(`password_reset:${resetToken}`);

    // Invalidate all existing refresh tokens for this user
    const pattern = `refresh_token:${userId}:*`;
    const keys = await cache.keys(pattern);
    if (keys.length > 0) {
      await cache.del(...keys);
    }

    return { success: true };
  }

  /**
     * Link OAuth account to existing user
     * @param {string} userId - User ID
     * @param {Object} oauthData - OAuth provider data
     * @returns {Object} Updated user
     */
  static async linkOAuthAccount(userId, oauthData) {
    const { provider, providerId, profile } = oauthData;

    // Check if OAuth account is already linked to another user
    const existingOAuth = await prisma.user.findFirst({
      where: {
        oauthProviders: {
          path: `$.${provider}.id`,
          equals: providerId
        }
      }
    });

    if (existingOAuth && existingOAuth.id !== userId) {
      throw new Error(`${provider} account is already linked to another user`);
    }

    // Update user with OAuth data
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        oauthProviders: {
          [provider]: {
            id: providerId,
            email: profile.email,
            name: profile.name,
            linkedAt: new Date().toISOString()
          }
        }
      }
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async sendLoginOtp(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists, just return success
      return;
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiresAt }
    });

    await EmailService.sendNotification(
      user.email,
      'Your Login OTP for Mediaverse',
      {
        userName: user.username,
        otp,
        validityPeriod: OTP_VALIDITY_MINUTES
      },
      'login-otp'
    );
  }

  static async verifyLoginOtp(email, otp) {
    const user = await prisma.user.findUnique({
      where: { email },
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

    if (!user || !user.otp || !user.otpExpiresAt) {
      throw new Error('Invalid OTP or user not found');
    }

    // Check user status
    if (user.status !== 'active') {
      throw new Error(`Account is ${user.status}`);
    }

    if (user.otp !== otp || new Date() > user.otpExpiresAt) {
      // Clear OTP after failed attempt
      await prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null }
      });
      throw new Error('Invalid or expired OTP');
    }

    // Clear OTP after successful verification and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpiresAt: null, lastLogin: new Date() }
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token in Redis
    await cache.set(
      `refresh_token:${user.id}:${tokens.refreshTokenId}`,
      JSON.stringify({
        userId: user.id,
        tokenId: tokens.refreshTokenId,
        createdAt: new Date().toISOString()
      }),
      7 * 24 * 60 * 60 // 7 days in seconds
    );

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      message: 'Login successful',
      user: userWithoutPassword,
      ...tokens
    };
  }
}

module.exports = AuthService;
