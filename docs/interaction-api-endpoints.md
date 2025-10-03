# Interaction API Endpoints

This document describes all the social interaction endpoints available in the MediaCMS platform including likes, comments, shares, and community features.

## Base URL
```
/api/content
```

## Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [Like System](#like-system)
2. [Comment System](#comment-system)
3. [Share System](#share-system)
4. [Community Posts](#community-posts)
5. [Hashtag System](#hashtag-system)
6. [User Following](#user-following)
7. [Notification System](#notification-system)
8. [Common Response Formats](#common-response-formats)
9. [Error Codes](#error-codes)

---

## Like System

### 1. Like Content
**POST** `/api/content/:id/like`

Like a piece of content (article, video, or document).

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "isLiked": true,
    "likeCount": 891,
    "userLike": {
      "id": "string",
      "userId": "string",
      "createdAt": "2025-09-30T10:00:00.000Z"
    }
  },
  "message": "Content liked successfully"
}
```

---

### 2. Unlike Content
**DELETE** `/api/content/:id/like`

Remove like from a piece of content.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "isLiked": false,
    "likeCount": 890
  },
  "message": "Content unliked successfully"
}
```

---

### 3. Check Like Status
**GET** `/api/content/:id/like-status`

Check if the current user has liked the content.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "isLiked": true,
    "likeCount": 891,
    "userLike": {
      "id": "string",
      "createdAt": "2025-09-30T10:00:00.000Z"
    }
  }
}
```

---

### 4. Get Content Likes
**GET** `/api/content/:id/likes`

Get list of users who liked the content.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `sortBy` (string, optional): Sort by - `recent`, `oldest` (default: `recent`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "totalLikes": 891,
    "likes": [
      {
        "id": "string",
        "user": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "createdAt": "2025-09-30T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 891,
      "totalPages": 45,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## Comment System

### 1. Create Comment
**POST** `/api/content/:id/comments`

Add a comment to content.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "content": "string", // required, 1-2000 characters
  "parentId": "string", // optional, for replies to other comments
  "mentions": ["@username1", "@username2"], // optional, mentioned users
  "attachments": [
    {
      "type": "image", // image, gif, link
      "url": "string",
      "metadata": {
        "width": 800,
        "height": 600,
        "alt": "Image description"
      }
    }
  ]
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "content": "string",
    "contentId": "string",
    "parentId": null,
    "author": {
      "id": "string",
      "username": "string",
      "profile": {
        "displayName": "string",
        "avatarUrl": "string"
      }
    },
    "mentions": [
      {
        "username": "username1",
        "displayName": "User One"
      }
    ],
    "attachments": [
      {
        "type": "image",
        "url": "string",
        "metadata": {
          "width": 800,
          "height": 600,
          "alt": "Image description"
        }
      }
    ],
    "stats": {
      "likes": 0,
      "replies": 0
    },
    "isLiked": false,
    "createdAt": "2025-09-30T10:00:00.000Z",
    "updatedAt": "2025-09-30T10:00:00.000Z"
  },
  "message": "Comment created successfully"
}
```

---

### 2. Get Content Comments
**GET** `/api/content/:id/comments`

Get comments for a piece of content.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `sortBy` (string, optional): Sort by - `recent`, `oldest`, `popular` (default: `recent`)
- `includeReplies` (boolean, optional): Include nested replies (default: false)

#### Response Format
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "totalComments": 234,
    "comments": [
      {
        "id": "string",
        "content": "string",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "stats": {
          "likes": 12,
          "replies": 3
        },
        "isLiked": false,
        "replies": [
          // Nested replies if includeReplies=true
        ],
        "createdAt": "2025-09-30T09:30:00.000Z",
        "updatedAt": "2025-09-30T09:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 234,
      "totalPages": 12,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 3. Update Comment
**PUT** `/api/content/comments/:commentId`

Update an existing comment.

#### Parameters
- **Path Parameters:**
  - `commentId` (string, required): Comment ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "content": "string", // required, 1-2000 characters
  "mentions": ["@username1"], // optional, updated mentions
  "attachments": [
    // Updated attachments
  ]
}
```

#### Response Format
Same as Create Comment response with updated data.

---

### 4. Delete Comment
**DELETE** `/api/content/comments/:commentId`

Delete a comment.

#### Parameters
- **Path Parameters:**
  - `commentId` (string, required): Comment ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "commentId": "string",
    "deleted": true
  },
  "message": "Comment deleted successfully"
}
```

---

### 5. Get Comment Replies
**GET** `/api/content/comments/:commentId/replies`

Get replies to a specific comment.

#### Parameters
- **Path Parameters:**
  - `commentId` (string, required): Comment ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 50)
- `sortBy` (string, optional): Sort by - `recent`, `oldest`, `popular` (default: `recent`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "parentCommentId": "string",
    "totalReplies": 15,
    "replies": [
      {
        "id": "string",
        "content": "string",
        "parentId": "string",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "stats": {
          "likes": 3
        },
        "isLiked": false,
        "createdAt": "2025-09-30T09:45:00.000Z"
      }
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 6. Like Comment
**POST** `/api/content/comments/:commentId/like`

Like a comment.

#### Parameters
- **Path Parameters:**
  - `commentId` (string, required): Comment ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "commentId": "string",
    "isLiked": true,
    "likeCount": 13
  },
  "message": "Comment liked successfully"
}
```

---

### 7. Unlike Comment
**DELETE** `/api/content/comments/:commentId/like`

Remove like from a comment.

#### Parameters
- **Path Parameters:**
  - `commentId` (string, required): Comment ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "commentId": "string",
    "isLiked": false,
    "likeCount": 12
  },
  "message": "Comment unliked successfully"
}
```

---

## Share System

### 1. Share Content
**POST** `/api/content/:id/share`

Share content to social platforms or generate share link.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "platform": "string", // twitter, facebook, linkedin, email, copy, internal
  "message": "string", // optional, custom share message
  "recipients": ["user1", "user2"], // for internal shares
  "includeMessage": true, // optional, include custom message
  "trackShare": true // optional, track share analytics
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "shareId": "string",
    "contentId": "string",
    "platform": "twitter",
    "shareUrl": "string",
    "shareMessage": "string",
    "trackingUrl": "string", // for analytics
    "expiresAt": "2025-10-30T10:00:00.000Z", // for temporary links
    "shareCount": 89,
    "estimatedReach": 1500
  },
  "message": "Content shared successfully"
}
```

---

### 2. Get Content Shares
**GET** `/api/content/:id/shares`

Get share statistics and list of shares for content.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `platform` (string, optional): Filter by platform

#### Response Format
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "totalShares": 89,
    "platformBreakdown": {
      "twitter": 35,
      "facebook": 28,
      "linkedin": 15,
      "email": 8,
      "internal": 3
    },
    "shares": [
      {
        "id": "string",
        "platform": "twitter",
        "sharedBy": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string"
          }
        },
        "message": "string",
        "clicks": 45,
        "reach": 1200,
        "sharedAt": "2025-09-30T08:30:00.000Z"
      }
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 3. Get Share Analytics
**GET** `/api/content/:id/share-analytics`

Get detailed analytics for content shares.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Content ID

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `period` (string, optional): Time period - `7d`, `30d`, `90d` (default: `30d`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "period": "30d",
    "analytics": {
      "totalShares": 89,
      "totalClicks": 2340,
      "totalReach": 45600,
      "conversionRate": 12.5,
      "averageClicksPerShare": 26.3,
      "platforms": [
        {
          "platform": "twitter",
          "shares": 35,
          "clicks": 920,
          "reach": 18400,
          "engagement": 15.2
        }
      ],
      "timeline": [
        {
          "date": "2025-09-01",
          "shares": 3,
          "clicks": 78,
          "reach": 1560
        }
      ],
      "topSharers": [
        {
          "user": {
            "username": "influencer1",
            "displayName": "Tech Influencer"
          },
          "shares": 5,
          "totalReach": 8900
        }
      ]
    }
  }
}
```

---

## Community Posts

### 1. Create Community Post
**POST** `/api/content/community/posts`

Create a new community post.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "content": "string", // required, 1-5000 characters
  "type": "text", // text, image, video, link, poll
  "visibility": "public", // public, followers, private
  "hashtags": ["#technology", "#tutorial"], // optional
  "mentions": ["@username1"], // optional
  "attachments": [
    {
      "type": "image",
      "url": "string",
      "metadata": {
        "width": 1200,
        "height": 800,
        "alt": "Post image"
      }
    }
  ],
  "poll": {
    // For poll type posts
    "question": "string",
    "options": ["Option 1", "Option 2", "Option 3"],
    "allowMultiple": false,
    "expiresAt": "2025-10-07T00:00:00.000Z"
  },
  "scheduledAt": "2025-10-01T10:00:00.000Z" // optional, for scheduled posts
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "content": "string",
    "type": "text",
    "visibility": "public",
    "author": {
      "id": "string",
      "username": "string",
      "profile": {
        "displayName": "string",
        "avatarUrl": "string"
      }
    },
    "hashtags": ["technology", "tutorial"],
    "mentions": [
      {
        "username": "username1",
        "displayName": "User One"
      }
    ],
    "attachments": [
      // Attachment objects
    ],
    "stats": {
      "likes": 0,
      "comments": 0,
      "shares": 0,
      "views": 0
    },
    "engagement": {
      "isLiked": false,
      "isBookmarked": false
    },
    "createdAt": "2025-09-30T10:00:00.000Z",
    "updatedAt": "2025-09-30T10:00:00.000Z"
  },
  "message": "Community post created successfully"
}
```

---

### 2. Get Community Posts
**GET** `/api/content/community/posts`

Get community posts feed.

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 50)
- `type` (string, optional): Filter by post type - `text`, `image`, `video`, `poll`
- `visibility` (string, optional): Filter by visibility - `public`, `followers`
- `hashtag` (string, optional): Filter by hashtag
- `author` (string, optional): Filter by author username
- `sortBy` (string, optional): Sort by - `recent`, `popular`, `trending` (default: `recent`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "string",
        "content": "string",
        "type": "image",
        "visibility": "public",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "attachments": [
          {
            "type": "image",
            "url": "string",
            "metadata": {
              "width": 1200,
              "height": 800
            }
          }
        ],
        "stats": {
          "likes": 45,
          "comments": 12,
          "shares": 8,
          "views": 890
        },
        "engagement": {
          "isLiked": false,
          "isBookmarked": true
        },
        "createdAt": "2025-09-30T09:00:00.000Z"
      }
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 3. Update Community Post
**PUT** `/api/content/community/posts/:postId`

Update an existing community post.

#### Parameters
- **Path Parameters:**
  - `postId` (string, required): Post ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "content": "string", // optional, updated content
  "visibility": "public", // optional, updated visibility
  "hashtags": ["#updated"], // optional, updated hashtags
  "attachments": [] // optional, updated attachments
}
```

