# Video Upload API Documentation

> **Tài liệu chi tiết về Video Endpoints và Upload System**
> 
> Cập nhật: Tháng 1, 2025
> 
> Tài liệu này mô tả đầy đủ các endpoint video và hệ thống upload chunked của MediaCMS platform.

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Video Management Endpoints](#video-management-endpoints)
3. [Chunked Upload System](#chunked-upload-system)
4. [Validation Rules](#validation-rules)
5. [Error Codes](#error-codes)
6. [Response Formats](#response-formats)
7. [Examples](#examples)

---

## Tổng quan

MediaCMS hỗ trợ hai phương thức upload video:

1. **Chunked Upload** (Khuyến nghị): Upload video dung lượng lớn bằng chunks
2. **Legacy Upload**: Upload trực tiếp (deprecated)

### Base URLs
- Video Management: `/api/content/videos`
- Chunked Upload: `/api/uploads/videos/chunk`

### Authentication
Tất cả endpoints đều yêu cầu Bearer token:
```
Authorization: Bearer <token>
```

---

## Video Management Endpoints

### 1. Lấy danh sách video

**GET** `/api/content/videos`

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Số trang |
| `limit` | number | No | 20 | Số video mỗi trang (max: 50) |
| `status` | string | No | published | Trạng thái: `published`, `draft`, `all` |
| `visibility` | string | No | public | Hiển thị: `public`, `private`, `unlisted`, `all` |
| `sortBy` | string | No | recent | Sắp xếp: `recent`, `oldest`, `popular` |

#### Response
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
      "status": "published|draft",
      "visibility": "public|private|unlisted",
      "processingStatus": "queued|processing|completed|failed",
      "uploadStatus": "uploaded",
      "views": 0,
      "likesCount": 0,
      "commentsCount": 0,
      "featuredImage": "string",
      "metadata": {
        "duration": 0,
        "resolution": "string",
        "fileSize": 0,
        "hlsMasterUrl": "string",
        "hlsStreams": [
          {
            "name": "1080p",
            "width": 1920,
            "height": 1080,
            "bitrate": "5000k",
            "playlistUrl": "string"
          }
        ],
        "thumbnails": ["string"]
      },
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
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
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

### 2. Lấy video theo ID

**GET** `/api/content/videos/{id}`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Video ID |

#### Response
```json
{
  "success": true,
  "data": {
    // Chi tiết video như trên
  }
}
```

### 3. Cập nhật video metadata

**PUT** `/api/content/videos/{id}`

#### Headers
- `Authorization`: Bearer token (required)
- `Content-Type`: application/json

#### Request Body
```json
{
  "title": "string", // 5-200 ký tự
  "description": "string", // tối đa 500 ký tự
  "category": "string", // technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other
  "tags": ["string"] | "string", // tối đa 10 tags, mỗi tag tối đa 50 ký tự
  "visibility": "public|private|unlisted",
  "useAdaptiveStorage": true
}
```

#### Response
```json
{
  "success": true,
  "message": "Video updated successfully",
  "data": {
    // Video object đã cập nhật
  }
}
```

### 4. Xóa video

**DELETE** `/api/content/videos/{id}`

#### Response
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

### 5. Stream video (HLS)

**GET** `/api/content/videos/{id}/stream`

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `res` | string | No | Độ phân giải: `480p`, `720p`, `1080p` |

#### Response
- Content-Type: `application/vnd.apple.mpegurl`
- Trả về HLS playlist (.m3u8)

### 6. Cập nhật thumbnail

**PUT** `/api/content/videos/{id}/thumbnail`

#### Request Body
```json
{
  "thumbnailUrl": "string" // URL của thumbnail
}
```

### 7. Publish video

**POST** `/api/content/videos/{id}/publish`

#### Response
```json
{
  "success": true,
  "message": "Video published successfully",
  "data": {
    // Video object đã publish
  }
}
```

### 8. Reprocess video (Admin/Moderator)

**POST** `/api/content/videos/{id}/reprocess`

#### Response
```json
{
  "success": true,
  "message": "Video queued for reprocessing",
  "data": {
    "jobId": "string"
  }
}
```

### 9. Lấy thống kê video

**GET** `/api/content/videos/{id}/stats`

#### Response
```json
{
  "success": true,
  "data": {
    "views": 0,
    "likes": 0,
    "comments": 0,
    "duration": 0,
    "resolution": "string",
    "fileSize": 0,
    "processingStatus": "string",
    "engagementRate": "string"
  }
}
```

### 10. Lấy transcript video

**GET** `/api/content/videos/{id}/transcript`

#### Response
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

### 11. Lấy trạng thái upload

**GET** `/api/content/videos/upload-status`

#### Response
```json
{
  "success": true,
  "data": {
    "activeJobs": 0,
    "maxConcurrentProcessing": 3,
    "queuedJobs": 0,
    "processingJobs": 0,
    "canUpload": true,
    "canProcessImmediately": true,
    "recentJobs": [
      {
        "id": "string",
        "type": "PROCESS_VIDEO",
        "status": "PENDING|PROCESSING|COMPLETED|FAILED",
        "progress": 0,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 12. Lấy trạng thái queue (Admin/Moderator)

**GET** `/api/content/admin/queue-status`

#### Response
```json
{
  "success": true,
  "data": {
    "queueName": "video-processing",
    "length": 5
  }
}
```

---

## Chunked Upload System

### 1. Khởi tạo upload

**POST** `/api/uploads/videos/chunk/init`

#### Headers
- `Authorization`: Bearer token (required)
- `Content-Type`: application/json

#### Request Body
```json
{
  "filename": "string", // Tên file gốc
  "contentType": "video/mp4", // MIME type
  "totalSize": 0, // Tổng kích thước file (bytes)
  "chunkSize": 0, // Kích thước mỗi chunk (bytes)
  "title": "string", // 5-200 ký tự
  "description": "string", // tối đa 500 ký tự
  "category": "string", // technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other
  "tags": ["string"] | "string", // tối đa 10 tags, mỗi tag tối đa 50 ký tự
  "visibility": "public|private|unlisted", // default: public
  "status": "draft|published", // default: draft
  "channelId": "string", // optional
  "useAdaptiveStorage": true // default: true
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "uploadId": "string"
  }
}
```

### 2. Upload chunk

**PUT** `/api/uploads/videos/chunk/{uploadId}`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | string | Yes | Upload ID từ init |

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `index` | number | Yes | Chỉ số chunk (bắt đầu từ 0) |
| `checksum` | string | No | SHA-1 checksum của chunk |

#### Headers
- `Authorization`: Bearer token (required)
- `Content-Type`: application/octet-stream

#### Request Body
- Binary data của chunk

#### Response
```json
{
  "success": true,
  "data": {
    "index": 0,
    "size": 1048576,
    "uploadedBytes": 1048576
  }
}
```

### 3. Lấy trạng thái upload

**GET** `/api/uploads/videos/chunk/{uploadId}/status`

#### Response
```json
{
  "success": true,
  "data": {
    "uploadedBytes": 0,
    "receivedParts": [0, 1, 2] // Danh sách chunks đã nhận
  }
}
```

### 4. Hoàn thành upload

**POST** `/api/uploads/videos/chunk/{uploadId}/complete`

#### Response
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "jobId": "string"
  }
}
```

### 5. Hủy upload

**DELETE** `/api/uploads/videos/chunk/{uploadId}`

#### Response
```json
{
  "success": true,
  "message": "Upload aborted"
}
```

---

## Validation Rules

### Video Metadata Validation

#### Title
- **Required**: Yes
- **Min length**: 5 ký tự
- **Max length**: 200 ký tự
- **Pattern**: Trimmed string

#### Description
- **Required**: No
- **Max length**: 500 ký tự
- **Pattern**: Trimmed string, có thể empty

#### Category
- **Required**: Yes
- **Values**: `technology`, `tech`, `education`, `entertainment`, `business`, `health`, `lifestyle`, `science`, `sports`, `politics`, `travel`, `other`

#### Tags
- **Required**: No
- **Format**: Array hoặc comma-separated string
- **Max tags**: 10
- **Max length per tag**: 50 ký tự
- **Example**: `["react", "javascript", "tutorial"]` hoặc `"react,javascript,tutorial"`

#### Visibility
- **Required**: No
- **Default**: `public`
- **Values**: `public`, `private`, `unlisted`

#### Status
- **Required**: No
- **Default**: `draft`
- **Values**: `draft`, `published`

#### Channel ID
- **Required**: No
- **Type**: String hoặc null
- **Validation**: User phải sở hữu channel

#### Use Adaptive Storage
- **Required**: No
- **Default**: `true`
- **Type**: Boolean

### File Validation

#### Supported Video Formats
- **Video codecs**: H.264, H.265/HEVC, VP9, AV1
- **Audio codecs**: AAC, MP3, Opus
- **Containers**: MP4, WebM, MOV, AVI, MPEG, FLV, 3GP, WMV

#### File Size Limits
- **Chunked upload**: Không giới hạn (khuyến nghị cho file lớn)
- **Legacy upload**: 500MB

#### Security Checks
- **Filename validation**: Không chứa `..`, `<>:"|?*`, reserved names
- **MIME type validation**: Phải match với extension
- **Checksum validation**: SHA-1 cho chunks (optional)

---

## Error Codes

### Upload Errors
| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Dữ liệu đầu vào không hợp lệ | 400 |
| `UPLOAD_ERROR` | Lỗi upload chung | 400 |
| `FILE_TOO_LARGE` | File quá lớn | 400 |
| `TOO_MANY_FILES` | Quá nhiều file | 400 |
| `UNEXPECTED_FILE` | File field không mong đợi | 400 |
| `INVALID_FILE_TYPE` | Loại file không được hỗ trợ | 400 |
| `CHECKSUM_MISMATCH` | Checksum không khớp | 400 |
| `NOT_FOUND` | Upload hoặc video không tồn tại | 404 |
| `INTERNAL_ERROR` | Lỗi server | 500 |

### Video Processing Errors
| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VIDEO_NOT_READY` | Video chưa sẵn sàng để stream | 400 |
| `INVALID_CONTENT_TYPE` | Content không phải video | 400 |
| `SOURCE_NOT_FOUND` | Không tìm thấy source file | 400 |
| `PLAYLIST_NOT_FOUND` | Không tìm thấy HLS playlist | 404 |
| `STREAMING_PREPARATION_FAILED` | Lỗi chuẩn bị streaming | 500 |

### Authentication Errors
| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Token không hợp lệ | 401 |
| `FORBIDDEN` | Không có quyền truy cập | 403 |

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {}, // hoặc array
  "message": "string", // optional
  "pagination": {} // optional cho list endpoints
}
```

### Error Response
```json
{
  "error": "string",
  "code": "string",
  "details": [] // optional, validation errors
}
```

### Pagination Object
```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "pages": 5
}
```

---

## Examples

### 1. Upload video bằng chunked upload

```javascript
// 1. Khởi tạo upload
const initResponse = await fetch('/api/uploads/videos/chunk/init', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filename: 'my-video.mp4',
    contentType: 'video/mp4',
    totalSize: 104857600, // 100MB
    chunkSize: 1048576, // 1MB chunks
    title: 'My Awesome Video',
    description: 'This is a great video about coding',
    category: 'technology',
    tags: ['javascript', 'tutorial', 'coding'],
    visibility: 'public',
    status: 'draft',
    useAdaptiveStorage: true
  })
});

const { data: { uploadId } } = await initResponse.json();

// 2. Upload chunks
const file = document.getElementById('videoFile').files[0];
const chunkSize = 1048576; // 1MB
const totalChunks = Math.ceil(file.size / chunkSize);

for (let i = 0; i < totalChunks; i++) {
  const start = i * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const chunk = file.slice(start, end);
  
  await fetch(`/api/uploads/videos/chunk/${uploadId}?index=${i}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/octet-stream'
    },
    body: chunk
  });
}

// 3. Hoàn thành upload
const completeResponse = await fetch(`/api/uploads/videos/chunk/${uploadId}/complete`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const { data: { contentId, jobId } } = await completeResponse.json();
console.log('Video uploaded:', contentId, 'Job ID:', jobId);
```

### 2. Lấy danh sách video với filter

```javascript
const response = await fetch('/api/content/videos?page=1&limit=10&status=published&visibility=public&sortBy=popular', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const { data: videos, pagination } = await response.json();
```

### 3. Stream video

```javascript
// Lấy master playlist (sẽ redirect đến proxy URL)
const masterPlaylistUrl = `/api/content/videos/${videoId}/stream`;

// Lấy playlist cho độ phân giải cụ thể
const playlistUrl = `/api/content/videos/${videoId}/stream?res=720p`;

// Sử dụng với video player (ví dụ: HLS.js)
const video = document.getElementById('video');
const hls = new Hls();
hls.loadSource(masterPlaylistUrl);
hls.attachMedia(video);

// Hoặc sử dụng trực tiếp proxy URL nếu biết object key
const directProxyUrl = `/api/storage/videos/hls/${videoId}/master.m3u8`;
hls.loadSource(directProxyUrl);
hls.attachMedia(video);
```

### 4. Cập nhật video metadata

```javascript
const response = await fetch(`/api/content/videos/${videoId}`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Updated Video Title',
    description: 'Updated description',
    tags: ['updated', 'tags'],
    visibility: 'public'
  })
});

