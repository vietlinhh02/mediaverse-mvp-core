const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { prisma } = require('../../config/database');
const { getObjectStream, putObjectBuffer } = require('../../services/media/minioMediaStore');
const { cache } = require('../../config/redis');

const execAsync = promisify(exec);

const TEMP_DIR = process.env.TEMP_DIR || path.join(process.cwd(), 'temp', 'video-processing');

// HLS Configuration
const HLS_CONFIGS = [
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' },
  { name: '720p', width: 1280, height: 720, bitrate: '3000k', audioBitrate: '128k' },
  { name: '480p', width: 854, height: 480, bitrate: '1500k', audioBitrate: '128k' },
  { name: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' }
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

    // 4. Generate thumbnail
    console.log('Generating thumbnail...');
    const thumbnailCommand = `ffmpeg -i "${localInputPath}" -ss 00:00:01.000 -vframes 1 "${thumbnailPath}"`;
    await execAsync(thumbnailCommand);
    console.log('Thumbnail generated.');

    // 5. Upload thumbnail to MinIO
    const thumbnailKey = `thumbnails/${contentId}.jpg`;
    const thumbnailBuffer = await fs.readFile(thumbnailPath);
    const thumbnailUrl = await putObjectBuffer(thumbnailKey, thumbnailBuffer, 'image/jpeg');
    console.log(`Thumbnail uploaded to: ${thumbnailUrl}`);

    // 6. Generate HLS streams for each quality
    console.log('Generating HLS streams...');
    const hlsStreams = [];
    
    for (const config of HLS_CONFIGS) {
      console.log(`Processing ${config.name} stream...`);
      const streamDir = path.join(hlsDir, config.name);
      await fs.ensureDir(streamDir);
      
      const playlistPath = path.join(streamDir, 'playlist.m3u8');
      const segmentPattern = path.join(streamDir, 'segment-%03d.ts');
      
      // FFmpeg command for HLS transcoding
      const hlsCommand = `ffmpeg -i "${localInputPath}" ` +
        `-c:v libx264 -c:a aac ` +
        `-b:v ${config.bitrate} -b:a ${config.audioBitrate} ` +
        `-vf scale=${config.width}:${config.height} ` +
        `-f hls -hls_time 10 -hls_list_size 0 ` +
        `-hls_segment_filename "${segmentPattern}" ` +
        `"${playlistPath}"`;
      
      await execAsync(hlsCommand);
      console.log(`${config.name} stream generated.`);
      
      hlsStreams.push({
        name: config.name,
        width: config.width,
        height: config.height,
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
          uploadedFiles: uploadedFiles
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
  
  streams.forEach(stream => {
    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(stream.bitrate) * 1000},RESOLUTION=${stream.width}x${stream.height}\n`;
    playlist += `${stream.name}/playlist.m3u8\n\n`;
  });
  
  return playlist;
}

module.exports = {
  processJob,
};