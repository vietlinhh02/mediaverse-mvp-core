# Documentation for New API Endpoints

This document outlines the new API endpoints created for uploading a profile cover image and fetching video recommendations.

---

## 1. Upload Profile Cover Image

This endpoint allows an authenticated user to upload a cover image for their profile. The image will be resized to a standard banner format (1500x500).

- **Endpoint:** `POST /api/users/profile/upload-cover-image`
- **Method:** `POST`
- **Authentication:** `Bearer Token` required.

### Request

The request must be a `multipart/form-data` request containing the image file.

**Form Data:**

| Field        | Type | Description                                             | Required |
|--------------|------|---------------------------------------------------------|----------|
| `coverImage` | File | The image file to be uploaded as the profile cover.     | Yes      |

**Validation:**

- **File Type:** Must be an image (`image/jpeg`, `image/png`, `image/webp`, `image/gif`).
- **File Size:** Maximum size is **10MB**.

### Responses

**Success Response (200 OK):**

Returns an object containing the updated user profile and the new cover image URL.

```json
{
  "success": true,
  "data": {
    "profile": {
        "id": "clxrz3s3y00011234abcd5678",
        "userId": "clxrz3s3x00001234abcd5678",
        "displayName": "John Doe",
        "bio": "A short bio here.",
        "avatarUrl": "/uploads/avatars/user-123-timestamp-200.jpg",
        "coverImageUrl": "/uploads/covers/clxrz3s3x00001234abcd5678-1665419400000.jpg",
        "location": "City, Country",
        "website": "https://example.com",
        "isPublic": true,
        "stats": {
          "followersCount": 100,
          "followingCount": 50,
          "contentCount": 10
        },
        "createdAt": "2025-10-10T10:00:00.000Z",
        "updatedAt": "2025-10-10T16:30:00.000Z"
    },
    "coverImageUrl": "/uploads/covers/clxrz3s3x00001234abcd5678-1665419400000.jpg"
  },
  "message": "Cover image uploaded successfully"
}
```

**Error Responses:**

- **400 Bad Request (No File):**
  ```json
  {
    "error": "No image file provided",
    "code": "NO_FILE"
  }
  ```
- **400 Bad Request (Invalid File Type/Size):**
  ```json
  {
    "error": "File size too large. Maximum 10MB allowed",
    "code": "FILE_TOO_LARGE"
  }
  ```
- **401 Unauthorized:**
  ```json
  {
    "error": "Authentication token is missing or invalid"
  }
  ```

---

## 2. Get Recommended Videos

This endpoint retrieves a list of trending videos. It's a public endpoint and does not require authentication.

- **Endpoint:** `GET /api/recommendations/videos`
- **Method:** `GET`
- **Authentication:** None required.

### Request

**Query Parameters:**

| Parameter   | Type    | Description                                           | Default | Options                  |
|-------------|---------|-------------------------------------------------------|---------|--------------------------|
| `limit`     | Integer | The maximum number of videos to return.               | `20`    | `1` - `100`              |
| `timeframe` | String  | The time window for trending calculations.            | `24h`   | `1h`, `6h`, `24h`, `7d`, `30d` |

**Example Request:**

`/api/recommendations/videos?limit=10&timeframe=7d`

### Responses

**Success Response (200 OK):**

Returns an array of video content objects.

```json
{
  "success": true,
  "data": [
    {
      "id": "clxryabc100021234efgh9012",
      "title": "My Awesome Trending Video",
      "description": "Description of the video.",
      "type": "video",
      "status": "published",
      "visibility": "public",
      "publishedAt": "2025-10-09T14:00:00.000Z",
      "trendingScore": 98.5,
      "author": {
        "id": "clxrz3s3x00001234abcd5678",
        "username": "johndoe",
        "profile": {
          "displayName": "John Doe",
          "avatarUrl": "/uploads/avatars/user-123-timestamp-200.jpg"
        }
      },
      "channel": {
        "id": "clxrydef300031234ijkl1234",
        "name": "John's Tech Channel"
      }
    }
  ]
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "A detailed error message from the server."
}
```
