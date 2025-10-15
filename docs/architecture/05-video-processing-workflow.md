# MediaVerse MVP - Video Processing Workflow

## 1. Giới Thiệu

Video Processing là hệ thống xử lý video bất đồng bộ, chuyển đổi video upload thành nhiều chất lượng khác nhau và tạo HLS (HTTP Live Streaming) để phát video adaptive.

### Tính Năng Chính
- **Multi-quality transcoding** - Chuyển đổi sang 4 mức chất lượng (1080p, 720p, 480p, 360p)
- **HLS Adaptive Streaming** - Phát video tự động điều chỉnh chất lượng
- **Thumbnail Generation** - Tạo ảnh thumbnail tự động
- **Metadata Extraction** - Trích xuất thông tin video
- **Background Processing** - Xử lý bất đồng bộ với Bull Queue
- **MinIO Storage** - Lưu trữ file trên S3-compatible storage

## 2. Kiến Trúc Tổng Quan

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[Client Application]
    end
    
    subgraph "API Layer"
        UPLOAD_API[Upload API]
        CONTENT_API[Content API]
    end
    
    subgraph "Queue System"
        REDIS[(Redis Queue)]
        VIDEO_QUEUE[Video Processing Queue]
    end
    
    subgraph "Worker Layer"
        WORKER[Video Processing Worker]
        
        subgraph "Processing Steps"
            DOWNLOAD[1. Download Video]
            METADATA[2. Extract Metadata]
            THUMBNAIL[3. Generate Thumbnail]
            TRANSCODE[4. Transcode Multi-Quality]
            HLS[5. Generate HLS]
            UPLOAD[6. Upload to MinIO]
        end
    end
    
    subgraph "Storage Layer"
        MINIO[(MinIO S3 Storage)]
        POSTGRES[(PostgreSQL)]
    end
    
    CLIENT --> UPLOAD_API
    UPLOAD_API --> MINIO
    UPLOAD_API --> VIDEO_QUEUE
    VIDEO_QUEUE --> REDIS
    REDIS --> WORKER
    
    WORKER --> DOWNLOAD
    DOWNLOAD --> METADATA
    METADATA --> THUMBNAIL
    THUMBNAIL --> TRANSCODE
    TRANSCODE --> HLS
    HLS --> UPLOAD
    
    UPLOAD --> MINIO
    WORKER --> POSTGRES
    
    CLIENT --> CONTENT_API
    CONTENT_API --> POSTGRES
    CONTENT_API --> MINIO
    
    style WORKER fill:#61dafb,stroke:#333,stroke-width:2px
    style REDIS fill:#dc382d,stroke:#333,stroke-width:2px
    style MINIO fill:#c72e49,stroke:#333,stroke-width:2px
```

## 3. Video Processing Pipeline

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Queue
    participant Worker
    participant FFmpeg
    participant MinIO
    participant Database
    
    Client->>API: Upload Video
    API->>MinIO: Store Original Video
    MinIO-->>API: S3 Object Key
    
    API->>Database: Create Content Record<br/>(status: processing)
    API->>Queue: Enqueue Processing Job
    Queue-->>API: Job ID
    API-->>Client: Upload Success + Job ID
    
    Note over Worker: Worker picks job from queue
    
    Worker->>Queue: Pop Job
    Queue-->>Worker: Job Data
    
    Worker->>Database: Update status: processing
    
    Worker->>MinIO: Download Original Video
    MinIO-->>Worker: Video Stream
    
    Worker->>FFmpeg: Extract Metadata
    FFmpeg-->>Worker: Video Info<br/>(resolution, duration, etc)
    
    Worker->>FFmpeg: Generate Thumbnail<br/>(frame at 1 second)
    FFmpeg-->>Worker: Thumbnail Image
    
    Worker->>MinIO: Upload Thumbnail
    MinIO-->>Worker: Thumbnail URL
    
    loop For each quality (1080p, 720p, 480p, 360p)
        Worker->>FFmpeg: Transcode to Quality
        FFmpeg-->>Worker: Transcoded Stream
        
        Worker->>FFmpeg: Generate HLS Segments
        FFmpeg-->>Worker: .m3u8 + .ts files
        
        Worker->>MinIO: Upload HLS Files
        MinIO-->>Worker: Upload Success
    end
    
    Worker->>Worker: Create Master Playlist
    Worker->>MinIO: Upload Master Playlist
    MinIO-->>Worker: Master Playlist URL
    
    Worker->>Database: Update Content<br/>(status: completed,<br/>thumbnailUrl,<br/>hlsMasterUrl,<br/>hlsStreams)
    
    Worker->>Database: Clear Cache
    
    Note over Client: Client polls or receives notification
    Client->>API: Get Content Status
    API->>Database: Query Content
    Database-->>API: Content Data
    API-->>Client: Processing Complete + URLs
```

