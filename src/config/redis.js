// Redis configuration with cluster support and separate instances
const Redis = require('redis');
const IORedis = require('ioredis');

// Base Redis configuration
const baseRedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis connection failed after 10 retries');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    }
  }
};

// Cluster configuration (if using Redis Cluster)
const clusterConfig = {
  enableReadyCheck: false,
  redisOptions: baseRedisConfig,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100
};

// Create separate Redis instances for different purposes
let redisCache; let redisSession; let redisQueue; let redisPub; let
  redisSub;

// Initialize Redis clients based on environment
const initializeRedisClients = () => {
  const isCluster = process.env.REDIS_CLUSTER === 'true';

  if (isCluster) {
    const clusterNodes = process.env.REDIS_CLUSTER_NODES?.split(',') || ['localhost:6379'];

    // Use Redis Cluster
    redisCache = new IORedis.Cluster(clusterNodes, clusterConfig);
    redisSession = new IORedis.Cluster(clusterNodes, clusterConfig);
    redisQueue = new IORedis.Cluster(clusterNodes, clusterConfig);
    redisPub = new IORedis.Cluster(clusterNodes, clusterConfig);
    redisSub = new IORedis.Cluster(clusterNodes, clusterConfig);
  } else {
    // Use single Redis instances with different databases
    redisCache = Redis.createClient({ ...baseRedisConfig, database: 0 });
    redisSession = Redis.createClient({ ...baseRedisConfig, database: 1 });
    redisQueue = Redis.createClient({ ...baseRedisConfig, database: 2 });
    redisPub = Redis.createClient({ ...baseRedisConfig, database: 3 });
    redisSub = Redis.createClient({ ...baseRedisConfig, database: 3 });
  }
};

// Initialize clients
initializeRedisClients();

// Enhanced error handling for all clients
const setupErrorHandling = (client, name) => {
  client.on('error', (err) => {
    console.error(`Redis ${name} Client Error:`, err);
  });

  client.on('connect', () => {
    console.log(`Redis ${name} Client Connected`);
  });

  client.on('ready', () => {
    console.log(`Redis ${name} Client Ready`);
  });

  client.on('reconnecting', () => {
    console.log(`Redis ${name} Client Reconnecting...`);
  });

  client.on('end', () => {
    console.log(`Redis ${name} Client Connection Ended`);
  });
};

// Setup error handling for all clients
setupErrorHandling(redisCache, 'Cache');
setupErrorHandling(redisSession, 'Session');
setupErrorHandling(redisQueue, 'Queue');
setupErrorHandling(redisPub, 'Pub');
setupErrorHandling(redisSub, 'Sub');

