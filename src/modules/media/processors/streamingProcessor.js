const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');

const ffprobeAsync = promisify(ffmpeg.ffprobe);

/**
 * Creates HLS (HTTP Live Streaming) files from a video.
 */
async function createHLS(inputPath, outputDir, customResolutions) {
  await fs.ensureDir(outputDir);

  const resolutions = customResolutions || [
    {
      name: '360p', height: 360, vb: '800k', ab: '96k'
    },
    {
      name: '480p', height: 480, vb: '1400k', ab: '128k'
    },
    {
      name: '720p', height: 720, vb: '2800k', ab: '128k'
    },
    {
      name: '1080p', height: 1080, vb: '5000k', ab: '192k'
    }
  ];

  const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
  let masterPlaylistContent = '#EXTM3U\n#EXT-X-VERSION:3\n';

  const metadata = await ffprobeAsync(inputPath);
  const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
  const aspectRatio = videoStream.width / videoStream.height;

  for (const res of resolutions) {
    if (videoStream.height >= res.height) {
      const resDir = path.join(outputDir, res.name);
      await fs.ensureDir(resDir);
      const playlistPath = path.join(resDir, 'playlist.m3u8');
      const width = Math.round(res.height * aspectRatio);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            `-vf scale='trunc(oh*a/2)*2:${res.height}'`,
            '-c:a aac', `-b:a ${res.ab}`,
            '-c:v libx264', '-preset medium', `-b:v ${res.vb}`,
            '-g 48', '-sc_threshold 0',
            '-hls_time 6', '-hls_playlist_type vod',
            '-hls_segment_filename', path.join(resDir, 'segment%03d.ts')
          ])
          .output(playlistPath)
          .on('error', (err) => reject(new Error(`Failed to create HLS for ${res.name}: ${err.message}`)))
          .on('end', resolve)
          .run();
      });
      masterPlaylistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(res.vb, 10) * 1000},RESOLUTION=${width}x${res.height}\n${res.name}/playlist.m3u8\n`;
    }
  }

  await fs.writeFile(masterPlaylistPath, masterPlaylistContent);
  return masterPlaylistPath;
}

/**
 * Creates DASH (Dynamic Adaptive Streaming over HTTP) files from a video.
 */
async function createDASH(inputPath, outputDir) {
  await fs.ensureDir(outputDir);
  const manifestPath = path.join(outputDir, 'manifest.mpd');

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-preset slow', '-g 48', '-sc_threshold 0',
        '-map 0:v:0', '-map 0:a:0',
        '-map 0:v:0', '-map 0:a:0',
        '-b:v:0 800k', '-s:v:0 640x360',
        '-b:v:1 2800k', '-s:v:1 1280x720',
        '-c:a aac', '-b:a 128k',
        '-c:v libx264',
        '-f dash', '-seg_duration 6',
        '-use_template 1', '-use_timeline 1',
        '-init_seg_name init-$RepresentationID$.m4s',
        '-media_seg_name chunk-$RepresentationID$-$Number%05d$.m4s'
      ])
      .output(manifestPath)
      .on('error', (err) => reject(new Error(`Failed to create DASH manifest: ${err.message}`)))
      .on('end', resolve)
      .run();
  });

  return manifestPath;
}

module.exports = {
  createHLS,
  createDASH
};
