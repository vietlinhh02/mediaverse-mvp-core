// Security middleware configuration
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { securityLogger } = require('./logger');

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      securityLogger.logSuspiciousActivity(null, 'CORS_VIOLATION', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Trace-ID'
  ],
  exposedHeaders: ['X-Trace-ID'],
  maxAge: 86400 // 24 hours
};

// Rate limiting configuration
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => rateLimit({
  windowMs,
  max,
  message: {
    error: message,
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests,
  handler: (req, res) => {
    securityLogger.logRateLimitExceeded(req.ip, req.originalUrl);
    res.status(429).json({
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
});

// General rate limiting (100 requests per 15 minutes per IP)
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests from this IP, please try again later'
);

// Authenticated user rate limiting (1000 requests per hour)
const authenticatedRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  1000,
  'Too many requests, please try again later',
  true // Skip successful requests
);

// Strict rate limiting for sensitive endpoints
const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5,
  'Too many attempts, please try again later'
);

// Auth endpoints rate limiting
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10,
  'Too many authentication attempts, please try again later'
);

// Upload rate limiting
const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  50,
  'Too many upload attempts, please try again later'
);

// Helmet security configuration
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// Security headers middleware
const securityHeaders = helmet(helmetConfig);

// IP whitelist middleware for admin endpoints
const ipWhitelist = (allowedIPs = []) => (req, res, next) => {
  if (allowedIPs.length === 0) {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress;

  if (!allowedIPs.includes(clientIP)) {
    securityLogger.logSuspiciousActivity(req.user?.userId, 'IP_BLOCKED', {
      ip: clientIP,
      endpoint: req.originalUrl
    });

    return res.status(403).json({
      error: 'Access denied from this IP address',
      code: 'IP_BLOCKED'
    });
  }

  next();
};

// Helper function to parse size strings
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * units[unit]);
};

// Request size limiting middleware
const requestSizeLimit = (limit = '500mb') => (req, res, next) => {
  const contentLength = parseInt(req.get('content-length'), 10);
  const maxSize = parseSize(limit);

  if (contentLength && contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      code: 'REQUEST_TOO_LARGE',
      maxSize: limit
    });
  }

  next();
};

// Security event tracking middleware
const trackSecurityEvents = (req, res, next) => {
  // Track suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /<script/gi, // XSS attempts
    /union.*select/gi, // SQL injection
    /javascript:/gi, // JavaScript injection
    /vbscript:/gi, // VBScript injection
    /onload=/gi, // Event handler injection
    /onerror=/gi // Error handler injection
  ];

  const checkString = `${req.originalUrl} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;

  suspiciousPatterns.some((pattern) => {
    if (pattern.test(checkString)) {
      securityLogger.logSuspiciousActivity(req.user?.userId, 'MALICIOUS_PATTERN', {
        pattern: pattern.toString(),
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return true;
    }
    return false;
  });

  next();
};

// Conditional rate limiting based on authentication
const conditionalRateLimit = (req, res, next) => {
  if (req.user) {
    // Apply authenticated user rate limit
    return authenticatedRateLimit(req, res, next);
  }
  // Apply general rate limit for unauthenticated users
  return generalRateLimit(req, res, next);
};

module.exports = {
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
  cors: cors(corsOptions)
};