#### Response Format
Same as Create Community Post response with updated data.

---

### 4. Delete Community Post
**DELETE** `/api/content/community/posts/:postId`

Delete a community post.

#### Parameters
- **Path Parameters:**
  - `postId` (string, required): Post ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "postId": "string",
    "deleted": true
  },
  "message": "Community post deleted successfully"
}
```

---

## Hashtag System

### 1. Get Trending Hashtags
**GET** `/api/content/hashtags`

Get currently trending hashtags.

#### Query Parameters
- `limit` (number, optional): Number of hashtags (default: 20, max: 50)
- `timeframe` (string, optional): Timeframe - `hour`, `day`, `week` (default: `day`)
- `category` (string, optional): Filter by content category

#### Response Format
```json
{
  "success": true,
  "data": {
    "hashtags": [
      {
        "tag": "technology",
        "displayTag": "#technology",
        "count": 1250,
        "growth": "+25%",
        "category": "technology",
        "trendingScore": 89.5,
        "posts": [
          // Sample posts using this hashtag
        ]
      }
    ],
    "timeframe": "day",
    "generatedAt": "2025-09-30T10:00:00.000Z"
  }
}
```

---

### 2. Get Content by Hashtag
**GET** `/api/content/hashtags/:hashtag/content`

Get content that uses a specific hashtag.

#### Parameters
- **Path Parameters:**
  - `hashtag` (string, required): Hashtag (without #)

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `contentType` (string, optional): Filter by content type
- `sortBy` (string, optional): Sort by - `recent`, `popular` (default: `recent`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "hashtag": {
      "tag": "technology",
      "displayTag": "#technology",
      "totalPosts": 1250,
      "description": "Technology related content and discussions"
    },
    "content": [
      // Content objects that use this hashtag
    ],
    "relatedHashtags": [
      {
        "tag": "ai",
        "count": 890
      },
      {
        "tag": "programming",
        "count": 750
      }
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

## User Following

### 1. Follow User
**POST** `/api/users/:userId/follow`

Follow another user.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID to follow

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "isFollowing": true,
    "followerCount": 1251,
    "mutualFollows": [
      {
        "id": "string",
        "username": "string",
        "profile": {
          "displayName": "string",
          "avatarUrl": "string"
        }
      }
    ]
  },
  "message": "User followed successfully"
}
```

