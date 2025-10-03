// Database configuration with connection pooling and error handling
const { PrismaClient } = require('@prisma/client');
const { getSearchSyncMiddleware } = require('../middleware/prismaSearchSync');

// Connection pool configuration
const poolConfig = {
  connectionLimit: 20,
  acquireTimeoutMillis: 60000,
  timeout: 60000,
  reconnect: true
};

// Enhanced Prisma client with connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: 'pretty'
});

// Attach the search sync middleware if Meilisearch is configured
if (process.env.MEILI_MASTER_KEY) {
  const searchSyncMiddleware = getSearchSyncMiddleware(prisma);
  prisma.$use(searchSyncMiddleware);
  console.log('Prisma middleware for Meilisearch sync is active.');
}

// Connection retry logic
let connectionRetries = 0;
const maxRetries = 5;
const retryDelay = 5000; // 5 seconds

const connectWithRetry = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    connectionRetries = 0;
    return true;
  } catch (error) {
    connectionRetries += 1;
    console.error(` Database connection attempt ${connectionRetries} failed:`, error.message);

    if (connectionRetries < maxRetries) {
      console.log(`Retrying connection in ${retryDelay / 1000} seconds...`);
      setTimeout(connectWithRetry, retryDelay);
    } else {
      console.error(' Max connection retries reached. Exiting...');
      process.exit(1);
    }
    return false;
  }
};

// Database health check function
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connectionPool: {
        active: 'N/A', // Prisma doesn't expose pool stats directly
        idle: 'N/A',
        total: poolConfig.connectionLimit
      }
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Enhanced error handling
const handleDatabaseError = (error, operation = 'database operation') => {
  console.error(`Database error during ${operation}:`, {
    message: error.message,
    code: error.code,
    meta: error.meta,
    timestamp: new Date().toISOString()
  });

  // Handle specific Prisma errors
  if (error.code === 'P2002') {
    return {
      type: 'UNIQUE_CONSTRAINT_VIOLATION',
      message: 'A record with this data already exists',
      field: error.meta?.target
    };
  }

  if (error.code === 'P2025') {
    return {
      type: 'RECORD_NOT_FOUND',
      message: 'The requested record was not found'
    };
  }

  if (error.code === 'P2003') {
    return {
      type: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
      message: 'Referenced record does not exist'
    };
  }

  return {
    type: 'DATABASE_ERROR',
    message: error.message || 'An unexpected database error occurred'
  };
};

// Transaction helper with retry logic
const executeTransaction = async (operations, maxRetriesLimit = 3) => {
  let attempt = 0;

  while (attempt < maxRetriesLimit) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await prisma.$transaction(operations);
    } catch (error) {
      attempt += 1;
      console.error(`Transaction attempt ${attempt} failed:`, error.message);

      if (attempt >= maxRetriesLimit) {
        throw handleDatabaseError(error, 'transaction');
      }

      // Wait before retry (exponential backoff)
      const delay = 2 ** attempt * 1000;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }
  return null; // This should never be reached, but ESLint requires it
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    console.log('Disconnecting from database...');
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Error during database disconnect:', error);
  }
};

// Don't auto-connect - let the application control when to connect
// connectWithRetry();

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', gracefulShutdown);

module.exports = {
  prisma,
  poolConfig,
  connectWithRetry,
  checkDatabaseConnection,
  handleDatabaseError,
  executeTransaction,
  gracefulShutdown
};
