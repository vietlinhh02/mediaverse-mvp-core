require('dotenv').config();

// Main application entry point
const express = require('express');
const path = require('path');
const compression = require('compression');
const passport = require('passport');
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');

// Import middleware
const {
  securityHeaders,
  conditionalRateLimit,
  authRateLimit,
  requestLogger,
  performanceLogger,
  trackSecurityEvents,
  requestSizeLimit,
  errorHandler,
  notFoundHandler
} = require('./middleware');

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// Custom CORS Middleware
app.use((req, res, next) => {
  const { origin } = req.headers;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'X-Trace-ID');

  // Handle pre-flight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Morgan logger for requests
app.use(requestLogger);

// Security event tracking
app.use(trackSecurityEvents);

// Compression middleware
app.use(compression());

// Request size limiting
app.use(requestSizeLimit('500mb'));

// Rate limiting (conditional based on authentication)
app.use(conditionalRateLimit);

// Special rate limiting for auth endpoints
app.use('/api/auth', authRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Static file serving for uploads
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Initialize Passport for OAuth
app.use(passport.initialize());

// Initialize OAuth Controller (sets up OAuth strategies)
const OAuthController = require('./modules/auth/oauthController');
new OAuthController(); // eslint-disable-line no-new

// Swagger API Documentation
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));
  console.log('API Documentation available at /api-docs');
}

// Health check routes
const {
  performHealthCheck,
  quickHealthCheck,
  checkDatabaseHealth,
  checkRedisHealthDetailed,
  getSystemMetrics
} = require('./utils/healthCheck');

// Database and Redis initialization modules
const { initializeRedis } = require('./config/redis');
const { connectWithRetry } = require('./config/database');
const { initializeDatabase, verifyDatabaseSchema } = require('./utils/dbInit');
const { setupWorkers } = require('./jobs/worker');
const { setupNotificationWorkers } = require('./jobs/notificationWorker');
const { setupAnalyticsWorker } = require('./jobs/analyticsQueue');
const { setupReportingWorker } = require('./jobs/reportingWorker');
const searchService = require('./services/searchService'); // Import the search service

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Quick health check endpoint
 *     description: Returns basic health status of the API server
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
app.get('/health', async (req, res) => {
  try {
    const health = await quickHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check endpoint
 *     description: Returns comprehensive health status of all system components
 *     tags: [System]
 *     responses:
 *       200:
 *         description: All services are healthy
 *       503:
 *         description: One or more services are unhealthy
 */
app.get('/health/detailed', async (req, res) => {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /health/database:
 *   get:
 *     summary: Database health check
 *     description: Returns database connection status and performance metrics
 *     tags: [System]
 */
app.get('/health/database', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /health/redis:
 *   get:
 *     summary: Redis health check
 *     description: Returns Redis connection status for all instances
 *     tags: [System]
 */
app.get('/health/redis', async (req, res) => {
  try {
    const redisHealth = await checkRedisHealthDetailed();
    const hasUnhealthy = Object.values(redisHealth).some((client) => client.status === 'unhealthy');
    const statusCode = hasUnhealthy ? 503 : 200;
    res.status(statusCode).json(redisHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: System metrics endpoint
 *     description: Returns system performance metrics
 *     tags: [System]
 */
app.get('/metrics', (req, res) => {
  try {
    const metrics = getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information endpoint
 *     description: Returns basic information about the API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInfo'
 *             example:
 *               message: "Mediaverse MVP API"
 *               version: "1.0.0"
 *               status: "running"
 */
app.get('/api', (req, res) => {
  res.json({
    message: 'Mediaverse MVP API',
    version: '1.0.0',
    status: 'running'
  });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d', // Cache static assets for 1 day
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for JS
    }
    if (path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for CSS
    }
  }
}));

// API Routes
const authRoutes = require('./modules/auth/authRoutes');
const userRoutes = require('./modules/users/routes');
const contentRoutes = require('./modules/content/routes');
const recommendationRoutes = require('./modules/recommendations/routes');
const mediaRoutes = require('./modules/media/routes/mediaRoutes');
const notificationRoutes = require('./modules/notifications/routes');
const moderationRoutes = require('./modules/moderation/routes/moderationRoutes.js');
const analyticsRoutes = require('./modules/analytics/routes/analyticsRoutes');
const playlistRoutes = require('./modules/content/playlistRoutes'); // Import playlist routes

const WebSocketManager = require('./modules/notifications/websocket/webSocketManager');
const realtimeService = require('./modules/analytics/services/realtimeService');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/playlists', playlistRoutes); // Mount playlist routes

// Initialize WebSocket server for real-time notifications
const webSocketManager = new WebSocketManager();
global.webSocketManager = webSocketManager; // Make available globally for services

// Connect WebSocket manager to notification service
const { setWebSocketManager } = require('./modules/notifications/services/notificationService');

setWebSocketManager(webSocketManager);

// Initialize scheduler for periodic jobs
const scheduler = require('./jobs/scheduler');

scheduler.init();

// 404 handler (must come before error handler)
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Initialize database and Redis connections
const initializeServices = async () => {
  console.log('Initializing services...');

  try {
    // Initialize Meilisearch and configure indexes
    try {
      if (process.env.MEILI_MASTER_KEY) {
        // Content Index Configuration
        await searchService.initIndex('content', {
          filterableAttributes: ['contentType', 'authorId', 'tags', 'category', 'createdAt'],
          sortableAttributes: ['createdAt', 'updatedAt'],
          searchableAttributes: ['title', 'description', 'tags', 'authorName', 'content']
        });

        // Users Index Configuration
        await searchService.initIndex('users', {
          filterableAttributes: ['status', 'role', 'isVerified'],
          sortableAttributes: ['createdAt'],
          searchableAttributes: ['username', 'displayName', 'bio']
        });

        console.log('Meilisearch service initialized and indexes are configured.');
      } else {
        console.warn('MEILI_MASTER_KEY not set. Search service will be disabled.');
      }
    } catch (searchError) {
      console.error('Meilisearch initialization failed. Search functionality will be unavailable.', searchError);
    }

    // Initialize Redis connections
    const redisInitialized = await initializeRedis();

    // Initialize database connection (if available)

    let dbAvailable = false;
    try {
      await connectWithRetry();
      dbAvailable = await verifyDatabaseSchema();

      if (dbAvailable) {
        await initializeDatabase();
      }
    } catch (error) {
      console.log('Database not available - running in limited mode');
      dbAvailable = false;
    }

    console.log('Services initialized successfully');
    console.log(`Redis: ${redisInitialized ? 'true' : 'false'} | Database: ${dbAvailable ? 'true' : 'false'}`);

    // Start background job workers
    if (redisInitialized) {
      setupWorkers();
      setupNotificationWorkers();
      setupAnalyticsWorker();
      setupReportingWorker();
      console.log('Background job workers started');
    }

    return true;
  } catch (error) {
    console.error(' Service initialization failed:', error);
    // Don't exit - allow app to run in degraded mode
    return false;
  }
};

// Only start server if this file is run directly (not imported)
if (require.main === module) {
  // Initialize services first, then start server
  initializeServices().then(() => {
    const server = app.listen(PORT, () => {
      console.log(` Mediaverse MVP Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
      console.log(` API docs: http://localhost:${PORT}/api-docs`);
    });

    // Initialize WebSocket server after HTTP server is running
    webSocketManager.initialize(server);
    console.log(' WebSocket server initialized for real-time notifications');
    realtimeService.initialize(server);
    console.log(' WebSocket server initialized for real-time analytics');

    // Start scheduled jobs
    scheduler.start();
  }).catch((error) => {
    console.error(' Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;
