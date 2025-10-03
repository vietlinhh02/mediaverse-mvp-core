# User Profile Management API Endpoints

This document describes all the user profile management endpoints available in the MediaCMS platform for frontend development.

## Base URL
```
/api/users
```

## Authentication
All endpoints except profile viewing require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [User Profile Endpoints](#user-profile-endpoints)
2. [Follow/Unfollow Endpoints](#followunfollow-endpoints)
3. [Channel Management Endpoints](#channel-management-endpoints)
4. [User Preferences Endpoints](#user-preferences-endpoints)
5. [Connected Accounts Endpoints](#connected-accounts-endpoints)
6. [Content & Feed Endpoints](#content--feed-endpoints)
7. [User Search Endpoints](#user-search-endpoints)
8. [Common Response Formats](#common-response-formats)
9. [Error Codes](#error-codes)

---

## User Profile Endpoints

### 1. Get User Profile
**GET** `/api/users/profile/:id`

Retrieve a user's profile by their ID.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): User ID

#### Query Parameters
None

#### Headers
- `Authorization` (optional): Bearer token for viewing private profiles

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "userId": "string",
    "displayName": "string",
    "bio": "string",
    "avatarUrl": "string",
    "location": "string",
    "website": "string",
    "isPublic": true,
    "stats": {
      "followersCount": 0,
      "followingCount": 0,
      "contentCount": 0
    },
    "createdAt": "2025-09-30T00:00:00.000Z",
    "updatedAt": "2025-09-30T00:00:00.000Z",
    "user": {
      "id": "string",
      "username": "string",
      "email": "string", // Only visible for own profile
      "role": "string",
      "status": "string",
      "createdAt": "2025-09-30T00:00:00.000Z"
    }
  }
}
```

#### Error Responses
- **404 Not Found**: Profile not found
- **403 Forbidden**: Profile is private

---

### 2. Update User Profile
**PUT** `/api/users/profile`

Update the authenticated user's profile.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "displayName": "string", // min: 2, max: 50 characters
  "bio": "string", // max: 500 characters
  "location": "string", // max: 100 characters
  "website": "string", // must be valid URL
  "isPublic": true // boolean
}
```

#### Validation Rules
- `displayName`: 2-50 characters, trimmed
- `bio`: Max 500 characters, optional
- `location`: Max 100 characters, optional
- `website`: Must be valid URL format, optional
- `isPublic`: Boolean, defaults to true

#### Response Format
```json
{
  "success": true,
  "data": {
    // Same structure as Get Profile response
  },
  "message": "Profile updated successfully"
}
```

#### Error Responses
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Authentication required
- **404 Not Found**: Profile not found

---

### 3. Upload Avatar
**POST** `/api/users/upload-avatar`

Upload and process user avatar image.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: multipart/form-data

#### Request Body (Form Data)
- `image` (file, required): Image file (JPEG/PNG/WebP, max 5MB)

#### Response Format
```json
{
  "success": true,
  "data": {
    "profile": {
      // Updated profile object
    },
    "avatarUrls": {
      "200x200": "string",
      "400x400": "string"
    }
  },
  "message": "Avatar uploaded successfully"
}
```

#### Error Responses
- **400 Bad Request**: Invalid file format or size
- **401 Unauthorized**: Authentication required

---

### 4. Upload Image (Alternative Endpoint)
**POST** `/api/users/upload-image`

Alternative endpoint for image upload with different field name.

Same functionality as upload-avatar but accepts `image` field name instead of `avatar`.

---

## Follow/Unfollow Endpoints

### 1. Follow User
**POST** `/api/users/:id/follow`

Follow another user.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): User ID to follow

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "User followed successfully"
  }
}
```

#### Error Responses
- **400 Bad Request**: Cannot follow yourself
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User not found
- **409 Conflict**: Already following this user

---

### 2. Unfollow User
**DELETE** `/api/users/:id/unfollow`

Unfollow a user.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): User ID to unfollow

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "User unfollowed successfully"
  }
}
```

#### Error Responses
- **400 Bad Request**: Cannot unfollow yourself
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User not found or not following

---

### 3. Get User Followers
**GET** `/api/users/:id/followers`

Get list of users following the specified user.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "string",
        "followerId": "string",
        "followeeId": "string",
        "createdAt": "2025-09-30T00:00:00.000Z",
        "follower": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 4. Get User Following
**GET** `/api/users/:id/following`

Get list of users that the specified user is following.

Same structure as Get Followers endpoint.

---

### 5. Get Follow Status
**GET** `/api/users/:id/follow-status`

Check if the authenticated user is following the specified user.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): User ID to check

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "isFollowing": true,
    "isFollower": false
  }
}
```

---

## Channel Management Endpoints

### 1. Create Channel
**POST** `/api/users/channels`

Create a new channel.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "name": "string", // required, 3-100 characters
  "description": "string", // optional, max 500 characters
  "category": "string", // required, see categories below
  "tags": ["string"] // optional, max 10 tags, each max 50 characters
}
```

#### Valid Categories
- `technology`
- `education`
- `entertainment`
- `business`
- `health`
- `lifestyle`
- `other`

#### Validation Rules
- `name`: 3-100 characters, required, trimmed
- `description`: Max 500 characters, optional, trimmed
- `category`: Must be one of valid categories, required
- `tags`: Array of strings, max 10 items, each max 50 characters

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "ownerId": "string",
    "name": "string",
    "description": "string",
    "category": "string",
    "tags": ["string"],
    "subscriberCount": 0,
    "contentCount": 0,
    "createdAt": "2025-09-30T00:00:00.000Z",
    "updatedAt": "2025-09-30T00:00:00.000Z",
    "owner": {
      "id": "string",
      "username": "string",
      "profile": {
        "displayName": "string",
        "avatarUrl": "string"
      }
    }
  },
  "message": "Channel created successfully"
}
```

---

### 2. Update Channel
**PUT** `/api/users/channels/:id`

Update an existing channel.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Channel ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "name": "string", // optional, 3-100 characters
  "description": "string", // optional, max 500 characters
  "category": "string", // optional, valid category
  "tags": ["string"] // optional, max 10 tags
}
```

