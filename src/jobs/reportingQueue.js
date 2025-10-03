const Queue = require('bull');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB_QUEUE || 2
};

const reportingQueue = new Queue('generate-report', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000 // 1 minute
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

reportingQueue.on('error', (error) => {
  console.error(`Queue ${reportingQueue.name} error:`, error);
});

module.exports = {
  reportingQueue
};
