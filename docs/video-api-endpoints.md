# Video API Endpoints

This document describes all the video-related endpoints available in the MediaCMS platform.

## Base URL
```
/api/content/videos
```

## Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [Video Upload & Management](#video-upload--management)
2. [Video Streaming & Playback](#video-streaming--playback)
3. [Video Processing](#video-processing)
4. [Video Search & Filtering](#video-search--filtering)
5. [Video Analytics](#video-analytics)
6. [Bulk Operations](#bulk-operations)
7. [Common Response Formats](#common-response-formats)
8. [Error Codes](#error-codes)

---

## Video Upload & Management

### 1. Upload Video
**POST** `/api/content/videos`

Upload a new video file.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: multipart/form-data

#### Request Body (Form Data)
```json
{
  "title": "string", // required, 3-200 characters
  "description": "string", // optional, max 2000 characters
  "category": "string", // required, valid category
  "tags": ["string"], // optional, max 10 tags
  "video": "file", // required, video file (max 2GB)
  "thumbnail": "file", // optional, custom thumbnail image
  "visibility": "string", // public, private, unlisted (default: public)
  "allowComments": true, // boolean (default: true)
  "allowDownload": false, // boolean (default: false)
  "scheduledAt": "2025-09-30T00:00:00.000Z" // optional, future date for scheduling
}
```

#### Supported Video Formats
- **Video codecs**: H.264, H.265/HEVC, VP9, AV1
- **Audio codecs**: AAC, MP3, Opus
- **Containers**: MP4, WebM, MOV, AVI
- **Maximum file size**: 2GB
- **Maximum duration**: 4 hours

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "category": "string",
    "tags": ["string"],
    "visibility": "public",
    "status": "processing",
    "allowComments": true,
    "allowDownload": false,
    "duration": null,
    "fileSize": 157286400,
    "originalFilename": "my-video.mp4",
    "uploadProgress": 100,
    "processingProgress": 0,
    "authorId": "string",
    "createdAt": "2025-09-30T00:00:00.000Z",
    "author": {
      "id": "string",
      "username": "string",
      "profile": {
        "displayName": "string",
        "avatarUrl": "string"
      }
    },
    "processingStatus": {
      "stage": "queued",
      "message": "Video queued for processing",
      "estimatedTime": "5-10 minutes"
    }
  },
  "message": "Video uploaded successfully and queued for processing"
}
```

---

### 2. Get Video
**GET** `/api/content/videos/:id`

Get a specific video by its ID.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (optional): Bearer token (required for private videos)

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "category": "string",
    "tags": ["string"],
    "visibility": "public",
    "status": "published",
    "allowComments": true,
    "allowDownload": false,
    "duration": 1800,
    "fileSize": 157286400,
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "thumbnailUrl": "string",
    "videoUrls": {
      "1080p": "string",
      "720p": "string",
      "480p": "string",
      "360p": "string"
    },
    "streamingUrl": "string",
    "publishedAt": "2025-09-30T00:00:00.000Z",
    "createdAt": "2025-09-30T00:00:00.000Z",
    "updatedAt": "2025-09-30T00:00:00.000Z",
    "author": {
      "id": "string",
      "username": "string",
      "profile": {
        "displayName": "string",
        "avatarUrl": "string"
      }
    },
    "stats": {
      "views": 1250,
      "likes": 89,
      "comments": 23,
      "shares": 12
    }
  }
}
```

---

### 3. Update Video
**PUT** `/api/content/videos/:id`

Update video metadata.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "title": "string", // optional, 3-200 characters
  "description": "string", // optional, max 2000 characters
  "category": "string", // optional, valid category
  "tags": ["string"], // optional, max 10 tags
  "visibility": "string", // optional: public, private, unlisted
  "allowComments": true, // optional, boolean
  "allowDownload": false // optional, boolean
}
```

#### Response Format
Same as Get Video response.

---

### 4. Delete Video
**DELETE** `/api/content/videos/:id`

Delete a video and all its associated files.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

---

## Video Streaming & Playback

### 1. Stream Video
**GET** `/api/content/videos/:id/stream`

Get video streaming URL or stream video directly.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Query Parameters
- `quality` (string, optional): Video quality - `1080p`, `720p`, `480p`, `360p`, `auto` (default: `auto`)
- `format` (string, optional): Streaming format - `hls`, `dash`, `mp4` (default: `hls`)

#### Headers
- `Authorization` (optional): Bearer token (required for private videos)
- `Range` (optional): For HTTP range requests (video seeking)

#### Response Format
```json
{
  "success": true,
  "data": {
    "streamingUrl": "string",
    "format": "hls",
    "quality": "720p",
    "duration": 1800,
    "availableQualities": ["1080p", "720p", "480p", "360p"],
    "subtitles": [
      {
        "language": "en",
        "label": "English",
        "url": "string"
      }
    ]
  }
}
```

#### Direct Streaming
For direct video streaming, the endpoint can also return the video file directly:
- Content-Type: `video/mp4` or appropriate MIME type
- Supports HTTP range requests for seeking
- Includes appropriate cache headers

---

### 2. Update Video Thumbnail
**PUT** `/api/content/videos/:id/thumbnail`

Upload or update a custom thumbnail for the video.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: multipart/form-data

#### Request Body (Form Data)
- `thumbnail` (file, required): Image file (JPEG/PNG, max 5MB)
- `timestamp` (number, optional): Timestamp in seconds to generate thumbnail from video

#### Response Format
```json
{
  "success": true,
  "data": {
    "thumbnailUrl": "string",
    "generatedThumbnails": {
      "small": "string",
      "medium": "string",
      "large": "string"
    }
  },
  "message": "Thumbnail updated successfully"
}
```

---

### 3. Get Video Transcript
**GET** `/api/content/videos/:id/transcript`

Get auto-generated or uploaded transcript for a video.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Query Parameters
- `format` (string, optional): Transcript format - `srt`, `vtt`, `txt` (default: `vtt`)
- `language` (string, optional): Language code (default: `en`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "transcript": "string", // Full transcript text
    "format": "vtt",
    "language": "en",
    "confidence": 0.95,
    "segments": [
      {
        "start": 0.5,
        "end": 3.2,
        "text": "Welcome to this tutorial",
        "confidence": 0.98
      }
    ],
    "downloadUrl": "string"
  }
}
```

---

## Video Processing

### 1. Get Upload Status
**GET** `/api/content/videos/upload-status`

Get status of video uploads for the authenticated user.

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `status` (string, optional): Filter by status - `uploading`, `processing`, `completed`, `failed`

#### Response Format
```json
{
  "success": true,
  "data": {
    "uploads": [
      {
        "id": "string",
        "title": "string",
        "status": "processing",
        "uploadProgress": 100,
        "processingProgress": 45,
        "stage": "transcoding",
        "estimatedTimeRemaining": "3 minutes",
        "createdAt": "2025-09-30T00:00:00.000Z"
      }
    ],
    "summary": {
      "total": 5,
      "uploading": 1,
      "processing": 2,
      "completed": 2,
      "failed": 0
    }
  }
}
```

---

### 2. Reprocess Video
**POST** `/api/content/videos/:id/reprocess`

Reprocess a video (re-transcode, regenerate thumbnails, etc.).

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token

#### Request Body
```json
{
  "tasks": ["transcode", "thumbnails", "transcript"], // optional, specific tasks
  "quality": "1080p", // optional, max quality for transcoding
  "force": false // optional, force reprocessing even if already processed
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "processingJobId": "string",
    "estimatedTime": "5-10 minutes",
    "tasks": ["transcode", "thumbnails", "transcript"]
  },
  "message": "Video queued for reprocessing"
}
```

---

### 3. Get Queue Status (Admin)
**GET** `/api/content/admin/queue-status`

Get video processing queue status (admin only).

#### Headers
- `Authorization` (required): Bearer token (admin role)

#### Response Format
```json
{
  "success": true,
  "data": {
    "queue": {
      "pending": 15,
      "processing": 3,
      "failed": 2,
      "completed": 150
    },
    "workers": {
      "active": 3,
      "idle": 1,
      "total": 4
    },
    "averageProcessingTime": "8 minutes",
    "estimatedWaitTime": "25 minutes"
  }
}
```

---

## Video Search & Filtering

### 1. Search Videos
**GET** `/api/content/videos/search`

Search videos by title, description, or tags.

#### Query Parameters
- `q` (string, required): Search query (1-100 characters)
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `category` (string, optional): Filter by category
- `duration` (string, optional): Filter by duration - `short` (<4min), `medium` (4-20min), `long` (>20min)
- `quality` (string, optional): Filter by quality - `720p`, `1080p`, `4k`
- `author` (string, optional): Filter by author username
- `sortBy` (string, optional): Sort field - `relevance`, `recent`, `popular`, `duration` (default: `relevance`)
- `dateFrom` (string, optional): Filter from date (ISO format)
- `dateTo` (string, optional): Filter to date (ISO format)

#### Response Format
```json
{
  "success": true,
  "data": {
    "query": "javascript tutorial",
    "videos": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "category": "string",
        "duration": 1200,
        "thumbnailUrl": "string",
        "relevanceScore": 95.2,
        "publishedAt": "2025-09-30T00:00:00.000Z",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "stats": {
          "views": 3500,
          "likes": 89,
          "comments": 23
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 75,
      "totalPages": 4,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "category": "education",
      "duration": "medium",
      "quality": "1080p",
      "author": null,
      "dateRange": {
        "from": "2025-09-01T00:00:00.000Z",
        "to": "2025-09-30T23:59:59.999Z"
      }
    }
  }
}
```

---

### 2. Get Videos by Category
**GET** `/api/content/videos/category/:category`

Get videos filtered by specific category.

#### Parameters
- **Path Parameters:**
  - `category` (string, required): Category name

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort field - `recent`, `popular`, `duration` (default: `recent`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "category": "technology",
    "videos": [
      // Video objects
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 3. Get User's Videos
**GET** `/api/content/users/:userId/videos`

Get videos by specific user.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Filter by status - `published`, `processing`, `draft`, `all` (default: `published`)

#### Headers
- `Authorization` (optional): Bearer token (required for private videos or processing status)

#### Response Format
```json
{
  "success": true,
  "data": {
    "videos": [
      // Video objects
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 4. Get Video Recommendations
**GET** `/api/content/videos/:id/recommendations`

Get videos recommended based on the current video.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Query Parameters
- `limit` (number, optional): Number of recommendations (default: 10, max: 20)

#### Response Format
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "duration": 900,
        "thumbnailUrl": "string",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "relevanceScore": 88.5,
        "reason": "Similar content"
      }
    ]
  }
}
```

---

## Video Analytics

### 1. Get Video Stats
**GET** `/api/content/videos/:id/stats`

Get detailed analytics for a video.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `period` (string, optional): Time period - `7d`, `30d`, `90d`, `1y` (default: `30d`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "videoId": "string",
    "period": "30d",
    "stats": {
      "views": {
        "total": 15400,
        "unique": 12200,
        "growth": 22.5,
        "daily": [
          {"date": "2025-09-01", "views": 450},
          {"date": "2025-09-02", "views": 520}
        ]
      },
      "engagement": {
        "likes": 890,
        "comments": 156,
        "shares": 78,
        "averageWatchTime": 8.5,
        "watchTimePercentage": 68.3,
        "completionRate": 45.2
      },
      "playback": {
        "totalWatchTime": 18500,
        "averageSessionDuration": 12.5,
        "retentionCurve": [
          {"time": 0, "retention": 100},
          {"time": 30, "retention": 85},
          {"time": 60, "retention": 72}
        ],
        "qualityDistribution": {
          "1080p": 55,
          "720p": 30,
          "480p": 12,
          "360p": 3
        }
      },
      "traffic": {
        "sources": {
          "direct": 40,
          "search": 35,
          "social": 15,
          "suggested": 10
        },
        "devices": {
          "desktop": 45,
          "mobile": 50,
          "tablet": 5
        }
      }
    }
  }
}
```

---

## Bulk Operations

### 1. Bulk Update Videos
**PUT** `/api/content/videos/bulk-update`

Update multiple videos at once.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "videoIds": ["id1", "id2", "id3"],
  "updates": {
    "category": "education",
    "tags": ["updated", "bulk"],
    "visibility": "public",
    "allowComments": true
  }
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0,
    "details": [
      {
        "id": "id1",
        "status": "success",
        "message": "Video updated successfully"
      }
    ]
  },
  "message": "Bulk update completed"
}
```

---

## Publishing

### 1. Publish Video
**POST** `/api/content/videos/:id/publish`

Publish a processed video.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token

#### Request Body
```json
{
  "scheduledAt": "2025-09-30T00:00:00.000Z" // optional, future date for scheduling
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    // Updated video object with status: "published"
  },
  "message": "Video published successfully"
}
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error message",
      "value": "invalid_value"
    }
  ]
}
```

---

## Error Codes

### Upload Errors
- `FILE_TOO_LARGE`: 400 - Video file exceeds maximum size (2GB)
- `INVALID_VIDEO_FORMAT`: 400 - Unsupported video format
- `UPLOAD_FAILED`: 500 - Video upload failed
- `PROCESSING_FAILED`: 500 - Video processing failed

### Video Errors
- `VIDEO_NOT_FOUND`: 404 - Video not found
- `VIDEO_NOT_READY`: 400 - Video is still processing
- `VIDEO_ALREADY_PUBLISHED`: 400 - Video is already published
- `INVALID_QUALITY`: 400 - Invalid video quality requested

### Permission Errors
- `NOT_VIDEO_OWNER`: 403 - Not the video owner
- `VIDEO_PRIVATE`: 403 - Video is private

---

## JavaScript Examples

### Upload Video with Progress
```javascript
const uploadVideo = async (videoFile, metadata, onProgress) => {
  const formData = new FormData();
  
  // Add video file
  formData.append('video', videoFile);
  
  // Add metadata
  Object.keys(metadata).forEach(key => {
    if (metadata[key] !== undefined) {
      if (Array.isArray(metadata[key])) {
        formData.append(key, JSON.stringify(metadata[key]));
      } else {
        formData.append(key, metadata[key]);
      }
    }
  });
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress?.(percentComplete);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.open('POST', '/api/content/videos');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};
```

### Video Player Integration
```javascript
class VideoPlayer {
  constructor(containerId, videoId) {
    this.container = document.getElementById(containerId);
    this.videoId = videoId;
    this.player = null;
  }

  async initialize() {
    try {
      const response = await fetch(`/api/content/videos/${this.videoId}/stream`);
      const data = await response.json();
      
      if (data.success) {
        this.setupPlayer(data.data);
      }
    } catch (error) {
      console.error('Failed to initialize video player:', error);
    }
  }

  setupPlayer(streamData) {
    this.player = document.createElement('video');
    this.player.controls = true;
    this.player.src = streamData.streamingUrl;
    
    // Add quality selector
    if (streamData.availableQualities.length > 1) {
      this.addQualitySelector(streamData.availableQualities);
    }
    
    // Add subtitles
    streamData.subtitles?.forEach(subtitle => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.src = subtitle.url;
      track.srclang = subtitle.language;
      track.label = subtitle.label;
      this.player.appendChild(track);
    });
    
    this.container.appendChild(this.player);
  }

  addQualitySelector(qualities) {
    const selector = document.createElement('select');
    qualities.forEach(quality => {
      const option = document.createElement('option');
      option.value = quality;
      option.textContent = quality;
      selector.appendChild(option);
    });
    
    selector.addEventListener('change', (e) => {
      this.changeQuality(e.target.value);
    });
    
    this.container.appendChild(selector);
  }

  async changeQuality(quality) {
    const currentTime = this.player.currentTime;
    const response = await fetch(`/api/content/videos/${this.videoId}/stream?quality=${quality}`);
    const data = await response.json();
    
    if (data.success) {
      this.player.src = data.data.streamingUrl;
      this.player.currentTime = currentTime;
    }
  }
}

// Usage
const player = new VideoPlayer('video-container', 'video-id');
player.initialize();
```

This documentation provides comprehensive information for frontend developers to integrate with the MediaCMS video management system.