## 4. Queue System Architecture

```mermaid
graph LR
    subgraph "Job Enqueueing"
        A[Upload Complete] --> B[Create Job Payload]
        B --> C{Has User ID?}
        C -->|Yes| D[User-Specific Queue]
        C -->|No| E[Fetch User from Content]
        E --> D
        D --> F[Push to Redis Queue]
    end
    
    subgraph "Queue Registry"
        F --> G[Register Queue Name]
        G --> H[Redis Set:<br/>video-processing:queues]
    end
    
    subgraph "Worker Pool"
        H --> I[Worker 1]
        H --> J[Worker 2]
        H --> K[Worker N]
    end
    
    I --> L[Process Job]
    J --> L
    K --> L
    
    style F fill:#dc382d,stroke:#333,stroke-width:2px
    style L fill:#61dafb,stroke:#333,stroke-width:2px
```

### Queue Implementation

```javascript
// src/jobs/queues/videoQueue.js
const { queue, redisQueue } = require('../../config/redis');
const { prisma } = require('../../config/database');

const VIDEO_QUEUE_BASE = 'video-processing';
const REGISTRY_KEY = 'set:video-processing:queues';

function getUserQueueName(userId) {
  return `${VIDEO_QUEUE_BASE}:user:${userId}`;
}

async function enqueueProcessVideo(_q, payload) {
  const jobId = uuidv7();
  let userId = payload.userId;
  
  if (!userId) {
    // Fallback: fetch authorId from content
    const content = await prisma.content.findUnique({ 
      where: { id: payload.contentId }, 
      select: { authorId: true } 
    });
    userId = content?.authorId;
  }
  
  const queueName = userId ? getUserQueueName(userId) : VIDEO_QUEUE_BASE;
  const job = { 
    id: jobId, 
    type: 'PROCESS_VIDEO', 
    payload: { ...payload, userId } 
  };
  
  // Register this per-user queue for workers discovery
  await redisQueue.sAdd(REGISTRY_KEY, queueName);
  await queue.push(queueName, job);
  
  return { jobId };
}
```

## 5. Video Processing Worker

