// Authentication middleware
const { jwtUtils } = require('../config/auth');
const { cache } = require('../config/redis');

// JWT token validation middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'AUTHENTICATION_FAILED'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await cache.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token has been revoked',
        code: 'AUTHENTICATION_FAILED'
      });
    }

    // Verify token
    const decoded = jwtUtils.verifyToken(token);

    // For better performance, we'll just verify the JWT here
    // The full user validation can be done in endpoints that need it
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'AUTHENTICATION_FAILED'
      });
    }

    return res.status(500).json({
      error: 'Authentication error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const isBlacklisted = await cache.exists(`blacklist:${token}`);
      if (!isBlacklisted) {
        const decoded = jwtUtils.verifyToken(token);
        req.user = decoded;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Role-based authorization middleware
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTHENTICATION_FAILED'
    });
  }

  const userRole = req.user.role;
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'AUTHORIZATION_FAILED',
      required: allowedRoles,
      current: userRole
    });
  }

  next();
};

// Admin only middleware
const requireAdmin = requireRole(['admin']);

// Moderator or admin middleware
const requireModerator = requireRole(['admin', 'moderator']);

// Refresh token validation middleware
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Check if refresh token is blacklisted
    const isBlacklisted = await cache.exists(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Refresh token has been revoked',
        code: 'REFRESH_TOKEN_REVOKED'
      });
    }

    // Verify refresh token
    const decoded = jwtUtils.verifyToken(refreshToken);
    req.user = decoded;
    req.refreshToken = refreshToken;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    return res.status(500).json({
      error: 'Token validation error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Token blacklist utility functions
const tokenBlacklist = {
  async addToBlacklist(token, expiresIn = 3600) {
    await cache.set(`blacklist:${token}`, 'true', expiresIn);
  },

  async removeFromBlacklist(token) {
    await cache.del(`blacklist:${token}`);
  },

  async isBlacklisted(token) {
    return cache.exists(`blacklist:${token}`);
  }
};

// User status validation middleware
const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTHENTICATION_FAILED'
    });
  }

  if (req.user.status !== 'active') {
    return res.status(403).json({
      error: 'Account is not active',
      code: 'ACCOUNT_INACTIVE',
      status: req.user.status
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  validateRefreshToken,
  tokenBlacklist,
  requireActiveUser
};
