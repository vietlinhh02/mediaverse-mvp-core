const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

/**
 * Sends a webhook notification.
 * @param {object} job - The job object from the database.
 */
const sendWebhookNotification = async (job) => {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('WEBHOOK_URL not set. Skipping notification.');
    return;
  }

  try {
    await axios.post(webhookUrl, {
      jobId: job.id,
      status: job.status,
      type: job.type,
      result: job.result,
      error: job.error
    });
    console.log(`Webhook sent for job ${job.id}`);
  } catch (error) {
    console.error(`Failed to send webhook for job ${job.id}:`, error.message);
  }
};

/**
 * Creates a new job in the database.
 * @param {string} userId - The ID of the user who initiated the job.
 * @param {string} type - The type of the job.
 * @param {object} payload - The job data.
 * @returns {Promise<object>} The created job document.
 */
const createJob = (userId, type, payload) => prisma.job.create({
  data: {
    userId,
    type,
    data: payload,
    status: 'QUEUED'
  }
});

/**
 * Updates a job by its ID.
 * @param {string} jobId - The ID of the job.
 * @param {object} updates - The fields to update.
 * @returns {Promise<object>} The updated job document.
 */
const updateJob = async (jobId, updates) => {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: updates
  });

  if (updates.status && (updates.status === 'COMPLETED' || updates.status === 'FAILED')) {
    await sendWebhookNotification(job);
  }

  return job;
};

/**
 * Updates the progress of a job.
 * @param {string} jobId - The ID of the job.
 * @param {number} progress - The new progress percentage.
 * @returns {Promise<object>} The updated job document.
 */
const updateProgress = (jobId, progress) => updateJob(jobId, { progress });

/**
 * Sets the status of a job.
 * @param {string} jobId - The ID of the job.
 * @param {string} status - The new status.
 * @param {object} [error] - An error object if the job failed.
 * @returns {Promise<object>} The updated job document.
 */
const setStatus = (jobId, status, error = null) => {
  const updates = { status };
  if (error) {
    updates.error = { message: error.message, stack: error.stack };
  }
  return updateJob(jobId, updates);
};

/**
 * Retrieves a job by its ID.
 * @param {string} jobId - The ID of the job.
 * @returns {Promise<object>} The job document.
 */
const getJob = (jobId) => prisma.job.findUnique({
  where: { id: jobId }
});

/**
 * Counts active jobs for a user (QUEUED or PROCESSING status).
 * @param {string} userId - The ID of the user.
 * @param {string} type - Optional job type filter (default: 'PROCESS_VIDEO').
 * @returns {Promise<number>} Number of active jobs.
 */
const getUserActiveJobCount = (userId, type = 'PROCESS_VIDEO') => prisma.job.count({
  where: {
    userId,
    type,
    status: {
      in: ['QUEUED', 'PROCESSING']
    }
  }
});

module.exports = {
  createJob,
  updateJob,
  updateProgress,
  setStatus,
  getJob,
  getUserActiveJobCount
};