```mermaid
flowchart TD
    START[Start Job Processing] --> UPDATE_STATUS[Update Status: processing]
    UPDATE_STATUS --> CREATE_TEMP[Create Temp Directories]
    CREATE_TEMP --> DOWNLOAD[Download from MinIO]
    
    DOWNLOAD --> GET_METADATA[Get Video Metadata<br/>using FFprobe]
    GET_METADATA --> EXTRACT_INFO[Extract:<br/>- Width/Height<br/>- Duration<br/>- Aspect Ratio<br/>- File Size]
    
    EXTRACT_INFO --> GEN_THUMB[Generate Thumbnail<br/>at 1 second]
    GEN_THUMB --> UPLOAD_THUMB[Upload Thumbnail to MinIO]
    
    UPLOAD_THUMB --> DETERMINE_QUALITY{Determine<br/>Quality Levels}
    DETERMINE_QUALITY --> PROCESS_1080[Process 1080p<br/>1920x1080, 5000k]
    DETERMINE_QUALITY --> PROCESS_720[Process 720p<br/>1280x720, 3000k]
    DETERMINE_QUALITY --> PROCESS_480[Process 480p<br/>854x480, 1500k]
    DETERMINE_QUALITY --> PROCESS_360[Process 360p<br/>640x360, 800k]
    
    PROCESS_1080 --> TRANSCODE_1080[FFmpeg Transcode<br/>+ Scale with Padding]
    PROCESS_720 --> TRANSCODE_720[FFmpeg Transcode<br/>+ Scale with Padding]
    PROCESS_480 --> TRANSCODE_480[FFmpeg Transcode<br/>+ Scale with Padding]
    PROCESS_360 --> TRANSCODE_360[FFmpeg Transcode<br/>+ Scale with Padding]
    
    TRANSCODE_1080 --> HLS_1080[Generate HLS Segments<br/>.m3u8 + .ts files]
    TRANSCODE_720 --> HLS_720[Generate HLS Segments<br/>.m3u8 + .ts files]
    TRANSCODE_480 --> HLS_480[Generate HLS Segments<br/>.m3u8 + .ts files]
    TRANSCODE_360 --> HLS_360[Generate HLS Segments<br/>.m3u8 + .ts files]
    
    HLS_1080 --> UPLOAD_HLS
    HLS_720 --> UPLOAD_HLS
    HLS_480 --> UPLOAD_HLS
    HLS_360 --> UPLOAD_HLS
    
    UPLOAD_HLS[Upload All HLS Files] --> CREATE_MASTER[Create Master Playlist]
    CREATE_MASTER --> UPLOAD_MASTER[Upload Master Playlist]
    
    UPLOAD_MASTER --> UPDATE_DB[Update Database:<br/>- status: completed<br/>- thumbnailUrl<br/>- hlsMasterUrl<br/>- hlsStreams<br/>- metadata]
    
    UPDATE_DB --> CLEAR_CACHE[Clear Redis Cache]
    CLEAR_CACHE --> CLEANUP[Cleanup Temp Files]
    CLEANUP --> SUCCESS[Processing Success]
    
    GET_METADATA -->|Error| ERROR_HANDLER[Error Handler]
    GEN_THUMB -->|Error| ERROR_HANDLER
    TRANSCODE_1080 -->|Error| ERROR_HANDLER
    
    ERROR_HANDLER --> UPDATE_FAILED[Update Status: failed<br/>+ error message]
    UPDATE_FAILED --> CLEAR_CACHE_ERROR[Clear Cache]
    CLEAR_CACHE_ERROR --> CLEANUP_ERROR[Cleanup Files]
    CLEANUP_ERROR --> FAILED[Processing Failed]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style SUCCESS fill:#90EE90,stroke:#333,stroke-width:2px
    style FAILED fill:#FFB6C1,stroke:#333,stroke-width:2px
    style ERROR_HANDLER fill:#FFB6C1,stroke:#333,stroke-width:2px
```

### Worker Implementation Core