---

### 2. Unfollow User
**DELETE** `/api/users/:userId/follow`

Unfollow a user.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID to unfollow

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "isFollowing": false,
    "followerCount": 1249
  },
  "message": "User unfollowed successfully"
}
```

---

### 3. Get User Followers
**GET** `/api/users/:userId/followers`

Get list of user's followers.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

#### Response Format
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "totalFollowers": 1250,
    "followers": [
      {
        "id": "string",
        "username": "string",
        "profile": {
          "displayName": "string",
          "avatarUrl": "string",
          "bio": "string"
        },
        "isFollowing": false,
        "followedAt": "2025-09-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 4. Get User Following
**GET** `/api/users/:userId/following`

Get list of users that a user is following.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

#### Response Format
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "totalFollowing": 456,
    "following": [
      {
        "id": "string",
        "username": "string",
        "profile": {
          "displayName": "string",
          "avatarUrl": "string",
          "bio": "string"
        },
        "isFollowing": true,
        "followedAt": "2025-09-20T15:30:00.000Z"
      }
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

## Notification System

### 1. Get Notifications
**GET** `/api/notifications`

Get user's notifications.

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `type` (string, optional): Filter by type - `like`, `comment`, `follow`, `share`, `mention`
- `unreadOnly` (boolean, optional): Show only unread notifications (default: false)

#### Response Format
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "string",
        "type": "like",
        "title": "New like on your post",
        "message": "John Doe liked your article 'Introduction to AI'",
        "actor": {
          "id": "string",
          "username": "johndoe",
          "profile": {
            "displayName": "John Doe",
            "avatarUrl": "string"
          }
        },
        "target": {
          "type": "article",
          "id": "string",
          "title": "Introduction to AI"
        },
        "isRead": false,
        "createdAt": "2025-09-30T09:30:00.000Z"
      }
    ],
    "unreadCount": 5,
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 2. Mark Notification as Read
**PUT** `/api/notifications/:notificationId/read`

Mark a notification as read.

#### Parameters
- **Path Parameters:**
  - `notificationId` (string, required): Notification ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "notificationId": "string",
    "isRead": true
  },
  "message": "Notification marked as read"
}
```

