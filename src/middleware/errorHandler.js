// Global error handling middleware
const winston = require('winston');
const { v7: uuidv7 } = require('uuid');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = 'GENERIC_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_FAILED');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_FAILED');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'RESOURCE_NOT_FOUND');
  }
}

class DuplicateError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'DUPLICATE_RESOURCE');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// Logger configuration with log rotation
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mediaverse-api' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Error response formatter
const formatErrorResponse = (error, traceId, req) => {
  const response = {
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    traceId
  };

  // Add details for validation errors
  if (error.details) {
    response.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  return response;
};

// Main error handling middleware
// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  const traceId = req.traceId || uuidv7();

  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    traceId,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId
  });

  // Handle different error types
  let statusCode = 500;
  let formattedError = error;

  if (error.isOperational) {
    statusCode = error.statusCode;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    formattedError = new ValidationError('Validation failed', error.details);
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    formattedError = new AuthenticationError();
  } else if (error.name === 'CastError') {
    statusCode = 400;
    formattedError = new ValidationError('Invalid ID format');
  } else if (error.code === 11000) {
    statusCode = 409;
    formattedError = new DuplicateError('Resource already exists');
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    if (error.code === 'LIMIT_FILE_SIZE') {
      formattedError = new ValidationError('File size too large');
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      formattedError = new ValidationError('Too many files');
    } else {
      formattedError = new ValidationError('File upload error');
    }
  }

  // Send error response
  res.status(statusCode).json(formatErrorResponse(formattedError, traceId, req));
};

// 404 handler
// eslint-disable-next-line no-unused-vars
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
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
  logger
};
