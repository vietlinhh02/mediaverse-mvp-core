// Request logging middleware
const winston = require('winston');
const { v7: uuidv7 } = require('uuid');

// Create logger instance with log rotation
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
      filename: 'logs/access.log',
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
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
      winston.format.printf(({
        timestamp, level, message, ...meta
      }) => `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`)
    )
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  // Generate trace ID for request tracking
  req.traceId = uuidv7();

  // Start time for performance tracking
  req.startTime = Date.now();

  // Log request start
  logger.info({
    message: 'Request started',
    traceId: req.traceId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function jsonLogger(body) {
    const duration = Date.now() - req.startTime;

    // Log response
    logger.info({
      message: 'Request completed',
      traceId: req.traceId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId,
      responseSize: JSON.stringify(body).length,
      timestamp: new Date().toISOString()
    });

    // Call original json method
    return originalJson.call(this, body);
  };

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function sendLogger(body) {
    const duration = Date.now() - req.startTime;

    // Log response
    logger.info({
      message: 'Request completed',
      traceId: req.traceId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId,
      responseSize: body ? body.length : 0,
      timestamp: new Date().toISOString()
    });

    // Call original send method
    return originalSend.call(this, body);
  };

  next();
};

// Performance monitoring middleware
const performanceLogger = (req, res, next) => {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn({
        message: 'Slow request detected',
        traceId: req.traceId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        userId: req.user?.userId
      });
    }
  });

  next();
};

// Security event logger
const securityLogger = {
  logFailedLogin: (email, ip, userAgent) => {
    logger.warn({
      message: 'Failed login attempt',
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      type: 'security_event'
    });
  },

  logSuspiciousActivity: (userId, activity, details) => {
    logger.warn({
      message: 'Suspicious activity detected',
      userId,
      activity,
      details,
      timestamp: new Date().toISOString(),
      type: 'security_event'
    });
  },

  logRateLimitExceeded: (ip, endpoint) => {
    logger.warn({
      message: 'Rate limit exceeded',
      ip,
      endpoint,
      timestamp: new Date().toISOString(),
      type: 'security_event'
    });
  }
};

module.exports = {
  logger,
  requestLogger,
  performanceLogger,
  securityLogger
};
