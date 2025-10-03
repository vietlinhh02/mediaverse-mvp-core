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
  removeOnComplete: true,
  removeOnFail: 1000 // Keep last 1000 failed jobs
};

/**
 * Creates a Bull queue with shared Redis connection options.
 * @param {string} name - The name of the queue.
 * @returns {Queue.Queue}
 */
const createQueue = (name) => new Queue(name, {
  redis: redisConfig,
  defaultJobOptions
});

// Define job queues for different media processing tasks
const videoQueue = createQueue('process-video');
const thumbnailQueue = createQueue('generate-thumbnails');
const streamingQueue = createQueue('adaptive-streaming');
const audioQueue = createQueue('audio-processing');

// Log queue events for monitoring
const queues = [videoQueue, thumbnailQueue, streamingQueue, audioQueue];
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
  videoQueue,
  thumbnailQueue,
  streamingQueue,
  audioQueue
};