Same validation rules as Create Channel, but all fields are optional.

#### Response Format
Same as Create Channel response.

#### Error Responses
- **403 Forbidden**: Not channel owner
- **404 Not Found**: Channel not found

---

### 3. Get Channel
**GET** `/api/users/channels/:id`

Get channel details by ID.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Channel ID

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    // Same structure as Create Channel response
  }
}
```

---

### 4. Get User Channels
**GET** `/api/users/:id/channels`

Get all channels owned by a user.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): User ID

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        // Channel objects
      }
    ]
  }
}
```

---

### 5. Delete Channel
**DELETE** `/api/users/channels/:id`

Delete a channel.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Channel ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "message": "Channel deleted successfully"
}
```

#### Error Responses
- **403 Forbidden**: Not channel owner
- **404 Not Found**: Channel not found

---

### 6. List Channels
**GET** `/api/users/channels`

Get paginated list of all channels with filtering options.

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `category` (string, optional): Filter by category
- `search` (string, optional): Search in channel names (max 100 characters)
- `sortBy` (string, optional): Sort field - `createdAt`, `updatedAt`, `name`, `subscribers` (default: `createdAt`)
- `sortOrder` (string, optional): Sort order - `asc`, `desc` (default: `desc`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        // Channel objects
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## User Preferences Endpoints

### 1. Get User Preferences
**GET** `/api/users/preferences`

Get current user's preferences.

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "notifications": {
      "email": {
        "newFollower": true,
        "newComment": true,
        "newLike": false,
        "contentPublished": true,
        "weeklyDigest": true
      },
      "push": {
        "newFollower": true,
        "newComment": true,
        "newLike": false,
        "contentPublished": true
      },
      "inApp": {
        "newFollower": true,
        "newComment": true,
        "newLike": true,
        "contentPublished": true,
        "systemUpdates": true
      }
    },
    "privacy": {
      "profileVisibility": "public",
      "showEmail": false,
      "showFollowers": true,
      "showFollowing": true,
      "allowDirectMessages": "followers",
      "searchable": true
    },
    "content": {
      "defaultVisibility": "public",
      "allowComments": true,
      "allowLikes": true,
      "moderateComments": false,
      "categories": ["technology", "education"],
      "language": "en"
    },
    "display": {
      "theme": "light",
      "language": "en",
      "timezone": "UTC",
      "dateFormat": "MM/DD/YYYY",
      "compactMode": false
    }
  }
}
```

