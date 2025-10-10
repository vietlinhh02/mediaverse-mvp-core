const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { prisma } = require('../../config/database');
const { getObjectStream, putObjectBuffer } = require('../../services/media/minioMediaStore');
const { cache } = require('../../config/redis');

const execAsync = promisify(exec);

const TEMP_DIR = process.env.TEMP_DIR || path.join(process.cwd(), 'temp', 'video-processing');

// HLS Configuration - Simple quality levels only
const HLS_CONFIGS = [
  { name: '1080p', bitrate: '5000k', audioBitrate: '192k' },
  { name: '720p', bitrate: '3000k', audioBitrate: '128k' },
  { name: '480p', bitrate: '1500k', audioBitrate: '128k' },
  { name: '360p', bitrate: '800k', audioBitrate: '96k' }
];

async function processJob(job) {
  const { contentId, sourceObjectKey } = job.payload;
  console.log(`Processing video for contentId: ${contentId}`);

  const tempDir = path.join(TEMP_DIR, contentId);
  const localInputPath = path.join(tempDir, 'input.mp4');
  const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');
  const hlsDir = path.join(tempDir, 'hls');

  try {
    // 1. Update status to 'processing'
    await prisma.content.update({
      where: { id: contentId },
      data: { processingStatus: 'processing' },
    });

    // 2. Create temp directories
    await fs.ensureDir(tempDir);
    await fs.ensureDir(hlsDir);

    // 3. Download from MinIO
    console.log(`Downloading ${sourceObjectKey} to ${localInputPath}...`);
    const readStream = await getObjectStream(sourceObjectKey);
    const writeStream = fs.createWriteStream(localInputPath);
    await new Promise((resolve, reject) => {
        readStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
    console.log('Download complete.');

    // 4. Get video metadata first
    console.log('Getting video metadata...');
    const metadataCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${localInputPath}"`;
    const { stdout: metadataOutput } = await execAsync(metadataCommand);
    const metadata = JSON.parse(metadataOutput);
    
    // Find video stream
    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
    if (!videoStream) {
      throw new Error('No video stream found');
    }
    
    const originalWidth = parseInt(videoStream.width);
    const originalHeight = parseInt(videoStream.height);
    const originalAspectRatio = originalWidth / originalHeight;
    
    console.log(`Original video: ${originalWidth}x${originalHeight} (aspect ratio: ${originalAspectRatio.toFixed(2)})`);

    // 5. Generate thumbnail
    console.log('Generating thumbnail...');
    const thumbnailCommand = `ffmpeg -i "${localInputPath}" -ss 00:00:01.000 -vframes 1 "${thumbnailPath}"`;
    await execAsync(thumbnailCommand);
    console.log('Thumbnail generated.');

    // 6. Upload thumbnail to MinIO
    const thumbnailKey = `thumbnails/${contentId}.jpg`;
    const thumbnailBuffer = await fs.readFile(thumbnailPath);
    const thumbnailUrl = await putObjectBuffer(thumbnailKey, thumbnailBuffer, 'image/jpeg');
    console.log(`Thumbnail uploaded to: ${thumbnailUrl}`);

    // 7. Use all quality levels - maintain original aspect ratio
    const targetConfigs = HLS_CONFIGS;
    console.log(`Original video: ${originalWidth}x${originalHeight} (aspect ratio: ${originalAspectRatio.toFixed(2)})`);
    console.log('Generating all quality levels while maintaining original aspect ratio');

    // 8. Generate HLS streams for selected qualities
    console.log('Generating HLS streams...');
    const hlsStreams = [];
    
    for (const config of targetConfigs) {
      console.log(`Processing ${config.name} stream...`);
      const streamDir = path.join(hlsDir, config.name);
      await fs.ensureDir(streamDir);
      
      const playlistPath = path.join(streamDir, 'playlist.m3u8');
      const segmentPattern = path.join(streamDir, 'segment-%03d.ts');
      
      // Define target resolutions for each quality level
      const targetResolutions = {
        '1080p': { width: 1920, height: 1080 },
        '720p': { width: 1280, height: 720 },
        '480p': { width: 854, height: 480 },
        '360p': { width: 640, height: 360 }
      };

      const target = targetResolutions[config.name];
      const outputWidth = target.width;
      const outputHeight = target.height;
      
      console.log(`${config.name}: ${originalWidth}x${originalHeight} -> ${outputWidth}x${outputHeight} (with padding if needed)`);
      
      // FFmpeg command with scale and pad filters to maintain aspect ratio
      const hlsCommand = `ffmpeg -i "${localInputPath}" ` +
        `-vf "scale=w=${outputWidth}:h=${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2:black" ` +
        `-c:v libx264 -c:a aac ` +
        `-b:v ${config.bitrate} -b:a ${config.audioBitrate} ` +
        `-f hls -hls_time 10 -hls_list_size 0 ` +
        `-hls_segment_filename "${segmentPattern}" ` +
        `"${playlistPath}"`;
      
      await execAsync(hlsCommand);
      console.log(`${config.name} stream generated.`);
      
      hlsStreams.push({
        name: config.name,
        width: outputWidth,
        height: outputHeight,
        bitrate: config.bitrate,
        playlistPath: playlistPath,
        streamDir: streamDir
      });
    }

    // 7. Create master playlist
    console.log('Creating master playlist...');
    const masterPlaylistPath = path.join(hlsDir, 'master.m3u8');
    const masterPlaylist = createMasterPlaylist(hlsStreams);
    await fs.writeFile(masterPlaylistPath, masterPlaylist);
    console.log('Master playlist created.');

    // 8. Upload HLS files to MinIO
    console.log('Uploading HLS files to MinIO...');
    const hlsBaseKey = `hls/${contentId}`;
    const uploadedFiles = [];
    
    // Upload master playlist
    const masterPlaylistBuffer = await fs.readFile(masterPlaylistPath);
    const masterPlaylistKey = `${hlsBaseKey}/master.m3u8`;
    await putObjectBuffer(masterPlaylistKey, masterPlaylistBuffer, 'application/vnd.apple.mpegurl');
    uploadedFiles.push(masterPlaylistKey);
    
    // Upload individual stream files
    for (const stream of hlsStreams) {
      const streamFiles = await fs.readdir(stream.streamDir);
      for (const file of streamFiles) {
        const filePath = path.join(stream.streamDir, file);
        const fileBuffer = await fs.readFile(filePath);
        const fileKey = `${hlsBaseKey}/${stream.name}/${file}`;
        
        const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
        await putObjectBuffer(fileKey, fileBuffer, contentType);
        uploadedFiles.push(fileKey);
      }
    }
    
    console.log(`Uploaded ${uploadedFiles.length} HLS files.`);

    // 9. Update content with HLS URLs and completed status
    const hlsMasterUrl = `s3://videos/${masterPlaylistKey}`;
    const hlsStreamUrls = hlsStreams.map(stream => ({
      name: stream.name,
      width: stream.width,
      height: stream.height,
      bitrate: stream.bitrate,
      playlistUrl: `s3://videos/${hlsBaseKey}/${stream.name}/playlist.m3u8`
    }));

    await prisma.content.update({
      where: { id: contentId },
      data: {
        processingStatus: 'completed',
        featuredImage: thumbnailUrl,
        metadata: {
          ...((await prisma.content.findUnique({ where: { id: contentId } }))?.metadata || {}),
          thumbnailUrl: thumbnailUrl,
          hlsMasterUrl: hlsMasterUrl,
          hlsStreams: hlsStreamUrls,
          uploadedFiles: uploadedFiles,
          // Simple video metadata
          duration: parseFloat(videoStream.duration) || 0,
          resolution: `${originalWidth}x${originalHeight}`,
          fileSize: parseInt(metadata.format.size) || 0
        }
      },
    });
    
    // Clear cache to ensure API returns fresh data
    const cacheKey = `content:${contentId}`;
    await cache.del(cacheKey);
    console.log(`Cache cleared for content: ${contentId}`);
    
    console.log('Content updated successfully with HLS streaming URLs.');

  } catch (error) {
    console.error(`Error processing video for contentId: ${contentId}`, error);
    // Update status to 'failed'
    await prisma.content.update({
      where: { id: contentId },
      data: { 
          processingStatus: 'failed',
          metadata: {
            ...((await prisma.content.findUnique({ where: { id: contentId } }))?.metadata || {}),
            error: error.message,
          }
      },
    });
    
    // Clear cache even on failure to ensure fresh data
    const cacheKey = `content:${contentId}`;
    await cache.del(cacheKey);
    console.log(`Cache cleared for failed content: ${contentId}`);
  } finally {
    // Cleanup local files
    await fs.remove(tempDir).catch(err => console.error(`Failed to delete temp directory: ${err.message}`));
    console.log('Cleanup complete.');
  }
}

function createMasterPlaylist(streams) {
  let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
  
  // Sort streams by bitrate (lowest to highest)
  const sortedStreams = streams.sort((a, b) => parseInt(a.bitrate) - parseInt(b.bitrate));
  
  sortedStreams.forEach(stream => {
    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(stream.bitrate) * 1000},RESOLUTION=${stream.width}x${stream.height},NAME="${stream.name}"\n`;
    playlist += `${stream.name}/playlist.m3u8\n\n`;
  });
  
  return playlist;
}

module.exports = {
  processJob,
};