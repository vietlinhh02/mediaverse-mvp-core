// Middleware exports
const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DuplicateError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logger: errorLogger
} = require('./errorHandler');

const {
  logger,
  requestLogger,
  performanceLogger,
  securityLogger
} = require('./logger');

const {
  validate,
  schemas,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateContent,
  validateArticle,
  validateComment,
  validateReport,
  validatePagination,
  validateSearch
} = require('./validation');

const {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  validateRefreshToken,
  tokenBlacklist,
  requireActiveUser
} = require('./auth');

const {
  corsOptions,
  securityHeaders,
  generalRateLimit,
  authenticatedRateLimit,
  strictRateLimit,
  authRateLimit,
  uploadRateLimit,
  conditionalRateLimit,
  ipWhitelist,
  requestSizeLimit,
  trackSecurityEvents,
  cors
} = require('./security');

const {
  uploadMiddleware,
  createUploadMiddleware,
  validateUploadedFile,
  handleUploadError,
  fileTypes,
  getFileType,
  isDangerousFilename
} = require('./upload');

module.exports = {
  // Error handling
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DuplicateError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  errorLogger,

  // Logging
  logger,
  requestLogger,
  performanceLogger,
  securityLogger,

  // Validation
  validate,
  schemas,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateContent,
  validateArticle,
  validateComment,
  validateReport,
  validatePagination,
  validateSearch,

  // Authentication & Authorization
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  validateRefreshToken,
  tokenBlacklist,
  requireActiveUser,

  // Security
  corsOptions,
  securityHeaders,
  generalRateLimit,
  authenticatedRateLimit,
  strictRateLimit,
  authRateLimit,
  uploadRateLimit,
  conditionalRateLimit,
  ipWhitelist,
  requestSizeLimit,
  trackSecurityEvents,
  cors,

  // File uploads
  uploadMiddleware,
  createUploadMiddleware,
  validateUploadedFile,
  handleUploadError,
  fileTypes,
  getFileType,
  isDangerousFilename
};