---

### 2. Update User Preferences
**PUT** `/api/users/preferences`

Update user preferences (full replacement).

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "notifications": {
    "email": {
      "newFollower": true,
      "newComment": true,
      "newLike": false,
      "contentPublished": true,
      "weeklyDigest": true
    },
    "push": {
      "newFollower": true,
      "newComment": true,
      "newLike": false,
      "contentPublished": true
    },
    "inApp": {
      "newFollower": true,
      "newComment": true,
      "newLike": true,
      "contentPublished": true,
      "systemUpdates": true
    }
  },
  "privacy": {
    "profileVisibility": "public", // public, private, followers
    "showEmail": false,
    "showFollowers": true,
    "showFollowing": true,
    "allowDirectMessages": "followers", // everyone, followers, none
    "searchable": true
  },
  "content": {
    "defaultVisibility": "public", // public, private, unlisted
    "allowComments": true,
    "allowLikes": true,
    "moderateComments": false,
    "categories": ["technology", "education"],
    "language": "en"
  },
  "display": {
    "theme": "light", // light, dark, auto
    "language": "en",
    "timezone": "UTC",
    "dateFormat": "MM/DD/YYYY", // MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    "compactMode": false
  }
}
```

#### Validation Rules
- **Privacy profileVisibility**: `public`, `private`, `followers`
- **Privacy allowDirectMessages**: `everyone`, `followers`, `none`
- **Content defaultVisibility**: `public`, `private`, `unlisted`
- **Content categories**: Array of valid categories
- **Display theme**: `light`, `dark`, `auto`
- **Display dateFormat**: `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`

#### Response Format
```json
{
  "success": true,
  "data": {
    // Updated preferences object
  },
  "message": "Preferences updated successfully"
}
```

---

### 3. Update Preference Section
**PATCH** `/api/users/preferences/:section`

Update a specific section of preferences.

#### Parameters
- **Path Parameters:**
  - `section` (string, required): Section name (`notifications`, `privacy`, `content`, `display`)

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
Send only the section you want to update:

```json
{
  "email": {
    "newFollower": false,
    "newComment": true
  }
}
```

#### Response Format
Same as Update Preferences.

---

### 4. Reset Preferences
**DELETE** `/api/users/preferences`

Reset all preferences to default values.

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    // Default preferences object
  },
  "message": "Preferences reset to defaults"
}
```

---

## Connected Accounts Endpoints

### 1. Get Connected Accounts
**GET** `/api/users/connected-accounts`

Get list of OAuth accounts connected to the user's profile.

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "connectedAccounts": [
      {
        "provider": "google",
        "id": "1234567890",
        "email": "user@gmail.com",
        "name": "John Doe",
        "linkedAt": "2025-09-30T00:00:00.000Z"
      },
      {
        "provider": "github",
        "id": "johndoe",
        "email": "john@github.com", 
        "name": "John Doe",
        "linkedAt": "2025-09-29T00:00:00.000Z"
      }
    ],
    "availableProviders": ["google", "github", "facebook"]
  }
}
```

#### Error Responses
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User not found

---

### 2. Disconnect OAuth Account
**DELETE** `/api/users/connected-accounts/:provider`

Disconnect an OAuth account from the user's profile.

#### Parameters
- **Path Parameters:**
  - `provider` (string, required): OAuth provider to disconnect (`google`, `github`, `facebook`)

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "message": "google account disconnected successfully"
}
```

