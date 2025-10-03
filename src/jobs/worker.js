// Video processing worker
const fs = require('fs-extra');
const path = require('path');
const {
  videoQueue, thumbnailQueue, streamingQueue, audioQueue
} = require('./videoQueue');
const mediaProcessor = require('../modules/media/processors/mediaProcessor');
const streamingProcessor = require('../modules/media/processors/streamingProcessor');
const jobService = require('../modules/media/services/jobService');
const contentService = require('../modules/content/contentService');

const allQueues = [videoQueue, thumbnailQueue, streamingQueue, audioQueue];

/**
 * Cleans completed and failed jobs from all queues on startup.
 * This is useful in development to prevent re-running old failed jobs.
 */
const cleanQueuesOnStartup = async () => {
  console.log('Cleaning queues on startup...');
  try {
    for (const queue of allQueues) {
      const failedCount = await queue.getFailedCount();
      if (failedCount > 0) {
        await queue.clean(0, 'failed');
        console.log(`    Cleaned ${failedCount} failed jobs from ${queue.name} queue.`);
      }
    }
  } catch (error) {
    console.error('Error cleaning queues:', error);
  }
};

function setupWorkers() {
  // 1. Orchestrator for video processing from user uploads
  videoQueue.process(10, async (job) => {
    const {
      contentId, filePath, dbJobId, useAdaptiveStorage = false, userId
    } = job.data;
    console.log(`[Worker] Starting full video processing job ${job.id} for content ${contentId} (user: ${userId}, adaptive: ${useAdaptiveStorage})`);

    // Check user concurrency limit (max 3 concurrent jobs per user)
    if (userId) {
      const activeJobsCount = await jobService.getUserActiveJobCount(userId, 'PROCESS_VIDEO');
      console.log(`[Worker] User ${userId} has ${activeJobsCount} active jobs`);

      if (activeJobsCount >= 3) {
        // Too many concurrent jobs for this user, delay this job for 30 seconds
        console.log(`[Worker] User ${userId} has reached concurrency limit, delaying job ${job.id} for 30 seconds`);
        await job.moveToDelayed(Date.now() + 30000); // Delay 30 seconds
        return;
      }
    }

    const outputDir = path.join(path.dirname(filePath), `processed_${contentId}`);
    await fs.ensureDir(outputDir);

    try {
      // 1. Update statuses to PROCESSING
      await jobService.updateJob(dbJobId, { status: 'PROCESSING', bullJobId: job.id });
      await contentService.updateContent(contentId, { metadata: { processingStatus: 'processing' } });

      // 2. Transcode, create streams, and generate thumbnails
      await jobService.updateProgress(dbJobId, 10);

      let masterPlaylistPath;
      let transcodedFiles = {};
      let compressedVideoPath;

      if (useAdaptiveStorage) {
        // Adaptive storage mode: compress for storage, create HLS on-demand
        console.log(`[Worker] Using adaptive storage mode for ${contentId}`);

        const compressedOutputPath = path.join(outputDir, 'compressed.mp4');
        await mediaProcessor.compressVideoForStorage(filePath, compressedOutputPath);
        compressedVideoPath = compressedOutputPath;

        console.log('[Worker] Storage compression complete');

        // Create HLS on-demand (this will be cached)
        const hlsOutputDir = path.join(outputDir, 'hls');
        masterPlaylistPath = await streamingProcessor.createHLS(compressedOutputPath, hlsOutputDir);

        console.log(`[Worker] HLS creation complete (on-demand) for ${contentId}`);
        await jobService.updateProgress(dbJobId, 80);
      } else {
        // Traditional mode: create all transcodes upfront
        const resolutions = [1080, 720, 480, 360];
        transcodedFiles = await mediaProcessor.transcodeVideo(filePath, outputDir, resolutions);
        console.log(`[Worker] Transcoding complete for ${contentId}`);
        await jobService.updateProgress(dbJobId, 50);

        const hlsOutputDir = path.join(outputDir, 'hls');
        masterPlaylistPath = await streamingProcessor.createHLS(filePath, hlsOutputDir);
        console.log(`[Worker] HLS creation complete for ${contentId}`);
        await jobService.updateProgress(dbJobId, 80);
      }

      const thumbsOutputDir = path.join(outputDir, 'thumbnails');
      const thumbnailPaths = await mediaProcessor.generateThumbnails(filePath, thumbsOutputDir);
      console.log(`[Worker] Thumbnail generation complete for ${contentId}`);

      // In a real application, here you would upload all generated files
      // (transcoded videos, HLS segments, thumbnails) to S3 using s3Service
      // and get back the public URLs. For now, we'll use local paths.

      // 3. Update content record with final data
      const metadata = await mediaProcessor.getVideoMetadata(useAdaptiveStorage ? compressedVideoPath || filePath : filePath);
      const finalUpdate = {
        status: 'published',
        metadata: {
          ...metadata,
          processingStatus: 'completed',
          processedAt: new Date().toISOString(),
          useAdaptiveStorage,
          // Normalize paths to use forward slashes for cross-platform compatibility
          masterPlaylist: path.relative(process.cwd(), masterPlaylistPath).replace(/\\/g, '/'),
          thumbnails: thumbnailPaths.map((p) => path.relative(process.cwd(), p).replace(/\\/g, '/')),
          ...(useAdaptiveStorage ? {
            compressedVideo: path.relative(process.cwd(), compressedVideoPath).replace(/\\/g, '/')
          } : {
            videos: Object.entries(transcodedFiles).reduce((acc, [res, p]) => {
              acc[res] = path.relative(process.cwd(), p).replace(/\\/g, '/');
              return acc;
            }, {})
          })
        }
      };
      await contentService.updateContent(contentId, finalUpdate);

      // 4. Update job to COMPLETED
      await jobService.updateJob(dbJobId, { status: 'COMPLETED', progress: 100, result: { message: 'Processing successful' } });

      // 5. Cleanup local files
      await fs.remove(filePath); // remove original upload
      console.log(`[Worker] Original file ${filePath} removed.`);

      console.log(`[Worker] Completed video processing job ${job.id} for content ${contentId}`);
      return { success: true };
    } catch (error) {
      console.error(`[Worker] Failed video processing job ${job.id}:`, error);
      // Update DB records to reflect failure
      await jobService.setStatus(dbJobId, 'FAILED', error);
      await contentService.updateContent(contentId, { status: 'failed', metadata: { processingStatus: 'failed', error: error.message } });

      // Cleanup any partial files
      await fs.remove(outputDir);

      throw error; // Let Bull handle the retry logic
    }
  });

  // 2. Thumbnail Generation Worker (for standalone requests)
  thumbnailQueue.process(async (job) => {
    const {
      inputPath, outputDir, options, dbJobId
    } = job.data;
    console.log(`Starting thumbnail generation job ${job.id} for ${inputPath}`);
    try {
      await jobService.updateJob(dbJobId, { status: 'PROCESSING', bullJobId: job.id });
      const result = await mediaProcessor.generateThumbnails(inputPath, outputDir, options);
      await jobService.updateJob(dbJobId, { status: 'COMPLETED', progress: 100, result });
      console.log(`Completed thumbnail generation job ${job.id}`);
      return result;
    } catch (error) {
      console.error(`Failed thumbnail generation job ${job.id}:`, error);
      await jobService.updateJob(dbJobId, { status: 'FAILED', error: { message: error.message, stack: error.stack } });
      throw error;
    }
  });

  // 3. Adaptive Streaming Worker (for standalone requests)
  streamingQueue.process(async (job) => {
    const {
      inputPath, outputDir, options, dbJobId
    } = job.data;
    console.log(`Starting HLS generation job ${job.id} for ${inputPath}`);
    try {
      await jobService.updateJob(dbJobId, { status: 'PROCESSING', bullJobId: job.id });
      const hlsResolutions = options?.resolutions; // Let the processor use its defaults if not provided
      const result = await streamingProcessor.createHLS(inputPath, outputDir, hlsResolutions);
      await jobService.updateJob(dbJobId, { status: 'COMPLETED', progress: 100, result: { masterPlaylist: result } });
      console.log(`Completed HLS generation job ${job.id}`);
      return result;
    } catch (error) {
      console.error(`Failed HLS generation job ${job.id}:`, error);
      await jobService.updateJob(dbJobId, { status: 'FAILED', error: { message: error.message, stack: error.stack } });
      throw error;
    }
  });

  // 4. Audio Processing Worker (to be implemented)
  audioQueue.process(async (job) => {
    console.log(`Received audio job ${job.id}`, job.data);
    // const { inputPath, outputDir } = job.data;
    // await audioProcessor.processAudio(inputPath, outputDir);
    return { status: 'pending_implementation' };
  });

  console.log(' Media processing workers are running...');
}

module.exports = { setupWorkers };

// Start workers if this file is run directly
if (require.main === module) {
  // Clean queues first, then start the workers
  cleanQueuesOnStartup().then(() => {
    setupWorkers();
  });
}
