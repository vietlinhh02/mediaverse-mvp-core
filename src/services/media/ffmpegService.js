const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const fs = require('fs-extra');
const path = require('path');

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath);

async function probe(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

async function ensureDir(dir) {
  await fs.mkdirp(dir);
}

async function generateThumbnails(inputPath, outDir, count = 3) {
  await ensureDir(outDir);
  return new Promise((resolve, reject) => {
    const filenames = [];
    ffmpeg(inputPath)
      .on('filenames', (names) => {
        names.forEach((n) => filenames.push(path.join(outDir, n)));
      })
      .on('end', () => resolve(filenames))
      .on('error', (err) => reject(err))
      .screenshots({
        count,
        folder: outDir,
        filename: 'thumb-%i.png',
        size: '640x?' // auto height
      });
  });
}

async function transcodeHLS(inputPath, outDir, variants = [
  { name: '480p', width: 854, height: 480, bitrate: '800k', maxrate: '856k', bufsize: '1200k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2000k', maxrate: '2140k', bufsize: '3000k' },
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', maxrate: '5350k', bufsize: '7500k' }
]) {
  await ensureDir(outDir);

  const masterPath = path.join(outDir, 'master.m3u8');
  const variantOutputs = variants.map((v) => ({
    name: v.name,
    playlist: path.join(outDir, v.name, 'playlist.m3u8')
  }));

  await Promise.all(variants.map(async (v) => {
    const variantDir = path.join(outDir, v.name);
    await ensureDir(variantDir);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=w=${v.width}:h=${v.height}:force_original_aspect_ratio=decrease`,
          '-c:a aac',
          '-ar 48000',
          '-c:v h264',
          `-b:v ${v.bitrate}`,
          `-maxrate ${v.maxrate}`,
          `-bufsize ${v.bufsize}`,
          '-hls_time 6',
          '-hls_playlist_type vod',
          '-hls_segment_filename', path.join(variantDir, 'segment-%03d.ts')
        ])
        .output(path.join(variantDir, 'playlist.m3u8'))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }));

  // Build master playlist
  const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  variants.forEach((v) => {
    const bandwidth = v.name === '480p' ? 800000 : (v.name === '720p' ? 2000000 : 5000000);
    masterLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${v.width}x${v.height}`);
    masterLines.push(`${v.name}/playlist.m3u8`);
  });
  await fs.writeFile(masterPath, masterLines.join('\n'));

  return { masterPath, variantOutputs };
}

module.exports = {
  probe,
  generateThumbnails,
  transcodeHLS
};


