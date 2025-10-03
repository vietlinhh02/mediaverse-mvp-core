const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');

const ffprobeAsync = promisify(ffmpeg.ffprobe);

/**
 * Extracts metadata from a video file.
 * @param {string} inputPath - The path to the input video file.
 * @returns {Promise<object>} A promise that resolves with the video metadata.
 */
async function getVideoMetadata(inputPath) {
  try {
    const metadata = await ffprobeAsync(inputPath);
    const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
    if (!videoStream) throw new Error('No video stream found in the file.');
    return {
      duration: metadata.format.duration,
      size: metadata.format.size,
      bitrate: metadata.format.bit_rate,
      resolution: `${videoStream.width}x${videoStream.height}`,
      aspectRatio: videoStream.display_aspect_ratio,
      codec: videoStream.codec_name,
      fps: videoStream.r_frame_rate
    };
  } catch (err) {
    console.error(`Error getting metadata for ${inputPath}:`, err);
    throw new Error('Failed to extract video metadata.');
  }
}

/**
 * Calculates absolute timestamps from a mix of seconds and percentages.
 */
const calculateTimestamps = (timestamps, duration) => timestamps.map((ts) => {
  if (typeof ts === 'string' && ts.includes('%')) {
    return (parseFloat(ts.replace('%', '')) / 100) * duration;
  }
  return parseFloat(ts);
}).filter((ts) => !isNaN(ts) && ts >= 0 && ts < duration);

/**
 * Generates thumbnails from a video file at specified timestamps.
 */
async function generateThumbnails(inputPath, outputDir, options = {}) {
  const { timestamps: reqTimestamps = ['10%', '50%', '90%'], size = '640x?' } = options;
  const metadata = await ffprobeAsync(inputPath);
  const { duration } = metadata.format;
  if (!duration || duration <= 0) throw new Error('Could not determine video duration.');

  const finalTimestamps = calculateTimestamps(reqTimestamps, duration);
  if (finalTimestamps.length === 0) finalTimestamps.push(duration * 0.1);

  return new Promise((resolve, reject) => {
    let generatedFiles = [];
    ffmpeg(inputPath)
      .on('filenames', (filenames) => generatedFiles = filenames)
      .on('end', () => resolve(generatedFiles.map((f) => path.join(outputDir, f))))
      .on('error', (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)))
      .screenshots({
        timestamps: finalTimestamps,
        filename: 'thumbnail-%s.jpg',
        folder: outputDir,
        size
      });
  });
}

/**
 * Transcodes a video into multiple resolutions.
 */
async function transcodeVideo(inputPath, outputDir, resolutions = [1080, 720, 480]) {
  const outputs = {};
  const metadata = await ffprobeAsync(inputPath);
  const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
  if (!videoStream) throw new Error('Could not find video stream.');

  for (const height of resolutions) {
    if (videoStream.height >= height) {
      const outputPath = path.join(outputDir, `output_${height}p.mp4`);
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions(['-preset medium', '-crf 23'])
          .videoFilter(`scale=-2:${height}`)
          .on('error', (err) => reject(new Error(`Failed to transcode to ${height}p: ${err.message}`)))
          .on('end', resolve)
          .save(outputPath);
      });
      outputs[`${height}p`] = outputPath;
    }
  }
  return outputs;
}

/**
 * Compresses a video for efficient long-term storage.
 */
async function compressVideoForStorage(inputPath, outputPath) {
  await fs.ensureDir(path.dirname(outputPath));
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx265',
        '-preset slow',
        '-crf 28',
        '-c:a aac',
        '-b:a 128k'
      ])
      .output(outputPath)
      .on('error', (err) => reject(new Error(`Storage compression failed: ${err.message}`)))
      .on('end', resolve)
      .run();
  });
}

module.exports = {
  getVideoMetadata,
  generateThumbnails,
  transcodeVideo,
  compressVideoForStorage
};