```javascript
// src/jobs/workers/videoProcessing.worker.js
const HLS_CONFIGS = [
  { name: '1080p', bitrate: '5000k', audioBitrate: '192k' },
  { name: '720p', bitrate: '3000k', audioBitrate: '128k' },
  { name: '480p', bitrate: '1500k', audioBitrate: '128k' },
  { name: '360p', bitrate: '800k', audioBitrate: '96k' }
];

async function processJob(job) {
  const { contentId, sourceObjectKey } = job.payload;
  
  const tempDir = path.join(TEMP_DIR, contentId);
  const localInputPath = path.join(tempDir, 'input.mp4');
  const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');
  const hlsDir = path.join(tempDir, 'hls');
  
  try {
    // 1. Update status to 'processing'
    await prisma.content.update({
      where: { id: contentId },
      data: { processingStatus: 'processing' }
    });
    
    // 2. Create temp directories
    await fs.ensureDir(tempDir);
    await fs.ensureDir(hlsDir);
    
    // 3. Download from MinIO
    const readStream = await getObjectStream(sourceObjectKey);
    const writeStream = fs.createWriteStream(localInputPath);
    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // 4. Get video metadata using FFprobe
    const metadataCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${localInputPath}"`;
    const { stdout: metadataOutput } = await execAsync(metadataCommand);
    const metadata = JSON.parse(metadataOutput);
    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    
    const originalWidth = parseInt(videoStream.width);
    const originalHeight = parseInt(videoStream.height);
    const originalAspectRatio = originalWidth / originalHeight;
    
    // 5. Generate thumbnail at 1 second
    const thumbnailCommand = `ffmpeg -i "${localInputPath}" -ss 00:00:01.000 -vframes 1 "${thumbnailPath}"`;
    await execAsync(thumbnailCommand);
    
    // 6. Upload thumbnail to MinIO
    const thumbnailKey = `thumbnails/${contentId}.jpg`;
    const thumbnailBuffer = await fs.readFile(thumbnailPath);
    const thumbnailUrl = await putObjectBuffer(thumbnailKey, thumbnailBuffer, 'image/jpeg');
    
    // 7. Process all quality levels
    const hlsStreams = [];
    for (const config of HLS_CONFIGS) {
      const streamDir = path.join(hlsDir, config.name);
      await fs.ensureDir(streamDir);
      
      const playlistPath = path.join(streamDir, 'playlist.m3u8');
      const segmentPattern = path.join(streamDir, 'segment-%03d.ts');
      
      // Target resolutions
      const targetResolutions = {
        '1080p': { width: 1920, height: 1080 },
        '720p': { width: 1280, height: 720 },
        '480p': { width: 854, height: 480 },
        '360p': { width: 640, height: 360 }
      };
      
      const target = targetResolutions[config.name];
      
      // FFmpeg command with scale and pad to maintain aspect ratio
      const hlsCommand = `ffmpeg -i "${localInputPath}" ` +
        `-vf "scale=w=${target.width}:h=${target.height}:force_original_aspect_ratio=decrease,pad=${target.width}:${target.height}:(ow-iw)/2:(oh-ih)/2:black" ` +
        `-c:v libx264 -c:a aac ` +
        `-b:v ${config.bitrate} -b:a ${config.audioBitrate} ` +
        `-f hls -hls_time 10 -hls_list_size 0 ` +
        `-hls_segment_filename "${segmentPattern}" ` +
        `"${playlistPath}"`;
      
      await execAsync(hlsCommand);
      
      hlsStreams.push({
        name: config.name,
        width: target.width,
        height: target.height,
        bitrate: config.bitrate,
        playlistPath,
        streamDir
      });
    }
    
    // 8. Create and upload master playlist
    const masterPlaylist = createMasterPlaylist(hlsStreams);
    const masterPlaylistPath = path.join(hlsDir, 'master.m3u8');
    await fs.writeFile(masterPlaylistPath, masterPlaylist);
    
    // 9. Upload all HLS files to MinIO
    const hlsBaseKey = `hls/${contentId}`;
    const uploadedFiles = [];
    
    // Upload master playlist
    const masterBuffer = await fs.readFile(masterPlaylistPath);
    await putObjectBuffer(`${hlsBaseKey}/master.m3u8`, masterBuffer, 'application/vnd.apple.mpegurl');
    
    // Upload stream files
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
    
    // 10. Update database with results
    await prisma.content.update({
      where: { id: contentId },
      data: {
        processingStatus: 'completed',
        featuredImage: thumbnailUrl,
        metadata: {
          thumbnailUrl,
          hlsMasterUrl: `s3://videos/${hlsBaseKey}/master.m3u8`,
          hlsStreams: hlsStreams.map(s => ({
            name: s.name,
            width: s.width,
            height: s.height,
            bitrate: s.bitrate,
            playlistUrl: `s3://videos/${hlsBaseKey}/${s.name}/playlist.m3u8`
          })),
          uploadedFiles,
          duration: parseFloat(videoStream.duration) || 0,
          resolution: `${originalWidth}x${originalHeight}`,
          fileSize: parseInt(metadata.format.size) || 0
        }
      }
    });
    
    // 11. Clear cache
    await cache.del(`content:${contentId}`);
    
  } catch (error) {
    // Update status to failed
    await prisma.content.update({
      where: { id: contentId },
      data: { 
        processingStatus: 'failed',
        metadata: { error: error.message }
      }
    });
    await cache.del(`content:${contentId}`);
  } finally {
    // Cleanup temp files
    await fs.remove(tempDir);
  }
}

