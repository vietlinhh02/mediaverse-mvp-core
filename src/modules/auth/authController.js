const { validationResult } = require('express-validator');
const authService = require('./authService');

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        });
      }

      const { email, username, password } = req.body;

      // Register user
      await authService.registerUser({
        email,
        username,
        password
      });

      // Generate tokens for immediate login
      const loginResult = await authService.loginUser({
        identifier: email,
        password
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: loginResult.user,
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
        expiresIn: loginResult.expiresIn,
        tokenType: loginResult.tokenType
      });
    } catch (error) {
      if (error.message.includes('Email already registered')) {
        return res.status(409).json({
          error: 'Email already registered',
          code: 'EMAIL_EXISTS'
        });
      }

      if (error.message.includes('Username already taken')) {
        return res.status(409).json({
          error: 'Username already taken',
          code: 'USERNAME_EXISTS'
        });
      }

      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        });
      }

      const { identifier, password } = req.body;

      const result = await authService.loginUser({
        identifier,
        password
      });

      res.json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: result.tokenType
      });
    } catch (error) {
      if (error.message.includes('Invalid credentials')) {
        return res.status(401).json({
          error: 'Invalid email/username or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      if (error.message.includes('Account is')) {
        return res.status(403).json({
          error: error.message,
          code: 'ACCOUNT_INACTIVE'
        });
      }

      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refresh(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        });
      }

      const { refreshToken } = req.body;

      const result = await authService.refreshToken(refreshToken);

      res.json({
        message: 'Token refreshed successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: result.tokenType
      });
    } catch (error) {
      if (error.message.includes('Token refresh failed')) {
        return res.status(401).json({
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }

      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const accessToken = req.token; // From auth middleware
      const userId = req.user?.userId;

      if (!userId || !accessToken) {
        return res.status(400).json({
          error: 'Invalid logout request',
          code: 'INVALID_REQUEST'
        });
      }

      await authService.logout(userId, accessToken, refreshToken);

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      // Even if logout fails, return success to client for security
      res.json({
        message: 'Logout successful'
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  static async getCurrentUser(req, res, next) {
    try {
      console.log('getCurrentUser - req.user:', req.user); // Debug log

      if (!req.user) {
        console.log('getCurrentUser - req.user is null/undefined');
        return res.status(401).json({
          error: 'User not authenticated',
          code: 'AUTHENTICATION_FAILED'
        });
      }

      if (!req.user.userId) {
        console.log('getCurrentUser - req.user.userId is null/undefined');
        return res.status(401).json({
          error: 'User not authenticated',
          code: 'AUTHENTICATION_FAILED'
        });
      }

      const { userId } = req.user;
      console.log('getCurrentUser - userId:', userId);

      // Get user with profile data
      const { prisma } = require('../../config/database'); // eslint-disable-line global-require
      console.log('getCurrentUser - about to query DB with userId:', userId);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              id: true,
              displayName: true,
              bio: true,
              avatarUrl: true,
              coverImageUrl: true,
              location: true,
              website: true,
              phoneNumber: true,
              dateOfBirth: true,
              gender: true,
              occupation: true,
              company: true,
              education: true,
              socialLinks: true,
              preferences: true,
              stats: true,
              isVerified: true,
              isPublic: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });

      console.log('getCurrentUser - user from DB:', user); // Debug log

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate token endpoint
   * POST /api/auth/validate
   */
  static async validateToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Token is required',
          code: 'TOKEN_REQUIRED'
        });
      }

      const result = await authService.validateToken(token);

      res.json({
        valid: true,
        user: result.user,
        decoded: {
          userId: result.userId,
          email: result.email,
          username: result.username,
          role: result.role,
          status: result.status
        }
      });
    } catch (error) {
      res.status(401).json({
        valid: false,
        error: error.message,
        code: 'INVALID_TOKEN'
      });
    }
  }

  /**
   * Send a login OTP to the user's email
   */
  static async sendLoginOtp(req, res, next) {
    try {
      const { email } = req.body;
      await authService.sendLoginOtp(email);
      res.json({
        success: true,
        message: 'If an account with that email exists, an OTP has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify the OTP and log in the user
   */
  static async verifyLoginOtp(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyLoginOtp(email, otp);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
