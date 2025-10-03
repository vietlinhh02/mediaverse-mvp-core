const jobService = require('../services/jobService');
const { videoQueue, thumbnailQueue, streamingQueue } = require('../../../jobs/videoQueue');

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The job's unique identifier.
 *         bullJobId:
 *           type: string
 *           description: The ID of the job in the Bull queue.
 *         type:
 *           type: string
 *           description: The type of job.
 *           enum: [PROCESS_VIDEO, GENERATE_THUMBNAILS, ADAPTIVE_STREAMING, AUDIO_PROCESSING]
 *         status:
 *           type: string
 *           description: The current status of the job.
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *         progress:
 *           type: integer
 *           description: The job's progress from 0 to 100.
 *         data:
 *           type: object
 *           description: The input data for the job.
 *         result:
 *           type: object
 *           description: The result of a successfully completed job.
 *         error:
 *           type: object
 *           description: Error details if the job failed.
 *         contentId:
 *           type: string
 *           description: The ID of the content being processed.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The time the job was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The time the job was last updated.
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: The time the job was completed.
 *       example:
 *         id: "job_xyz123"
 *         bullJobId: "12"
 *         type: "PROCESS_VIDEO"
 *         status: "COMPLETED"
 *         progress: 100
 *         data: { "contentId": "...", "filePath": "..." }
 *         result: { "message": "Processing successful" }
 *         error: null
 *         contentId: "content_abc456"
 *         createdAt: "2023-10-27T10:00:00.000Z"
 *         updatedAt: "2023-10-27T10:05:00.000Z"
 *         completedAt: "2023-10-27T10:05:00.000Z"
 */

/**
 * @swagger
 * tags:
 *   - name: Media
 *     description: Media processing endpoints
 */

/**
 * @swagger
 * /api/media/process-video:
 *   post:
 *     summary: Start a new video processing job
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inputPath:
 *                 type: string
 *                 description: Path to the raw video file.
 *               outputDir:
 *                 type: string
 *                 description: Directory to save processed files.
 *               resolutions:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of resolutions (heights) to transcode to.
 *     responses:
 *       202:
 *         description: Job accepted for processing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Video processing job started"
 *                 jobId:
 *                   type: string
 */
const processVideo = async (req, res) => {
  // TODO: Add validation
  const { inputPath, outputDir, resolutions } = req.body;

  // Create a job record in DB
  const dbJob = await jobService.createJob(req.user.id, 'process-video', req.body);

  // Add job to the queue
  await videoQueue.add({ ...req.body, dbJobId: dbJob.id });

  res.status(202).json({ message: 'Video processing job started', jobId: dbJob.id });
};

/**
 * @swagger
 * /api/media/generate-thumbnails:
 *   post:
 *     summary: Start a thumbnail generation job
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inputPath:
 *                 type: string
 *                 description: Path to the video file.
 *               outputDir:
 *                 type: string
 *                 description: Directory to save thumbnails.
 *     responses:
 *       202:
 *         description: Job accepted for processing.
 */
const generateThumbnails = async (req, res) => {
  const dbJob = await jobService.createJob(req.user.id, 'generate-thumbnails', req.body);
  await thumbnailQueue.add({ ...req.body, dbJobId: dbJob.id });
  res.status(202).json({ message: 'Thumbnail generation job started', jobId: dbJob.id });
};

/**
 * @swagger
 * /api/media/jobs/{id}:
 *   get:
 *     summary: Get the status of a job
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The job ID.
 *     responses:
 *       200:
 *         description: Job status retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found.
 */
const getJobStatus = async (req, res) => {
  const { id } = req.params;
  const job = await jobService.getJob(id);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  res.status(200).json(job);
};

/**
 * @swagger
 * /api/media/adaptive-streaming:
 *   post:
 *     summary: Start a job to create HLS/DASH streams
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inputPath:
 *                 type: string
 *                 description: Path to the video file.
 *               outputDir:
 *                 type: string
 *                 description: Directory to save stream files.
 *     responses:
 *       202:
 *         description: Job accepted for processing.
 */
const adaptiveStreaming = async (req, res) => {
  const dbJob = await jobService.createJob(req.user.id, 'adaptive-streaming', req.body);
  await streamingQueue.add({ ...req.body, dbJobId: dbJob.id });
  res.status(202).json({ message: 'Adaptive streaming job started', jobId: dbJob.id });
};

module.exports = {
  processVideo,
  generateThumbnails,
  getJobStatus,
  adaptiveStreaming
};