#### Error Responses
- **400 Bad Request**: Invalid provider or last login method
- **401 Unauthorized**: Authentication required
- **404 Not Found**: Provider not connected or user not found

#### Special Validation
- Cannot disconnect the only login method if user has no password
- Must have either a password or other connected OAuth accounts

---

### 3. Initiate Account Linking
**POST** `/api/users/connected-accounts/:provider/link`

Generate OAuth URL to link a new account to the user's profile.

#### Parameters
- **Path Parameters:**
  - `provider` (string, required): OAuth provider to link (`google`, `github`, `facebook`)

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "provider": "google"
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid provider, already connected, or provider not configured
- **401 Unauthorized**: Authentication required
- **404 Not Found**: User not found

#### Usage Flow
1. Call this endpoint to get OAuth URL
2. Redirect user to the returned `authUrl`
3. User completes OAuth flow on provider's site
4. Provider redirects back to your callback URL
5. Account is automatically linked during callback processing

---

## Content & Feed Endpoints

### 1. Get User's Content
**GET** `/api/users/:id/content`

Get paginated list of content created by a specific user.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `type` (string, optional): Content type filter (`article`, `video`, `document`)
- `status` (string, optional): Content status (`published`, `draft`, `all`) - default: `published`
- `sortBy` (string, optional): Sort field - `createdAt`, `publishedAt`, `title`, `views` (default: `publishedAt`)
- `sortOrder` (string, optional): Sort order - `asc`, `desc` (default: `desc`)

#### Headers
- `Authorization` (optional): Bearer token (required for accessing drafts or private content)