---

### 3. Mark All Notifications as Read
**PUT** `/api/notifications/mark-all-read`

Mark all notifications as read.

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "markedCount": 5,
    "unreadCount": 0
  },
  "message": "All notifications marked as read"
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

### Like System Errors
- `CONTENT_NOT_FOUND`: 404 - Content not found
- `ALREADY_LIKED`: 400 - Content already liked
- `NOT_LIKED`: 400 - Content not currently liked
- `CANNOT_LIKE_OWN_CONTENT`: 400 - Cannot like own content

### Comment System Errors
- `COMMENT_NOT_FOUND`: 404 - Comment not found
- `COMMENT_TOO_LONG`: 400 - Comment exceeds maximum length
- `COMMENT_EMPTY`: 400 - Comment cannot be empty
- `PARENT_COMMENT_NOT_FOUND`: 404 - Parent comment not found
- `COMMENT_DEPTH_EXCEEDED`: 400 - Maximum reply depth exceeded
- `NOT_COMMENT_OWNER`: 403 - Not the comment owner

### Share System Errors
- `INVALID_PLATFORM`: 400 - Invalid sharing platform
- `SHARE_LIMIT_EXCEEDED`: 429 - Share limit exceeded
- `PRIVATE_CONTENT_SHARE`: 403 - Cannot share private content

