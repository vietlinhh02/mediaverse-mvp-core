// Document processing queue using Bull
const Queue = require('bull');
const redisConfig = require('../config/redis').redisConfig;

// Create document processing queue
const documentQueue = new Queue('document-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 100
  }
});

// Event listeners
documentQueue.on('completed', (job, result) => {
  console.log(`[DocumentQueue] Job ${job.id} completed for document ${job.data.documentId}`);
});

documentQueue.on('failed', (job, err) => {
  console.error(`[DocumentQueue] Job ${job.id} failed for document ${job.data.documentId}:`, err.message);
});

documentQueue.on('stalled', (job) => {
  console.warn(`[DocumentQueue] Job ${job.id} stalled for document ${job.data.documentId}`);
});

module.exports = {
  documentQueue
};
