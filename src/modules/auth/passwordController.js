const { validationResult } = require('express-validator');
const authService = require('./authService');
const { prisma } = require('../../config/database');

class PasswordController {
  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req, res, next) {
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

      const { email } = req.body;

      // Generate reset token (always returns success for security)
      const result = await authService.generatePasswordResetToken(email);

      // In a real application, you would send an email here
      // For now, we'll just return the token (remove this in production)
      const response = {
        message: 'If an account with that email exists, a password reset link has been sent.',
        success: true
      };

      // In development, include the reset token for testing
      if (process.env.NODE_ENV === 'development' && result.resetToken) {
        response.resetToken = result.resetToken;
        response.expiresAt = result.expiresAt;
      }

      res.json(response);

      // TODO: Send email with reset link
      // await emailService.sendPasswordResetEmail(email, result.resetToken);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req, res, next) {
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

      const { resetToken, newPassword } = req.body;

      await authService.resetPassword(resetToken, newPassword);

      res.json({
        message: 'Password has been reset successfully',
        success: true
      });
    } catch (error) {
      if (error.message.includes('Invalid or expired reset token')) {
        return res.status(400).json({
          error: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN'
        });
      }

      if (error.message.includes('Reset token has expired')) {
        return res.status(400).json({
          error: 'Reset token has expired',
          code: 'RESET_TOKEN_EXPIRED'
        });
      }

      next(error);
    }
  }

  /**
   * Change password (authenticated user)
   * POST /api/auth/change-password
   */
  static async changePassword(req, res, next) {
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

      const { currentPassword, newPassword } = req.body;
      const { userId } = req.user;

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // If user has no password (OAuth only), don't allow password change
      if (!user.passwordHash) {
        return res.status(400).json({
          error: 'Cannot change password for OAuth-only accounts',
          code: 'OAUTH_ONLY_ACCOUNT'
        });
      }

      // Verify current password
      const bcrypt = require('bcrypt'); // eslint-disable-line global-require
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Hash new password
      const { authConfig } = require('../../config/auth'); // eslint-disable-line global-require
      const newPasswordHash = await bcrypt.hash(newPassword, authConfig.bcrypt.saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      // Invalidate all existing refresh tokens for security
      const { cache } = require('../../config/redis'); // eslint-disable-line global-require
      const pattern = `refresh_token:${userId}:*`;
      const keys = await cache.keys(pattern);
      if (keys.length > 0) {
        await cache.del(...keys);
      }

      res.json({
        message: 'Password changed successfully',
        success: true
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate reset token
   * GET /api/auth/validate-reset-token/:token
   */
  static async validateResetToken(req, res, next) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          error: 'Reset token is required',
          code: 'TOKEN_REQUIRED'
        });
      }

      // Check if token exists and is valid
      const { cache } = require('../../config/redis'); // eslint-disable-line global-require
      const tokenData = await cache.get(`password_reset:${token}`);

      if (!tokenData) {
        return res.status(400).json({
          valid: false,
          error: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN'
        });
      }

      const { expiresAt } = tokenData;

      // Check if token is expired
      if (new Date() > new Date(expiresAt)) {
        await cache.del(`password_reset:${token}`);
        return res.status(400).json({
          valid: false,
          error: 'Reset token has expired',
          code: 'RESET_TOKEN_EXPIRED'
        });
      }

      res.json({
        valid: true,
        expiresAt
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PasswordController;
