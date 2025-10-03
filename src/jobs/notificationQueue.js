const Queue = require('bull');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB_QUEUE || 2
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000 // 5 seconds
  },
  removeOnComplete: 50,
  removeOnFail: 100
};

// Priority levels for jobs
const PRIORITY = {
  HIGH: 1, // Critical notifications (security, system alerts)
  NORMAL: 0, // Regular notifications (likes, comments, follows)
  LOW: -1 // Batch operations, digests, cleanup
};

// Job-specific options
const jobOptions = {
  // High priority jobs - process immediately
  high: {
    ...defaultJobOptions,
    priority: PRIORITY.HIGH,
    delay: 0
  },
  // Normal priority jobs
  normal: {
    ...defaultJobOptions,
    priority: PRIORITY.NORMAL,
    delay: 0
  },
  // Low priority jobs - can be delayed
  low: {
    ...defaultJobOptions,
    priority: PRIORITY.LOW,
    delay: 0
  },
  // Delayed jobs for batch operations
  delayed: {
    ...defaultJobOptions,
    priority: PRIORITY.LOW,
    delay: 300000 // 5 minutes delay by default
  }
};

/**
 * Creates a Bull queue with shared Redis connection options.
 * @param {string} name - The name of the queue.
 * @param {object} options - Additional queue options.
 * @returns {Queue.Queue}
 */
const createQueue = (name, options = {}) => new Queue(name, {
  redis: redisConfig,
  defaultJobOptions: {
    ...defaultJobOptions,
    ...options
  }
});

/**
 * Creates a job with specific priority and options.
 * @param {Queue.Queue} queue - The queue to add job to.
 * @param {object} data - Job data.
 * @param {string} priority - Job priority level (high, normal, low).
 * @param {number} delay - Delay in milliseconds.
 * @returns {Promise<Job>}
 */
const createJob = async (queue, data, priority = 'normal', delay = 0) => {
  const options = {
    ...jobOptions[priority] || jobOptions.normal,
    delay
  };

  return await queue.add(data, options);
};

/**
 * Creates a delayed job (useful for batch operations, digests, etc.).
 * @param {Queue.Queue} queue - The queue to add job to.
 * @param {object} data - Job data.
 * @param {number} delayMs - Delay in milliseconds.
 * @returns {Promise<Job>}
 */
const createDelayedJob = async (queue, data, delayMs) => await queue.add(data, {
  ...jobOptions.delayed,
  delay: delayMs
});

// Define notification job queues for different types of notifications
const emailQueue = createQueue('send-email');
const pushQueue = createQueue('send-push-notification');
const smsQueue = createQueue('send-sms');
const inAppQueue = createQueue('send-in-app-notification');

// Additional queues for advanced notification processing
const notificationQueue = createQueue('process-notification'); // Main notification processing
const batchQueue = createQueue('batch-notifications'); // Batch operations like digests
const digestQueue = createQueue('weekly-digest'); // Weekly digest emails
const bulkDigestQueue = createQueue('bulk-weekly-digest'); // Bulk digest operations

// Log queue events for monitoring
const queues = [emailQueue, pushQueue, smsQueue, inAppQueue, notificationQueue, batchQueue, digestQueue, bulkDigestQueue];
queues.forEach((queue) => {
  queue.on('error', (error) => {
    console.error(`Queue ${queue.name} error:`, error);
  });

  queue.on('waiting', (jobId) => {
    console.log(`A job with ID ${jobId} is waiting in queue ${queue.name}`);
  });

  queue.on('active', (job) => {
    console.log(`Job ${job.id} has started in queue ${queue.name}`);
  });

  queue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed in queue ${queue.name} with result:`, result);
  });

  queue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed in queue ${queue.name} with error:`, err);
  });
});

module.exports = {
  // Queues
  emailQueue,
  pushQueue,
  smsQueue,
  inAppQueue,
  notificationQueue,
  batchQueue,
  digestQueue,
  bulkDigestQueue,

  // Helper functions
  createJob,
  createDelayedJob,

  // Constants
  PRIORITY,
  jobOptions
};
