// Video processing job using Bull queue
const { VideoProcessingUtils } = require('../modules/content/videoController');
const ContentService = require('../modules/content/contentService');

module.exports = async (job) => {
  console.log('Job received:', job);
  const jobData = job.data || job;

  if (!jobData.videoId) {
    console.error('Invalid job: missing videoId');
    return;
  }

  const {
    videoId, filePath, duration, resolution
  } = jobData;

  try {
    console.log(`Processing video ${videoId} at ${filePath}`);

    if (!VideoProcessingUtils || !VideoProcessingUtils.processVideo) {
      throw new Error('VideoProcessingUtils not available');
    }

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`);
    }

    // Update status to processing
    try {
      await ContentService.updateContent(videoId, {
        metadata: {
          processingStatus: 'processing'
        }
      }, null); // No userId for background processing
    } catch (updateError) {
      console.error(`Failed to update content status: ${updateError.message}`);
      // Continue processing anyway
    }

    // Process video - compression happens inside processVideo
    const result = await VideoProcessingUtils.processVideo(videoId, filePath, {
      duration,
      resolution
    });

    console.log(`Video ${videoId} processed successfully`);
    return result;
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);

    // Update status to failed
    try {
      await ContentService.updateContent(videoId, {
        status: 'failed',
        metadata: {
          processingStatus: 'failed',
          error: error.message
        }
      }, null); // No userId for background processing
    } catch (updateError) {
      console.error(`Failed to update content to failed status: ${updateError.message}`);
    }

    throw error;
  }
};
