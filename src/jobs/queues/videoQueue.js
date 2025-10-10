const { v7: uuidv7 } = require('uuid');
const { queue, redisQueue } = require('../../config/redis');
const { prisma } = require('../../config/database');

const VIDEO_QUEUE_BASE = 'video-processing';
const REGISTRY_KEY = 'set:video-processing:queues';

function getUserQueueName(userId) {
  return `${VIDEO_QUEUE_BASE}:user:${userId}`;
}

function createVideoQueue() {
  // placeholder; per-user queues are resolved at enqueue/pop time
  return { base: VIDEO_QUEUE_BASE };
}

// payload: { contentId, sourceObjectKey, userId? }
async function enqueueProcessVideo(_q, payload) {
  const jobId = uuidv7();
  let userId = payload.userId;
  if (!userId) {
    // Fallback: fetch authorId from content
    const content = await prisma.content.findUnique({ where: { id: payload.contentId }, select: { authorId: true } });
    userId = content?.authorId;
  }
  const queueName = userId ? getUserQueueName(userId) : VIDEO_QUEUE_BASE;
  const job = { id: jobId, type: 'PROCESS_VIDEO', payload: { ...payload, userId } };
  console.log('📦 [Queue] Pushing job to queue:', queueName, job);
  // Register this per-user queue for workers discovery
  try { await redisQueue.sAdd(REGISTRY_KEY, queueName); } catch (e) { /* ignore */ }
  const result = await queue.push(queueName, job);
  console.log('📦 [Queue] Push result:', result);
  return { jobId };
}

module.exports = {
  VIDEO_QUEUE_BASE,
  REGISTRY_KEY,
  getUserQueueName,
  createVideoQueue,
  enqueueProcessVideo
};