function createMasterPlaylist(streams) {
  let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
  const sorted = streams.sort((a, b) => parseInt(a.bitrate) - parseInt(b.bitrate));
  
  sorted.forEach(stream => {
    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(stream.bitrate) * 1000},RESOLUTION=${stream.width}x${stream.height},NAME="${stream.name}"\n`;
    playlist += `${stream.name}/playlist.m3u8\n\n`;
  });
  
  return playlist;
}
```

## 6. HLS Structure

```mermaid
graph TB
    subgraph "MinIO Storage Structure"
        ROOT[hls/contentId/]
        
        ROOT --> MASTER[master.m3u8<br/>Master Playlist]
        
        ROOT --> Q1080[1080p/]
        ROOT --> Q720[720p/]
        ROOT --> Q480[480p/]
        ROOT --> Q360[360p/]
        
        Q1080 --> P1080[playlist.m3u8]
        Q1080 --> S1080[segment-000.ts<br/>segment-001.ts<br/>segment-002.ts<br/>...]
        
        Q720 --> P720[playlist.m3u8]
        Q720 --> S720[segment-000.ts<br/>segment-001.ts<br/>segment-002.ts<br/>...]
        
        Q480 --> P480[playlist.m3u8]
        Q480 --> S480[segment-000.ts<br/>segment-001.ts<br/>segment-002.ts<br/>...]
        
        Q360 --> P360[playlist.m3u8]
        Q360 --> S360[segment-000.ts<br/>segment-001.ts<br/>segment-002.ts<br/>...]
    end
    
    style MASTER fill:#FFD700,stroke:#333,stroke-width:2px
```

### Master Playlist Example

```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,NAME="360p"
360p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480,NAME="480p"
480p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720,NAME="720p"
720p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME="1080p"
1080p/playlist.m3u8
```

### Individual Stream Playlist Example

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0

#EXTINF:10.0,
segment-000.ts
#EXTINF:10.0,
segment-001.ts
#EXTINF:10.0,
segment-002.ts
#EXT-X-ENDLIST
```

## 7. FFmpeg Commands Reference

### Extract Metadata
```bash
ffprobe -v quiet -print_format json -show_format -show_streams "input.mp4"
```

### Generate Thumbnail
```bash
ffmpeg -i "input.mp4" -ss 00:00:01.000 -vframes 1 "thumbnail.jpg"
```

### Transcode with Scale and Padding (Maintain Aspect Ratio)
```bash
ffmpeg -i "input.mp4" \
  -vf "scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 -c:a aac \
  -b:v 5000k -b:a 192k \
  -f hls -hls_time 10 -hls_list_size 0 \
  -hls_segment_filename "segment-%03d.ts" \
  "playlist.m3u8"
```

## 8. Processing Status Flow

```mermaid
stateDiagram-v2
    [*] --> pending: Video Uploaded
    pending --> processing: Worker Starts
    
    processing --> completed: Success
    processing --> failed: Error
    
    failed --> processing: Retry
    completed --> [*]
    failed --> [*]: Max Retries
    
    note right of processing
        Worker processing:
        - Download
        - Metadata extraction
        - Thumbnail generation
        - Multi-quality transcode
        - HLS generation
        - Upload to MinIO
    end note
    
    note right of completed
        Database updated with:
        - thumbnailUrl
        - hlsMasterUrl
        - hlsStreams[]
        - metadata
    end note
    
    note right of failed
        Database updated with:
        - error message
        - failed timestamp
    end note
```

## 9. Quality Selection Logic

```mermaid
flowchart TD
    START[Original Video] --> GET_RES[Get Resolution<br/>Width x Height]
    
    GET_RES --> ASPECT[Calculate Aspect Ratio]
    
    ASPECT --> ALL[Generate All Qualities:<br/>1080p, 720p, 480p, 360p]
    
    ALL --> SCALE_1080[1080p: Scale to 1920x1080<br/>with padding if needed]
    ALL --> SCALE_720[720p: Scale to 1280x720<br/>with padding if needed]
    ALL --> SCALE_480[480p: Scale to 854x480<br/>with padding if needed]
    ALL --> SCALE_360[360p: Scale to 640x360<br/>with padding if needed]
    
    SCALE_1080 --> OUTPUT
    SCALE_720 --> OUTPUT
    SCALE_480 --> OUTPUT
    SCALE_360 --> OUTPUT
    
    OUTPUT[All Qualities Available]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style OUTPUT fill:#90EE90,stroke:#333,stroke-width:2px
```

**Lưu ý**: Hệ thống luôn tạo tất cả 4 mức chất lượng, sử dụng scale filter với padding để duy trì tỷ lệ khung hình gốc.

## 10. Error Handling

```mermaid
flowchart TD
    ERROR[Processing Error] --> LOG[Log Error Details]
    LOG --> UPDATE_STATUS[Update Content Status: failed]
    UPDATE_STATUS --> STORE_ERROR[Store Error in Metadata]
    STORE_ERROR --> CLEAR_CACHE[Clear Redis Cache]
    CLEAR_CACHE --> CLEANUP[Cleanup Temp Files]
    CLEANUP --> NOTIFY{Retry Available?}
    
    NOTIFY -->|Yes, < Max Retries| REQUEUE[Re-enqueue Job]
    NOTIFY -->|No| SEND_NOTIFICATION[Send Error Notification<br/>to Content Owner]
    
    REQUEUE --> END[End - Will Retry]
    SEND_NOTIFICATION --> END2[End - Failed]
    
    style ERROR fill:#FFB6C1,stroke:#333,stroke-width:2px
    style SEND_NOTIFICATION fill:#FFB6C1,stroke:#333,stroke-width:2px
```

### Common Errors

| Error Type | Cause | Solution |
|------------|-------|----------|
| **Download Failed** | MinIO connection issue, invalid object key | Check MinIO connection, verify object exists |
| **FFprobe Failed** | Corrupted video, unsupported format | Validate video file before upload |
| **Transcode Failed** | Insufficient resources, codec issues | Check server resources, FFmpeg installation |
| **Upload Failed** | MinIO storage full, network issue | Check storage capacity, network connectivity |
| **Timeout** | Video too large, slow processing | Increase timeout, optimize worker resources |

## 11. Performance Optimization

### Parallel Processing
```javascript
// Process multiple quality levels in parallel
const transcodePromises = HLS_CONFIGS.map(config => 
  transcodeQuality(inputPath, config)
);
await Promise.all(transcodePromises);
```

### Resource Management
- **CPU**: FFmpeg uses multiple threads by default
- **Memory**: Limit concurrent jobs per worker
- **Disk**: Regular cleanup of temp files
- **Network**: Stream large files instead of loading into memory

### Scaling Strategy
```mermaid
graph LR
    A[High Upload Volume] --> B[Horizontal Scaling]
    B --> C[Add More Workers]
    C --> D[Worker Pool Balancing]
    
    A --> E[Vertical Scaling]
    E --> F[Increase Worker Resources]
    F --> G[More CPU/RAM per Worker]
    
    style A fill:#FFB6C1,stroke:#333,stroke-width:2px
    style C fill:#90EE90,stroke:#333,stroke-width:2px
    style F fill:#90EE90,stroke:#333,stroke-width:2px
```

## 12. Monitoring & Metrics

### Key Metrics to Track

```mermaid
graph TB
    subgraph "Processing Metrics"
        A[Average Processing Time]
        B[Success Rate]
        C[Failure Rate]
        D[Queue Length]
    end
    
    subgraph "Resource Metrics"
        E[CPU Usage]
        F[Memory Usage]
        G[Disk I/O]
        H[Network Bandwidth]
    end
    
    subgraph "Quality Metrics"
        I[Transcoding Quality]
        J[File Size Reduction]
        K[Bitrate Accuracy]
    end
    
    style B fill:#90EE90,stroke:#333,stroke-width:2px
    style C fill:#FFB6C1,stroke:#333,stroke-width:2px
```

### Monitoring Implementation
```javascript
// Track processing time
const startTime = Date.now();
await processJob(job);
const duration = Date.now() - startTime;

await redis.hSet(`metrics:video-processing:${contentId}`, {
  duration,
  timestamp: new Date().toISOString(),
  status: 'completed',
  qualitiesGenerated: hlsStreams.length
});
```

## 13. Tài Liệu Liên Quan

- [00 - System Overview](./00-overview.md)
- [03 - Content Management Workflow](./03-content-workflow.md)
- [06 - Recommendation System](./06-recommendation-system.md)
- [10 - Database Schema](./10-database-schema.md)