### Community Post Errors
- `POST_NOT_FOUND`: 404 - Community post not found
- `POST_TOO_LONG`: 400 - Post content exceeds maximum length
- `INVALID_POST_TYPE`: 400 - Invalid post type
- `NOT_POST_OWNER`: 403 - Not the post owner

### Following Errors
- `USER_NOT_FOUND`: 404 - User not found
- `CANNOT_FOLLOW_SELF`: 400 - Cannot follow yourself
- `ALREADY_FOLLOWING`: 400 - Already following user
- `NOT_FOLLOWING`: 400 - Not currently following user

---

## JavaScript Examples

### Interaction Manager
```javascript
class InteractionManager {
  constructor() {
    this.token = this.getToken();
  }

  // Like functionality
  async toggleLike(contentId) {
    try {
      const statusResponse = await fetch(`/api/content/${contentId}/like-status`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const statusData = await statusResponse.json();

      const method = statusData.data.isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/content/${contentId}/like`, {
        method,
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        this.updateLikeUI(contentId, data.data);
        return data.data;
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      throw error;
    }
  }

  updateLikeUI(contentId, likeData) {
    const likeButton = document.querySelector(`[data-content-id="${contentId}"] .like-btn`);
    const likeCount = document.querySelector(`[data-content-id="${contentId}"] .like-count`);
    
    if (likeButton) {
      likeButton.classList.toggle('active', likeData.isLiked);
      likeButton.innerHTML = likeData.isLiked ? '❤️ Liked' : '🤍 Like';
    }
    
    if (likeCount) {
      likeCount.textContent = this.formatNumber(likeData.likeCount);
    }
  }

  // Comment functionality
  async postComment(contentId, commentData) {
    try {
      const response = await fetch(`/api/content/${contentId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commentData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.addCommentToUI(data.data);
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      throw error;
    }
  }

  addCommentToUI(comment) {
    const commentsContainer = document.querySelector(`[data-content-id="${comment.contentId}"] .comments-list`);
    if (!commentsContainer) return;

    const commentElement = this.createCommentElement(comment);
    commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);
  }

  createCommentElement(comment) {
    const element = document.createElement('div');
    element.className = 'comment';
    element.dataset.commentId = comment.id;
    element.innerHTML = `
      <div class="comment-header">
        <img src="${comment.author.profile.avatarUrl}" alt="${comment.author.profile.displayName}" class="comment-avatar">
        <div class="comment-info">
          <span class="comment-author">${comment.author.profile.displayName}</span>
          <span class="comment-time">${this.formatDate(comment.createdAt)}</span>
        </div>
      </div>
      <div class="comment-content">${comment.content}</div>
      <div class="comment-actions">
        <button class="comment-like-btn" data-comment-id="${comment.id}">
          ${comment.isLiked ? '❤️' : '🤍'} ${comment.stats.likes}
        </button>
        <button class="comment-reply-btn" data-comment-id="${comment.id}">
          Reply
        </button>
      </div>
    `;

    // Add event listeners
    element.querySelector('.comment-like-btn').addEventListener('click', () => {
      this.toggleCommentLike(comment.id);
    });

    element.querySelector('.comment-reply-btn').addEventListener('click', () => {
      this.showReplyForm(comment.id);
    });

    return element;
  }

  // Share functionality
  async shareContent(contentId, platform, options = {}) {
    try {
      const response = await fetch(`/api/content/${contentId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform,
          ...options
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.handleShareSuccess(platform, data.data);
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to share content:', error);
      throw error;
    }
  }

  handleShareSuccess(platform, shareData) {
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareData.shareUrl);
      this.showNotification('Link copied to clipboard!');
    } else if (shareData.shareUrl && platform !== 'internal') {
      window.open(shareData.shareUrl, '_blank', 'width=600,height=400');
    }
    
    this.updateShareCount(shareData.contentId, shareData.shareCount);
  }

  updateShareCount(contentId, shareCount) {
    const shareCountElement = document.querySelector(`[data-content-id="${contentId}"] .share-count`);
    if (shareCountElement) {
      shareCountElement.textContent = this.formatNumber(shareCount);
    }
  }

  // Utility methods
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  }

  showNotification(message) {
    // Simple notification - replace with your notification system
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  getToken() {
    return localStorage.getItem('authToken');
  }
}

