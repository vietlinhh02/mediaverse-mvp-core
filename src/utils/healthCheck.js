// Health check utilities for database and Redis connections
const { prisma, checkDatabaseConnection } = require('../config/database');
const { checkRedisHealth } = require('../config/redis');

/**
 * Comprehensive health check for all system components
 * @returns {Object} Health status of all components
 */
const performHealthCheck = async () => {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {}
  };

  try {
    // Check database connection
    console.log('Checking database connection...');
    const dbHealth = await checkDatabaseConnection();
    healthStatus.services.database = dbHealth;

    // Check Redis connections
    console.log('Checking Redis connections...');
    const redisHealth = await checkRedisHealth();
    healthStatus.services.redis = redisHealth;

    // Check if any service is unhealthy
    const hasUnhealthyService = Object.values(healthStatus.services).some((service) => {
      if (typeof service === 'object' && service.status) {
        return service.status === 'unhealthy';
      }
      // For Redis, check individual clients
      if (typeof service === 'object') {
        return Object.values(service).some((client) => client.status === 'unhealthy');
      }
      return false;
    });

    if (hasUnhealthyService) {
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    console.error('Health check failed:', error);
    healthStatus.status = 'unhealthy';
    healthStatus.error = error.message;
  }

  return healthStatus;
};

/**
 * Quick health check for basic liveness probe
 * @returns {Object} Basic health status
 */
const quickHealthCheck = async () => {
  try {
    // Just check if the application is running
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

/**
 * Database-specific health check with detailed information
 * @returns {Object} Database health status
 */
const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();

    // Try to execute a simple query
    await prisma.$queryRaw`SELECT 1 as health_check`;

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      connection: 'active'
    };
  } catch (error) {
    console.error('Database health check failed:', error);

    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      connection: 'failed'
    };
  }
};

/**
 * Redis-specific health check with detailed information
 * @returns {Object} Redis health status
 */
const checkRedisHealthDetailed = async () => {
  try {
    return await checkRedisHealth();
  } catch (error) {
    console.error('Redis health check failed:', error);

    return {
      cache: { status: 'unhealthy', error: error.message },
      session: { status: 'unhealthy', error: error.message },
      queue: { status: 'unhealthy', error: error.message },
      pub: { status: 'unhealthy', error: error.message },
      sub: { status: 'unhealthy', error: error.message }
    };
  }
};

/**
 * System metrics for monitoring
 * @returns {Object} System performance metrics
 */
const getSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
};

module.exports = {
  performHealthCheck,
  quickHealthCheck,
  checkDatabaseHealth,
  checkRedisHealthDetailed,
  getSystemMetrics
};