// Enhanced cache helper functions
const cache = {
  async get(key) {
    try {
      const value = await redisCache.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      await redisCache.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      await redisCache.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  async exists(key) {
    try {
      return await redisCache.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  async mget(keys) {
    try {
      const values = await redisCache.mGet(keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      console.error('Cache mget error:', error);
      return new Array(keys.length).fill(null);
    }
  },

  async mset(keyValuePairs, ttl = 3600) {
    try {
      const pipeline = redisCache.pipeline();

      keyValuePairs.forEach(([key, value]) => {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  },

  async increment(key, amount = 1) {
    try {
      return await redisCache.incrBy(key, amount);
    } catch (error) {
      console.error('Cache increment error:', error);
      return null;
    }
  },

  async expire(key, ttl) {
    try {
      return await redisCache.expire(key, ttl);
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }
};

// Session helper functions
const session = {
  async get(sessionId) {
    try {
      const value = await redisSession.get(`session:${sessionId}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Session get error:', error);
      return null;
    }
  },

  async set(sessionId, data, ttl = 86400) { // 24 hours default
    try {
      await redisSession.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Session set error:', error);
      return false;
    }
  },

  async destroy(sessionId) {
    try {
      await redisSession.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      console.error('Session destroy error:', error);
      return false;
    }
  }
};

// Queue helper functions
const queue = {
  async push(queueName, data) {
    try {
      // Use LPUSH to add to a list for BLPOP
      await redisQueue.lPush(`list_queue:${queueName}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Queue push error:', error);
      return false;
    }
  },

  async pop(queueName) {
    try {
      // Use RPOP for FIFO behavior
      const result = await redisQueue.rPop(`list_queue:${queueName}`);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Queue pop error:', error);
      return null;
    }
  },

  async length(queueName) {
    try {
      // Use LLEN for list length
      return await redisQueue.lLen(`list_queue:${queueName}`);
    } catch (error) {
      console.error('Queue length error:', error);
      return 0;
    }
  },

  async popBlocking(queueName, timeout = 30) {
    try {
      // Use BLPOP for efficient long polling
      // Note: `zPopMin` doesn't have a blocking version, so we switch to lists for this
      const result = await redisQueue.blPop(`list_queue:${queueName}`, timeout);
      return result ? JSON.parse(result.element) : null;
    } catch (error) {
      // Timeouts will throw errors, which is expected. Only log other errors.
      if (error.message.toLowerCase().includes('timeout')) {
        return null;
      }
      console.error('Queue popBlocking error:', error);
      return null;
    }
  }
};

// Pub/Sub helper functions
const pubsub = {
  async publish(channel, message) {
    try {
      await redisPub.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Publish error:', error);
      return false;
    }
  },

  async subscribe(channel, callback) {
    try {
      await redisSub.subscribe(channel);
      redisSub.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            console.error('Message parsing error:', error);
          }
        }
      });
      return true;
    } catch (error) {
      console.error('Subscribe error:', error);
      return false;
    }
  }
};

// Health check function
const checkRedisHealth = async () => {
  const clients = [
    { name: 'Cache', client: redisCache },
    { name: 'Session', client: redisSession },
    { name: 'Queue', client: redisQueue },
    { name: 'Pub', client: redisPub },
    { name: 'Sub', client: redisSub }
  ];

  const results = {};

  await Promise.all(clients.map(async ({ name, client }) => {
    try {
      await client.ping();
      results[name.toLowerCase()] = {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      results[name.toLowerCase()] = {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }));

  return results;
};

// Initialize connections
const initializeRedis = async () => {
  try {
    const clients = [
      { name: 'Cache', client: redisCache },
      { name: 'Session', client: redisSession },
      { name: 'Queue', client: redisQueue },
      { name: 'Pub', client: redisPub },
      { name: 'Sub', client: redisSub }
    ];

    await Promise.all(clients.map(async ({ client }) => {
      if (!client.isOpen) {
        await client.connect();
      }
    }));

    console.log('All Redis clients connected successfully');
    return true;
  } catch (error) {
    console.error('Redis initialization failed:', error);
    return false;
  }
};

// Graceful shutdown
const shutdownRedis = async () => {
  try {
    const clients = [
      { name: 'Cache', client: redisCache },
      { name: 'Session', client: redisSession },
      { name: 'Queue', client: redisQueue },
      { name: 'Pub', client: redisPub },
      { name: 'Sub', client: redisSub }
    ];

    await Promise.all(clients.map(async ({ name, client }) => {
      if (client.isOpen) {
        await client.quit();
        console.log(`Redis ${name} client disconnected`);
      }
    }));

    console.log('All Redis clients disconnected successfully');
  } catch (error) {
    console.error('Error during Redis disconnect:', error);
  }
};

process.on('SIGINT', shutdownRedis);
process.on('SIGTERM', shutdownRedis);
process.on('beforeExit', shutdownRedis);

module.exports = {
  // Individual clients
  redisCache,
  redisSession,
  redisQueue,
  redisPub,
  redisSub,

  // Helper functions
  cache,
  session,
  queue,
  pubsub,

  // Utility functions
  initializeRedis,
  shutdownRedis,
  checkRedisHealth
};
