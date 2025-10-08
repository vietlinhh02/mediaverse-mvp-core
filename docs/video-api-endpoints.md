# Video API Endpoints

> **Documentation Status**: ✅ Updated and verified against actual codebase implementation
> 
> Last updated: January 2025
> 
> This documentation reflects the actual implementation in:
> - `src/modules/content/routes.js` - Route definitions
> - `src/modules/content/videoController.js` - Controller implementation
> - `src/modules/content/validation.js` - Validation schemas
> - `src/modules/content/contentService.js` - Business logic

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
1. [Video Listing](#video-listing)
2. [Video Upload & Management](#video-upload--management)
3. [Video Streaming & Playback](#video-streaming--playback)
4. [Video Processing](#video-processing)
5. [Video Search & Filtering](#video-search--filtering)
6. [Video Analytics](#video-analytics)
7. [Bulk Operations](#bulk-operations)
8. [Common Response Formats](#common-response-formats)
9. [Error Codes](#error-codes)

---

## Video Listing

### 1. Get All Videos
**GET** `/api/content/videos`

Get a paginated list of all videos with filtering and sorting options.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 50)
- `status` (string, optional): Filter by status
  - `published` (default) - Only published videos
  - `draft` - Only draft videos
  - `all` - All statuses
- `visibility` (string, optional): Filter by visibility
  - `public` - Public videos
  - `private` - Private videos
  - `unlisted` - Unlisted videos
  - `all` - All visibilities
  - Default: For published status, shows only `public` and `unlisted` (excludes private)
- `sortBy` (string, optional): Sort order
  - `recent` (default) - Most recent first
  - `oldest` - Oldest first
  - `popular` - Most views first

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "type": "video",
      "title": "string",
      "description": "string",
      "body": "string",
      "category": "string",
      "tags": ["string"],
      "visibility": "public",
      "status": "published",
      "featuredImage": "string",
      "authorId": "string",
      "channelId": "string",
      "createdAt": "2025-10-06T00:00:00.000Z",
      "updatedAt": "2025-10-06T00:00:00.000Z",
      "publishedAt": "2025-10-06T00:00:00.000Z",
      "author": {
        "id": "string",
        "username": "string",
        "profile": {
          "displayName": "string",
          "avatarUrl": "string"
        }
      },
      "channel": {
        "id": "string",
        "name": "string"
      },
      "stats": {
        "views": 1250
      },
      "metadata": {
        "processingStatus": "completed",
        "duration": 1800,
        "resolution": "1920x1080",
        "fileSize": 157286400
      },
      "_count": {
        "likes": 89,
        "comments": 23
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Example Requests

Get first page of published public videos:
```bash
GET /api/content/videos?page=1&limit=20
```

Get all videos (including draft and private):
```bash
GET /api/content/videos?status=all&visibility=all
```

Get most popular videos:
```bash
GET /api/content/videos?sortBy=popular&limit=10
```

Get oldest videos:
```bash
GET /api/content/videos?sortBy=oldest
```

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
  "video": "file", // required, video file (uploaded via uploadMiddleware.singleVideo)
  "title": "string", // required, 5-200 characters
  "description": "string", // optional, max 500 characters
  "category": "string", // required, valid category: technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other
  "tags": "string" or ["string"], // optional, comma-separated string or array, max 10 tags, each max 50 chars
  "visibility": "string", // optional: public, private, unlisted (default: public)
  "status": "string", // optional: draft, published (default: draft)
  "channelId": "string", // optional, channel ID to publish in (must be owned by user)
  "summary": "string", // optional, max 500 characters
  "allowComments": true, // optional, boolean (default: true)
  "useAdaptiveStorage": true // optional, boolean (default: true) - compress for storage, transcode on-demand
}
```

#### Validation Rules
- **title**: Required, minimum 5 characters, maximum 200 characters
- **category**: Required, must be one of the valid categories listed above
- **description**: Optional, maximum 500 characters
- **tags**: Optional, accepts comma-separated string (e.g., "react,javascript,tutorial") or array
  - Maximum 10 tags
  - Each tag maximum 50 characters
- **visibility**: Optional, must be "public", "private", or "unlisted" (default: "public")
- **status**: Optional, must be "draft" or "published" (default: "draft")
- **channelId**: Optional, user must own the channel
- **summary**: Optional, maximum 500 characters
- **allowComments**: Optional, boolean (default: true)
- **useAdaptiveStorage**: Optional, boolean (default: true)

#### Supported Video Formats
- **Video codecs**: H.264, H.265/HEVC, VP9, AV1
- **Audio codecs**: AAC, MP3, Opus
- **Containers**: MP4, WebM, MOV, AVI

#### Response Format
```json
{
  "success": true,
  "message": "Video uploaded successfully. Processing will begin shortly.",
  "data": {
    "id": "string",
    "title": "string",
    "status": "draft",
    "processingStatus": "queued",
    "jobId": "string"
  }
}
```

---

### 2. Get Video
**GET** `/api/content/videos/:id`

Get a specific video by its ID. Increments view count.

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
    "type": "video",
    "title": "string",
    "description": "string",
    "body": "string",
    "category": "string",
    "tags": ["string"],
    "visibility": "public",
    "status": "published",
    "featuredImage": "string",
    "authorId": "string",
    "channelId": "string",
    "createdAt": "2025-09-30T00:00:00.000Z",
    "updatedAt": "2025-09-30T00:00:00.000Z",
    "publishedAt": "2025-09-30T00:00:00.000Z",
    "author": {
      "id": "string",
      "username": "string",
      "profile": {
        "displayName": "string",
        "avatarUrl": "string"
      }
    },
    "channel": {
      "id": "string",
      "name": "string"
    },
    "stats": {
      "views": 1250
    },
    "metadata": {
      "processingStatus": "completed",
      "duration": 1800,
      "resolution": "1920x1080",
      "masterPlaylist": "path/to/master.m3u8",
      "thumbnails": ["url1", "url2", "url3"],
      "fileSize": 157286400,
      "useAdaptiveStorage": true,
      "compressedVideo": "path/to/compressed.mp4"
    },
    "_count": {
      "likes": 89,
      "comments": 23
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
All fields are optional. Only include fields you want to update.

```json
{
  "title": "string",
  "description": "string",
  "category": "string",
  "tags": ["string"] or "string",
  "visibility": "string", // public, private, unlisted
  "useAdaptiveStorage": true
}
```

#### Response Format
```json
{
  "success": true,
  "message": "Video updated successfully",
  "data": {
    // Complete video object (same structure as Get Video response)
  }
}

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

Get HLS video playlist for streaming. Returns the HLS playlist content directly.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Query Parameters
- `res` (string, optional): Video resolution - `480p`, `720p`, `1080p`
  - If provided: Returns the specific resolution's playlist
  - If omitted: Returns the master playlist

#### Headers
- `Authorization` (optional): Bearer token (required for private videos)

#### Response
Returns the HLS playlist file content directly (not JSON).

- **Content-Type**: `application/vnd.apple.mpegurl`
- **Body**: M3U8 playlist content

#### Example Response (Master Playlist)
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=480p
/uploads/videos/segments_vid123/480p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=720p
/uploads/videos/segments_vid123/720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1080p
/uploads/videos/segments_vid123/1080p/playlist.m3u8
```

#### Example Response (Specific Resolution)
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
segment0.ts
#EXTINF:10.0,
segment1.ts
#EXT-X-ENDLIST
```

#### Errors
- `400 INVALID_CONTENT_TYPE`: Content is not a video
- `400 VIDEO_NOT_READY`: Video is not ready for streaming (status not published or processing not completed)
- `404 PLAYLIST_NOT_FOUND`: HLS playlist file not found
- `404 SEGMENTS_NOT_FOUND`: Video segments not found (processing issue)
- `500 STREAMING_PREPARATION_FAILED`: Failed to prepare video for streaming (adaptive storage)

#### Adaptive Storage
If the video uses adaptive storage (`useAdaptiveStorage: true`):
- The system stores a compressed version for storage efficiency
- HLS segments are created on-demand when first requested
- Subsequent requests serve the cached HLS files

---

### 2. Update Video Thumbnail
**PUT** `/api/content/videos/:id/thumbnail`

Update the thumbnail URL for a video.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "thumbnailUrl": "string" // required, URL to the thumbnail image
}
```

#### Authorization
- Video owner can update their own videos
- Admin and moderator roles can update any video

#### Response Format
```json
{
  "success": true,
  "message": "Video thumbnail updated successfully",
  "data": {
    // Complete updated video object
  }
}
```

---

### 3. Get Video Transcript
**GET** `/api/content/videos/:id/transcript`

Get video transcript (placeholder for future speech-to-text implementation).

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Response Format
```json
{
  "success": true,
  "data": {
    "videoId": "string",
    "transcript": null,
    "status": "not_available"
  }
}
```

**Note**: This is a placeholder endpoint. Transcript generation is not yet implemented.
```

---

## Video Processing

### 1. Get Upload Status
**GET** `/api/content/videos/upload-status`

Get video upload and processing status for the authenticated user.

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "activeJobs": 2,
    "maxConcurrentProcessing": 3,
    "queuedJobs": 1,
    "processingJobs": 2,
    "canUpload": true,
    "canProcessImmediately": false,
    "recentJobs": [
      {
        "id": "string",
        "type": "PROCESS_VIDEO",
        "status": "PROCESSING",
        "progress": 45,
        "createdAt": "2025-09-30T00:00:00.000Z"
      }
    ]
  }
}
```

#### Response Fields
- `activeJobs`: Number of active (processing or queued) video processing jobs
- `maxConcurrentProcessing`: Maximum concurrent processing jobs allowed (always 3)
- `queuedJobs`: Number of jobs waiting in queue
- `processingJobs`: Number of jobs currently being processed
- `canUpload`: Whether user can upload videos (always true - unlimited uploads)
- `canProcessImmediately`: Whether new uploads will be processed immediately (true if activeJobs < 3)
- `recentJobs`: Last 10 jobs regardless of status

---

### 2. Reprocess Video
**POST** `/api/content/videos/:id/reprocess`

Reprocess a video (re-transcode, regenerate thumbnails). Admin/moderator only.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token (admin or moderator role required)

#### Request Body
No request body required.

#### Authorization
- Requires admin or moderator role
- Returns `403 UNAUTHORIZED` for regular users

#### Response Format
```json
{
  "success": true,
  "message": "Video queued for reprocessing",
  "data": {
    // Updated video object with reset metadata
  }
}
```

#### Process
1. Resets video status to "draft"
2. Clears processing metadata (error, duration, resolution, thumbnailUrl)
3. Creates new processing job in database
4. Queues video for reprocessing using Bull queue
```

---

### 3. Get Queue Status (Admin)
**GET** `/api/content/admin/queue-status`

Get video processing queue status. Admin/moderator only.

#### Headers
- `Authorization` (required): Bearer token (admin or moderator role required)

#### Authorization
- Requires admin or moderator role
- Returns `403 UNAUTHORIZED` for regular users

#### Response Format
```json
{
  "success": true,
  "data": {
    "queueName": "video-processing",
    "length": 5
  }
}
```

#### Response Fields
- `queueName`: Name of the processing queue (always "video-processing")
- `length`: Number of jobs in the queue
```

---

## Video Search & Filtering

### 1. Search Videos
**GET** `/api/content/videos/search`

Search videos using MeiliSearch. Supports full-text search with relevance ranking.

#### Query Parameters
- `q` (string, optional): Search query (uses "*" for all if not provided)
- `limit` (number, optional): Items per page (default: 20)
- `offset` (number, optional): Number of items to skip (default: 0)
- `sortBy` (string, optional): Sort field - `relevance`, `recent`, `popular`, `oldest` (default: `relevance`)
  - Maps to MeiliSearch sort: `relevance` (default), `publishedAt:desc`, `stats.views:desc`, `publishedAt:asc`
- `filters` (string, optional): MeiliSearch filter string (automatically includes `contentType = video`)

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "tags": ["string"],
      "featuredImage": "string",
      "authorId": "string",
      "publishedAt": "2025-09-30T00:00:00.000Z",
      "stats": {
        "views": 3500
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 75,
    "hasMore": true
  }
}
```

**Note**: The search service automatically removes the `video-` prefix from MeiliSearch IDs to match database UUIDs.

---

### 2. Get Videos by Category
**GET** `/api/content/videos/category/:category`

Get videos filtered by specific category.

#### Parameters
- **Path Parameters:**
  - `category` (string, required): Category name (technology, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other)

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "type": "video",
      "title": "string",
      "description": "string",
      "category": "technology",
      "tags": ["string"],
      "visibility": "public",
      "status": "published",
      "author": {
        "id": "string",
        "username": "string",
        "profile": {
          "displayName": "string",
          "avatarUrl": "string"
        }
      },
      "channel": {
        "id": "string",
        "name": "string"
      },
      "metadata": {
        "duration": 1800,
        "resolution": "1920x1080"
      },
      "_count": {
        "likes": 89,
        "comments": 23
      },
      "createdAt": "2025-09-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
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
- `status` (string, optional): Filter by status - `published`, `draft`, `all` (default: `published`)

#### Headers
- `Authorization` (optional): Bearer token (required for draft videos)

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "type": "video",
      "title": "string",
      "description": "string",
      "category": "string",
      "tags": ["string"],
      "visibility": "public",
      "status": "published",
      "author": {
        "id": "string",
        "username": "string",
        "profile": {
          "displayName": "string",
          "avatarUrl": "string"
        }
      },
      "channel": {
        "id": "string",
        "name": "string"
      },
      "metadata": {
        "duration": 1800,
        "resolution": "1920x1080"
      },
      "_count": {
        "likes": 89,
        "comments": 23
      },
      "createdAt": "2025-09-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

### 4. Get Video Recommendations
**GET** `/api/content/videos/:id/recommendations`

Get videos recommended based on the current video (similar category or tags).

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "type": "video",
      "title": "string",
      "description": "string",
      "category": "string",
      "tags": ["string"],
      "visibility": "public",
      "status": "published",
      "author": {
        "id": "string",
        "username": "string",
        "profile": {
          "displayName": "string",
          "avatarUrl": "string"
        }
      },
      "metadata": {
        "duration": 900
      },
      "_count": {
        "likes": 45,
        "comments": 12
      },
      "createdAt": "2025-09-30T00:00:00.000Z"
    }
  ]
}
```

**Algorithm**: Returns up to 10 published videos (public or unlisted visibility) that share the same category OR have overlapping tags with the current video, sorted by creation date (most recent first).
```

---

## Video Analytics

### 1. Get Video Stats
**GET** `/api/content/videos/:id/stats`

Get detailed analytics for a video. Owner or admin/moderator only.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token

#### Authorization
- Video owner can view stats for their own videos
- Admin and moderator roles can view any video stats
- Returns `403 UNAUTHORIZED` for other users

#### Response Format
```json
{
  "success": true,
  "data": {
    "views": 15400,
    "likes": 890,
    "comments": 156,
    "duration": 1800,
    "resolution": "1920x1080",
    "fileSize": 157286400,
    "processingStatus": "completed",
    "engagementRate": "6.79"
  }
}
```

#### Response Fields
- `views`: Total view count
- `likes`: Total likes count
- `comments`: Total comments count
- `duration`: Video duration in seconds
- `resolution`: Video resolution (e.g., "1920x1080", "unknown")
- `fileSize`: File size in bytes
- `processingStatus`: Processing status - "processing" (draft), "completed" (published), "failed", or "unknown"
- `engagementRate`: Percentage calculated as `(likes + comments) / views * 100` (0 if no views)
```

---

## Bulk Operations

### 1. Bulk Update Videos
**PUT** `/api/content/videos/bulk-update`

Update multiple videos at once. Admin/moderator only.

#### Headers
- `Authorization` (required): Bearer token (admin or moderator role required)
- `Content-Type`: application/json

#### Authorization
- Requires admin or moderator role
- Returns `403 UNAUTHORIZED` for regular users

#### Request Body
```json
{
  "videoIds": ["id1", "id2", "id3"],
  "status": "published",
  "visibility": "public"
}
```

#### Request Fields
- `videoIds` (array, required): Array of video IDs to update
- `status` (string, optional): New status - "draft", "published", "archived"
- `visibility` (string, optional): New visibility - "public", "private", "unlisted"

At least one update field (`status` or `visibility`) must be provided.

#### Response Format
```json
{
  "success": true,
  "message": "3 videos updated successfully",
  "data": [
    {
      // Updated video object 1
    },
    {
      // Updated video object 2
    },
    {
      // Updated video object 3
    }
  ]
}
```

---

## Publishing

### 1. Publish Video
**POST** `/api/content/videos/:id/publish`

Publish a video (change status from draft to published).

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Video ID

#### Headers
- `Authorization` (required): Bearer token

#### Request Body
No request body required.

#### Response Format
```json
{
  "success": true,
  "message": "Video published successfully",
  "data": {
    // Updated video object with status: "published"
  }
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

### Common Errors
- `VALIDATION_ERROR`: 400 - Request validation failed (check details array for field-specific errors)
- `UNAUTHORIZED`: 401 - Authentication required or token invalid
- `FORBIDDEN`: 403 - Insufficient permissions
- `NOT_FOUND`: 404 - Resource not found

### Video-Specific Errors
- `NO_FILE_UPLOADED`: 400 - No video file was uploaded
- `INVALID_CONTENT_TYPE`: 400 - Content is not a video type
- `VIDEO_NOT_READY`: 400 - Video is not ready for streaming (status not published or processing incomplete)
- `CHANNEL_NOT_FOUND`: 404 - Specified channel does not exist
- `SEGMENTS_NOT_FOUND`: 404 - Video segments not found (processing didn't complete properly)
- `PLAYLIST_NOT_FOUND`: 404 - HLS playlist file not found
- `STREAMING_PREPARATION_FAILED`: 500 - Failed to prepare video for streaming

### Validation Error Format
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "title",
      "message": "Video title must be at least 5 characters long",
      "value": "Hi"
    },
    {
      "field": "category",
      "message": "Category is required"
    }
  ]
}
```

### Authorization Error Format
```json
{
  "error": "Unauthorized to perform this action",
  "code": "UNAUTHORIZED",
  "statusCode": 403
}
```

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