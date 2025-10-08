const { v7: uuidv7 } = require('uuid');
const { queue } = require('../../config/redis');

const VIDEO_QUEUE_NAME = 'video-processing';

function createVideoQueue() {
  // placeholder to keep API consistent
  return { name: VIDEO_QUEUE_NAME };
}

async function enqueueProcessVideo(_q, payload) {
  const jobId = uuidv7();
  const job = { id: jobId, type: 'PROCESS_VIDEO', payload };
  console.log('📦 [Queue] Pushing job to queue:', VIDEO_QUEUE_NAME, job);
  const result = await queue.push(VIDEO_QUEUE_NAME, job);
  console.log('📦 [Queue] Push result:', result);
  return { jobId };
}

module.exports = {
  VIDEO_QUEUE_NAME,
  createVideoQueue,
  enqueueProcessVideo
};