// Usage
const interactionManager = new InteractionManager();

// Like content
document.querySelectorAll('.like-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const contentId = e.target.closest('[data-content-id]').dataset.contentId;
    await interactionManager.toggleLike(contentId);
  });
});

// Share content
document.querySelectorAll('.share-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const contentId = e.target.closest('[data-content-id]').dataset.contentId;
    showShareModal(contentId);
  });
});

function showShareModal(contentId) {
  const modal = document.createElement('div');
  modal.className = 'share-modal';
  modal.innerHTML = `
    <div class="share-modal-content">
      <h3>Share this content</h3>
      <div class="share-options">
        <button class="share-option" data-platform="twitter">Twitter</button>
        <button class="share-option" data-platform="facebook">Facebook</button>
        <button class="share-option" data-platform="linkedin">LinkedIn</button>
        <button class="share-option" data-platform="copy">Copy Link</button>
      </div>
    </div>
  `;

  modal.querySelectorAll('.share-option').forEach(option => {
    option.addEventListener('click', async (e) => {
      const platform = e.target.dataset.platform;
      await interactionManager.shareContent(contentId, platform);
      modal.remove();
    });
  });

  document.body.appendChild(modal);
}
```

### Comment System Component
```javascript
class CommentSystem {
  constructor(contentId, containerId) {
    this.contentId = contentId;
    this.container = document.getElementById(containerId);
    this.comments = [];
    this.page = 1;
    this.hasMore = true;
  }

  async initialize() {
    this.setupUI();
    await this.loadComments();
  }