#### Response Format
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "string",
        "title": "string",
        "type": "article",
        "status": "published",
        "visibility": "public",
        "publishedAt": "2025-09-30T00:00:00.000Z",
        "createdAt": "2025-09-30T00:00:00.000Z",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "stats": {
          "views": 150,
          "likes": 12,
          "comments": 3
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 2. Get Personalized Feed
**GET** `/api/content/feed/personalized`

Get personalized content feed based on user preferences and behavior.

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `category` (string, optional): Filter by category
- `type` (string, optional): Content type filter (`article`, `video`, `document`)
- `includeFollowing` (boolean, optional): Include content from followed users (default: true)

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "contents": [
      {
        "id": "string",
        "title": "string",
        "type": "video",
        "category": "technology",
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
          "views": 1250,
          "likes": 45,
          "comments": 8
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 3. Get Trending Content
**GET** `/api/content/feed/trending`

Get trending content across the platform.

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `category` (string, optional): Filter by category
- `timeframe` (string, optional): Trending timeframe (`1h`, `24h`, `7d`, `30d`) - default: `24h`
- `type` (string, optional): Content type filter

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "contents": [
      {
        "id": "string",
        "title": "string",
        "type": "article",
        "category": "technology",
        "trendingScore": 89.5,
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
          "views": 2500,
          "likes": 180,
          "comments": 25
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 80,
      "totalPages": 4,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 4. Get Content by Category
**GET** `/api/content/feed/category/:category`

Get content filtered by specific category with pagination.

#### Parameters
- **Path Parameters:**
  - `category` (string, required): Content category (`technology`, `education`, `entertainment`, `business`, `health`, `lifestyle`, `other`)

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `sortBy` (string, optional): Sort field - `recent`, `popular`, `trending` (default: `recent`)
- `type` (string, optional): Content type filter

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "category": "technology",
    "contents": [
      {
        "id": "string",
        "title": "string",
        "type": "video",
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
          "views": 850,
          "likes": 32,
          "comments": 7
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 5. Search Content
**GET** `/api/content/search`

Search content across the platform with pagination.

#### Query Parameters
- `q` (string, required): Search query (1-100 characters)
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `type` (string, optional): Content type filter (`article`, `video`, `document`)
- `category` (string, optional): Category filter
- `sortBy` (string, optional): Sort field - `relevance`, `recent`, `popular` (default: `relevance`)
- `author` (string, optional): Filter by author username
- `dateFrom` (string, optional): Filter from date (ISO format)
- `dateTo` (string, optional): Filter to date (ISO format)

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "query": "javascript tutorial",
    "contents": [
      {
        "id": "string",
        "title": "JavaScript Fundamentals Tutorial",
        "type": "video",
        "category": "education",
        "publishedAt": "2025-09-30T00:00:00.000Z",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "relevanceScore": 95.2,
        "stats": {
          "views": 5200,
          "likes": 234,
          "comments": 18
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
      "type": "video",
      "category": null,
      "author": null,
      "dateRange": null
    }
  }
}
```

---

### 6. Get User's Articles
**GET** `/api/content/articles/user/:userId`

Get paginated list of articles by specific user.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `status` (string, optional): Article status (`published`, `draft`, `all`) - default: `published`

#### Headers
- `Authorization` (optional): Bearer token (required for drafts)

#### Response Format
```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "string",
        "title": "string",
        "summary": "string",
        "status": "published",
        "publishedAt": "2025-09-30T00:00:00.000Z",
        "readTime": 5,
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "stats": {
          "views": 1200,
          "likes": 45,
          "comments": 12
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 7. Get User's Videos
**GET** `/api/content/videos/user/:userId`

Get paginated list of videos by specific user.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `status` (string, optional): Video status (`published`, `draft`, `processing`, `all`) - default: `published`

#### Headers
- `Authorization` (optional): Bearer token (required for drafts)

#### Response Format
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "duration": 450,
        "status": "published",
        "publishedAt": "2025-09-30T00:00:00.000Z",
        "thumbnailUrl": "string",
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
      "total": 40,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 8. Get Community Posts
**GET** `/api/content/community/posts`

Get paginated list of community posts.

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `hashtag` (string, optional): Filter by hashtag
- `sortBy` (string, optional): Sort field - `createdAt`, `likes`, `comments` (default: `createdAt`)
- `sortOrder` (string, optional): Sort order - `asc`, `desc` (default: `desc`)

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "string",
        "content": "string",
        "hashtags": ["#javascript", "#webdev"],
        "createdAt": "2025-09-30T00:00:00.000Z",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "stats": {
          "likes": 25,
          "comments": 8,
          "shares": 3
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 180,
      "totalPages": 9,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## User Search Endpoints

### 1. Search Users
**GET** `/api/users/search`

Search for users by username or display name.

#### Query Parameters
- `q` (string, required): Search query (1-100 characters)
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)

#### Headers
- `Authorization` (optional): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "string",
        "username": "string",
        "profile": {
          "displayName": "string",
          "bio": "string",
          "avatarUrl": "string",
          "isPublic": true
        },
        "stats": {
          "followersCount": 0,
          "followingCount": 0,
          "contentCount": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
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

### Pagination Object
```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5,
  "hasNext": true,
  "hasPrev": false
}
```

---

## Error Codes

### Authentication Errors
- `AUTHENTICATION_REQUIRED`: 401 - Token required
- `INVALID_TOKEN`: 401 - Invalid or expired token
- `INSUFFICIENT_PERMISSIONS`: 403 - User lacks required permissions

### Validation Errors
- `VALIDATION_ERROR`: 400 - Request validation failed
- `INVALID_URL`: 400 - Invalid URL format
- `INVALID_FILE`: 400 - Invalid file format or size

### Resource Errors
- `PROFILE_NOT_FOUND`: 404 - User profile not found
- `USER_NOT_FOUND`: 404 - User not found
- `CHANNEL_NOT_FOUND`: 404 - Channel not found
- `PRIVATE_PROFILE`: 403 - Profile is private

### Relationship Errors
- `INVALID_FOLLOW`: 400 - Cannot follow yourself
- `ALREADY_FOLLOWING`: 409 - Already following this user
- `NOT_FOLLOWING`: 404 - Not following this user

### Permission Errors
- `NOT_CHANNEL_OWNER`: 403 - Not the channel owner
- `ACCESS_DENIED`: 403 - Access denied to resource

### Connected Accounts Errors
- `INVALID_PROVIDER`: 400 - Invalid OAuth provider
- `PROVIDER_NOT_CONNECTED`: 404 - OAuth provider not connected
- `PROVIDER_ALREADY_CONNECTED`: 400 - OAuth provider already connected
- `PROVIDER_NOT_CONFIGURED`: 400 - OAuth provider not configured on server
- `LAST_LOGIN_METHOD`: 400 - Cannot disconnect the only login method

### Server Errors
- `INTERNAL_ERROR`: 500 - Internal server error
- `SERVICE_UNAVAILABLE`: 503 - Service temporarily unavailable

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Authenticated requests**: 1000 requests per hour
- **Upload endpoints**: 10 requests per minute
- **Search endpoints**: 100 requests per hour
- **Feed endpoints**: 500 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

---

## Pagination Guidelines

### Standard Pagination Parameters

All paginated endpoints follow these consistent parameters:

| Parameter | Type | Default | Min | Max | Description |
|-----------|------|---------|-----|-----|-------------|
| `page` | number | 1 | 1 | ∞ | Page number (1-indexed) |
| `limit` | number | 20 | 1 | 50 | Items per page |
| `offset` | number | 0 | 0 | ∞ | Alternative to page (for some endpoints) |

### Pagination Response Format

All paginated responses include a `pagination` object:

```json
{
  "pagination": {
    "page": 1,           // Current page number
    "limit": 20,         // Items per page
    "total": 100,        // Total number of items
    "totalPages": 5,     // Total number of pages
    "hasNext": true,     // Whether there's a next page
    "hasPrev": false,    // Whether there's a previous page
    "offset": 0          // Current offset (when applicable)
  }
}
```

### Pagination Strategies

#### 1. **Standard Page-Based Pagination**
Best for: User interfaces with page numbers, small to medium datasets

```javascript
// Example: Get page 3 with 20 items per page
const getPage = async (page, limit = 20) => {
  const response = await fetch(`/api/content/search?q=javascript&page=${page}&limit=${limit}`);
  const data = await response.json();
  
  return {
    items: data.data.contents,
    pagination: data.data.pagination
  };
};
```

#### 2. **Offset-Based Pagination**
Best for: API integrations, data exports, when you need precise control

```javascript
// Example: Get items 40-59 (offset 40, limit 20)
const getItemsByOffset = async (offset, limit = 20) => {
  const response = await fetch(`/api/recommendations/feed?offset=${offset}&limit=${limit}`);
  return await response.json();
};
```

#### 3. **Infinite Scroll Implementation**
Best for: Mobile apps, social feeds, continuous browsing

```javascript
class InfiniteScroll {
  constructor(endpoint, container) {
    this.endpoint = endpoint;
    this.container = container;
    this.page = 1;
    this.limit = 20;
    this.loading = false;
    this.hasMore = true;
    this.items = [];
  }

  async loadMore() {
    if (this.loading || !this.hasMore) return;

    this.loading = true;
    try {
      const response = await fetch(`${this.endpoint}?page=${this.page}&limit=${this.limit}`);
      const result = await response.json();
      
      if (result.success) {
        this.items.push(...result.data.contents);
        this.hasMore = result.data.pagination.hasNext;
        this.page++;
        this.renderItems(result.data.contents);
      }
    } finally {
      this.loading = false;
    }
  }

  renderItems(newItems) {
    newItems.forEach(item => {
      const element = this.createItemElement(item);
      this.container.appendChild(element);
    });
  }

  createItemElement(item) {
    // Create DOM element for item
    const div = document.createElement('div');
    div.innerHTML = `<h3>${item.title}</h3><p>${item.description}</p>`;
    return div;
  }
}

// Usage
const scrollManager = new InfiniteScroll('/api/content/feed/trending', document.getElementById('content-list'));

// Load more when scrolling near bottom
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
    scrollManager.loadMore();
  }
});
```

### Performance Optimization Tips

#### 1. **Efficient Query Parameters**
```javascript
// Good: Specific parameters
const getArticles = async (page) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    type: 'article',
    status: 'published',
    sortBy: 'publishedAt',
    sortOrder: 'desc'
  });
  
  return fetch(`/api/content/search?${params}`);
};

// Avoid: Too many unnecessary parameters
// fetch('/api/content/search?page=1&limit=20&sort=date&order=desc&filter=all&include=everything')
```

#### 2. **Caching Strategy**
```javascript
class CachedPagination {
  constructor(endpoint, ttl = 300000) { // 5 minutes TTL
    this.endpoint = endpoint;
    this.cache = new Map();
    this.ttl = ttl;
  }

  async getPage(page, filters = {}) {
    const cacheKey = this.generateCacheKey(page, filters);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await this.fetchPage(page, filters);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  generateCacheKey(page, filters) {
    return `${page}-${JSON.stringify(filters)}`;
  }

  async fetchPage(page, filters) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...filters
    });

    const response = await fetch(`${this.endpoint}?${params}`);
    return await response.json();
  }

  clearCache() {
    this.cache.clear();
  }
}
```

#### 3. **Preloading Next Page**
```javascript
class SmartPagination {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.currentPage = 1;
    this.cache = new Map();
    this.preloadOffset = 1; // Preload 1 page ahead
  }

  async getCurrentPage() {
    const data = await this.getPage(this.currentPage);
    
    // Preload next page if it exists
    if (data.pagination.hasNext) {
      this.preloadPage(this.currentPage + this.preloadOffset);
    }

    return data;
  }

  async getPage(page) {
    if (this.cache.has(page)) {
      return this.cache.get(page);
    }

    const response = await fetch(`${this.endpoint}?page=${page}&limit=20`);
    const data = await response.json();
    
    this.cache.set(page, data);
    return data;
  }

  async preloadPage(page) {
    if (!this.cache.has(page)) {
      // Preload in background without blocking
      this.getPage(page).catch(() => {
        // Silently fail preloading
      });
    }
  }

  async nextPage() {
    this.currentPage++;
    return this.getCurrentPage();
  }

  async prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      return this.getCurrentPage();
    }
  }
}
```

### Error Handling for Pagination

```javascript
class RobustPagination {
  constructor(endpoint, options = {}) {
    this.endpoint = endpoint;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  async getPage(page, attempt = 1) {
    try {
      const response = await fetch(`${this.endpoint}?page=${page}&limit=20`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.warn(`Pagination attempt ${attempt} failed:`, error.message);
      
      if (attempt < this.retryAttempts) {
        await this.delay(this.retryDelay * attempt);
        return this.getPage(page, attempt + 1);
      }
      
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async safeGetPage(page, fallbackData = null) {
    try {
      return await this.getPage(page);
    } catch (error) {
      console.error('Pagination failed completely:', error);
      return fallbackData || {
        success: false,
        data: { contents: [], pagination: { page, limit: 20, total: 0, totalPages: 0 } },
        error: error.message
      };
    }
  }
}
```

---

## File Upload Guidelines

### Avatar Upload
- **Supported formats**: JPEG, PNG, WebP
- **Maximum size**: 5MB
- **Recommended dimensions**: 400x400px minimum
- **Processing**: Automatically resized to 200x200 and 400x400 variants

### Content-Type Headers
- **JSON requests**: `application/json`
- **File uploads**: `multipart/form-data`
- **Form submissions**: `application/x-www-form-urlencoded`

---

## Frontend Integration Examples

### JavaScript Fetch Examples

#### Get User Profile
```javascript
const getUserProfile = async (userId) => {
  const response = await fetch(`/api/users/profile/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

#### Update Profile
```javascript
const updateProfile = async (profileData) => {
  const response = await fetch('/api/users/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
  });
  return await response.json();
};
```

#### Upload Avatar
```javascript
const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/users/upload-avatar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  return await response.json();
};
```

#### Follow User
```javascript
const followUser = async (userId) => {
  const response = await fetch(`/api/users/${userId}/follow`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

#### Search Users
```javascript
const searchUsers = async (query, page = 1) => {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: '20'
  });
  
  const response = await fetch(`/api/users/search?${params}`);
  return await response.json();
};
```

#### Get Connected Accounts
```javascript
const getConnectedAccounts = async () => {
  const response = await fetch('/api/users/connected-accounts', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

#### Disconnect OAuth Account
```javascript
const disconnectAccount = async (provider) => {
  const response = await fetch(`/api/users/connected-accounts/${provider}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

#### Initiate Account Linking
```javascript
const initiateAccountLink = async (provider) => {
  const response = await fetch(`/api/users/connected-accounts/${provider}/link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  if (result.success) {
    // Redirect user to OAuth provider
    window.location.href = result.data.authUrl;
  }
  return result;
};
```

#### Get User's Content
```javascript
const getUserContent = async (userId, options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 20,
    type: options.type || '',
    status: options.status || 'published',
    sortBy: options.sortBy || 'publishedAt',
    sortOrder: options.sortOrder || 'desc'
  });
  
  const response = await fetch(`/api/users/${userId}/content?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

#### Get Personalized Feed
```javascript
const getPersonalizedFeed = async (options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 20,
    category: options.category || '',
    type: options.type || '',
    includeFollowing: options.includeFollowing || true
  });
  
  const response = await fetch(`/api/content/feed/personalized?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

#### Get Trending Content
```javascript
const getTrendingContent = async (options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 20,
    category: options.category || '',
    timeframe: options.timeframe || '24h',
    type: options.type || ''
  });
  
  const response = await fetch(`/api/content/feed/trending?${params}`);
  return await response.json();
};
```

#### Search Content
```javascript
const searchContent = async (query, options = {}) => {
  const params = new URLSearchParams({
    q: query,
    page: options.page || 1,
    limit: options.limit || 20,
    type: options.type || '',
    category: options.category || '',
    sortBy: options.sortBy || 'relevance',
    author: options.author || '',
    dateFrom: options.dateFrom || '',
    dateTo: options.dateTo || ''
  });
  
  const response = await fetch(`/api/content/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

#### Get Content by Category
```javascript
const getContentByCategory = async (category, options = {}) => {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 20,
    sortBy: options.sortBy || 'recent',
    type: options.type || ''
  });
  
  const response = await fetch(`/api/content/feed/category/${category}?${params}`);
  return await response.json();
};
```

#### Pagination Helper Functions
```javascript
// Generic pagination handler
const handlePagination = (currentPage, totalPages, onPageChange) => {
  return {
    currentPage,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    goToPage: (page) => {
      if (page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    },
    nextPage: () => {
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    },
    prevPage: () => {
      if (currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    }
  };
};

// Load more items (infinite scroll)
const loadMoreContent = async (endpoint, currentItems, page, limit) => {
  const response = await fetch(`${endpoint}?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  if (result.success) {
    return {
      items: [...currentItems, ...result.data.contents || result.data.articles || result.data.videos || result.data.posts],
      hasMore: result.data.pagination.hasNext,
      nextPage: page + 1
    };
  }
  return { items: currentItems, hasMore: false, nextPage: page };
};

// Advanced pagination with caching
class PaginationManager {
  constructor(endpoint, options = {}) {
    this.endpoint = endpoint;
    this.cache = new Map();
    this.limit = options.limit || 20;
    this.token = options.token;
  }

  async getPage(page, filters = {}) {
    const cacheKey = `${page}-${JSON.stringify(filters)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const params = new URLSearchParams({
      page: page.toString(),
      limit: this.limit.toString(),
      ...filters
    });

    const response = await fetch(`${this.endpoint}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    const result = await response.json();
    this.cache.set(cacheKey, result);
    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

This documentation provides comprehensive information for frontend developers to integrate with the MediaCMS user profile management system.