const { data: updatedVideo } = await response.json();
```

### 5. Sử dụng proxy URLs cho media

```javascript
// Lấy video data với proxy URLs
const response = await fetch(`/api/content/videos/${videoId}`, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const { data: video } = await response.json();

// Sử dụng thumbnail URL (đã được transform thành proxy URL)
const thumbnailImg = document.getElementById('thumbnail');
thumbnailImg.src = video.featuredImage; // /api/storage/videos/thumbnails/xxx.jpg

// Sử dụng HLS URLs (đã được transform thành proxy URLs)
if (video.metadata?.hlsMasterUrl) {
  const hls = new Hls();
  hls.loadSource(video.metadata.hlsMasterUrl); // /api/storage/videos/hls/xxx/master.m3u8
  hls.attachMedia(document.getElementById('video'));
}

// Sử dụng thumbnail array
if (video.metadata?.thumbnails) {
  video.metadata.thumbnails.forEach(thumbnailUrl => {
    // thumbnailUrl đã là proxy URL: /api/storage/videos/thumbnails/xxx.jpg
    console.log('Thumbnail:', thumbnailUrl);
  });
}
```

### 6. Kiểm tra trạng thái upload

```javascript
const response = await fetch('/api/content/videos/upload-status', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const { data: status } = await response.json();
console.log('Can upload:', status.canUpload);
console.log('Active jobs:', status.activeJobs);
console.log('Recent jobs:', status.recentJobs);
```

---

## Video Processing Pipeline

Sau khi upload hoàn tất, video sẽ được xử lý tự động:

1. **Queued**: Video được thêm vào queue xử lý
2. **Processing**: FFmpeg xử lý video:
   - Trích metadata (duration, codec, resolution, fileSize)
   - Tạo thumbnails
   - Transcode HLS streams (360p, 480p, 720p, 1080p)
   - Upload lên MinIO storage
3. **Completed**: Video sẵn sàng để stream
4. **Failed**: Xử lý thất bại, có thể retry

### HLS Streams
- **360p**: 640x360, 800k bitrate
- **480p**: 854x480, 1500k bitrate  
- **720p**: 1280x720, 3000k bitrate
- **1080p**: 1920x1080, 5000k bitrate

### Storage Structure
```
MinIO Bucket: videos/
├── uploads/chunks/{uploadId} (source file)
├── hls/{contentId}/
│   ├── master.m3u8 (master playlist)
│   ├── 360p/
│   │   ├── playlist.m3u8
│   │   └── segment-*.ts
│   ├── 480p/
│   ├── 720p/
│   └── 1080p/
└── thumbnails/{contentId}.jpg
```

### Proxy URL System

MediaCMS sử dụng proxy URLs để bảo mật truy cập MinIO storage:

#### Proxy URL Format
```
/api/storage/{bucket}/{objectKey}
```

#### Examples
- **Thumbnail**: `/api/storage/videos/thumbnails/0199c4ea-07f3-7fa3-8b75-db5ef47a4491.jpg`
- **HLS Master**: `/api/storage/videos/hls/0199c4ea-07f3-7fa3-8b75-db5ef47a4491/master.m3u8`
- **HLS Stream**: `/api/storage/videos/hls/0199c4ea-07f3-7fa3-8b75-db5ef47a4491/720p/playlist.m3u8`

#### Benefits
- **Security**: Không expose MinIO credentials
- **Access Control**: Backend có thể kiểm soát quyền truy cập
- **URL Expiration**: Presigned URLs tự động expire sau 1 giờ
- **CORS**: Tự động handle CORS headers
- **Error Handling**: Centralized error handling cho storage access

---

## Storage Proxy API

### 1. Lấy presigned URL cho object

**GET** `/api/storage/{bucket}/*`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket` | string | Yes | MinIO bucket name (videos, images, documents, audio, thumbnails) |
| `objectKey` | string | Yes | Object key path (wildcard parameter) |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `expiresIn` | number | No | 3600 | URL expiration time in seconds |

#### Response
- **302 Redirect**: Redirect đến presigned URL
- **404**: Object không tồn tại
- **403**: Access denied
- **500**: Internal server error

#### Examples
```bash
# Lấy thumbnail
GET /api/storage/videos/thumbnails/0199c4ea-07f3-7fa3-8b75-db5ef47a4491.jpg

# Lấy HLS master playlist
GET /api/storage/videos/hls/0199c4ea-07f3-7fa3-8b75-db5ef47a4491/master.m3u8

# Lấy HLS stream với custom expiration
GET /api/storage/videos/hls/0199c4ea-07f3-7fa3-8b75-db5ef47a4491/720p/playlist.m3u8?expiresIn=7200
```

### 2. Kiểm tra object tồn tại

**HEAD** `/api/storage/{bucket}/*`

#### Response
- **200**: Object tồn tại
- **404**: Object không tồn tại
- **403**: Access denied
- **500**: Internal server error

#### Example
```bash
HEAD /api/storage/videos/thumbnails/0199c4ea-07f3-7fa3-8b75-db5ef47a4491.jpg
```

### Security Features

#### Allowed Buckets
Chỉ các bucket sau được phép truy cập:
- `videos` - Video files và HLS streams
- `images` - Image files
- `documents` - Document files
- `audio` - Audio files
- `thumbnails` - Thumbnail images

#### URL Expiration
- Default: 1 giờ (3600 seconds)
- Maximum: 7 ngày (604800 seconds)
- Tự động refresh khi cần thiết

#### Error Handling
```json
{
  "error": "File not found",
  "code": "NOT_FOUND"
}
```

---

## Best Practices

### Upload
1. Sử dụng chunked upload cho file > 10MB
2. Implement retry logic cho failed chunks
3. Hiển thị progress bar cho user experience
4. Validate file trước khi upload

### Streaming
1. Sử dụng adaptive bitrate streaming (HLS)
2. Implement fallback cho unsupported browsers
3. Cache playlists để giảm latency
4. Monitor streaming performance

### Security
1. Validate tất cả input data
2. Implement rate limiting
3. Scan file content nếu cần
4. Log tất cả upload activities

### Performance
1. Sử dụng CDN cho static assets
2. Implement caching strategies
3. Monitor processing queue
4. Optimize video encoding settings