  setupUI() {
    this.container.innerHTML = `
      <div class="comment-form">
        <textarea id="comment-input" placeholder="Write a comment..." rows="3"></textarea>
        <div class="comment-form-actions">
          <button id="post-comment-btn" class="btn btn-primary">Post Comment</button>
        </div>
      </div>
      <div class="comments-section">
        <div class="comments-header">
          <h4>Comments (<span id="comment-count">0</span>)</h4>
          <select id="comment-sort">
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
        <div id="comments-list" class="comments-list"></div>
        <button id="load-more-comments" class="btn btn-secondary" style="display: none;">
          Load More Comments
        </button>
      </div>
    `;

    // Setup event listeners
    document.getElementById('post-comment-btn').addEventListener('click', () => {
      this.postComment();
    });

    document.getElementById('comment-sort').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.resetComments();
      this.loadComments();
    });

    document.getElementById('load-more-comments').addEventListener('click', () => {
      this.loadComments();
    });
  }

  async loadComments() {
    try {
      const params = new URLSearchParams({
        page: this.page,
        limit: 20,
        sortBy: this.sortBy || 'recent'
      });

      const response = await fetch(`/api/content/${this.contentId}/comments?${params}`);
      const data = await response.json();

      if (data.success) {
        this.appendComments(data.data.comments);
        this.updateCommentCount(data.data.totalComments);
        this.hasMore = data.data.pagination.hasNext;
        this.page++;
        
        document.getElementById('load-more-comments').style.display = 
          this.hasMore ? 'block' : 'none';
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }

  appendComments(comments) {
    const commentsList = document.getElementById('comments-list');
    
    comments.forEach(comment => {
      const commentElement = this.createCommentElement(comment);
      commentsList.appendChild(commentElement);
    });

    this.comments.push(...comments);
  }

  createCommentElement(comment) {
    const element = document.createElement('div');
    element.className = 'comment';
    element.dataset.commentId = comment.id;
    element.innerHTML = `
      <div class="comment-content">
        <div class="comment-header">
          <img src="${comment.author.profile.avatarUrl}" alt="${comment.author.profile.displayName}" class="comment-avatar">
          <div class="comment-meta">
            <span class="comment-author">${comment.author.profile.displayName}</span>
            <span class="comment-time">${this.formatDate(comment.createdAt)}</span>
          </div>
        </div>
        <div class="comment-text">${this.formatCommentContent(comment.content)}</div>
        <div class="comment-actions">
          <button class="comment-action like-comment ${comment.isLiked ? 'active' : ''}" data-comment-id="${comment.id}">
            ${comment.isLiked ? '❤️' : '🤍'} Like <span class="like-count">${comment.stats.likes}</span>
          </button>
          <button class="comment-action reply-comment" data-comment-id="${comment.id}">
            Reply
          </button>
          ${comment.stats.replies > 0 ? `
            <button class="comment-action view-replies" data-comment-id="${comment.id}">
              View ${comment.stats.replies} replies
            </button>
          ` : ''}
        </div>
      </div>
      <div class="replies-container" id="replies-${comment.id}" style="display: none;"></div>
    `;

    this.setupCommentListeners(element);
    return element;
  }

  setupCommentListeners(element) {
    const commentId = element.dataset.commentId;

    // Like comment
    element.querySelector('.like-comment').addEventListener('click', () => {
      this.toggleCommentLike(commentId);
    });

    // Reply to comment
    element.querySelector('.reply-comment').addEventListener('click', () => {
      this.showReplyForm(commentId);
    });

    // View replies
    const viewRepliesBtn = element.querySelector('.view-replies');
    if (viewRepliesBtn) {
      viewRepliesBtn.addEventListener('click', () => {
        this.loadReplies(commentId);
      });
    }
  }

  async postComment() {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();

    if (!content) return;

    try {
      const response = await fetch(`/api/content/${this.contentId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      const data = await response.json();

      if (data.success) {
        input.value = '';
        this.prependComment(data.data);
        this.updateCommentCount(this.comments.length + 1);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  }

  prependComment(comment) {
    const commentsList = document.getElementById('comments-list');
    const commentElement = this.createCommentElement(comment);
    commentsList.insertBefore(commentElement, commentsList.firstChild);
    this.comments.unshift(comment);
  }

  formatCommentContent(content) {
    // Convert mentions and hashtags to links
    return content
      .replace(/@(\w+)/g, '<a href="/users/$1" class="mention">@$1</a>')
      .replace(/#(\w+)/g, '<a href="/hashtags/$1" class="hashtag">#$1</a>');
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  }

  updateCommentCount(count) {
    document.getElementById('comment-count').textContent = count;
  }

  resetComments() {
    this.comments = [];
    this.page = 1;
    this.hasMore = true;
    document.getElementById('comments-list').innerHTML = '';
  }

  getToken() {
    return localStorage.getItem('authToken');
  }
}

// Usage
const commentSystem = new CommentSystem('content-id', 'comments-container');
commentSystem.initialize();
```

This documentation provides comprehensive information for frontend developers to integrate with the MediaCMS social interaction system, including likes, comments, shares, community posts, and user following features.