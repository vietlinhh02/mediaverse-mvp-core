# Article API Endpoints

This document describes all the article-related endpoints available in the MediaCMS platform.

## Base URL
```
/api/content/articles
```

## Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [Article CRUD Operations](#article-crud-operations)
2. [Article Search & Filtering](#article-search--filtering)
3. [Article Publishing](#article-publishing)
4. [Article Analytics](#article-analytics)
5. [Bulk Operations](#bulk-operations)
6. [Common Response Formats](#common-response-formats)
7. [Error Codes](#error-codes)

---

## Article CRUD Operations

### 1. Create Article
**POST** `/api/content/articles`

Create a new article.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: multipart/form-data

#### Request Body (Form Data)
```json
{
  "title": "string", // required, 3-200 characters
  "content": "string", // required, min 10 characters
  "summary": "string", // optional, max 500 characters
  "category": "string", // required, valid category
  "tags": ["string"], // optional, max 10 tags
  "coverImage": "file", // optional, image file
  "visibility": "string", // public, private, unlisted (default: public)
  "allowComments": true, // boolean (default: true)
  "scheduledAt": "2025-09-30T00:00:00.000Z" // optional, future date for scheduling
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

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "slug": "string",
    "content": "string",
    "summary": "string",
    "category": "string",
    "tags": ["string"],
    "coverImageUrl": "string",
    "visibility": "public",
    "status": "draft",
    "allowComments": true,
    "readTime": 5,
    "authorId": "string",
    "createdAt": "2025-09-30T00:00:00.000Z",
    "updatedAt": "2025-09-30T00:00:00.000Z",
    "author": {
      "id": "string",
      "username": "string",
      "profile": {
        "displayName": "string",
        "avatarUrl": "string"
      }
    }
  },
  "message": "Article created successfully"
}
```

---

### 2. Get All Articles
**GET** `/api/content/articles`

Get paginated list of all published articles.

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `category` (string, optional): Filter by category
- `sortBy` (string, optional): Sort field - `createdAt`, `publishedAt`, `title`, `views` (default: `publishedAt`)
- `sortOrder` (string, optional): Sort order - `asc`, `desc` (default: `desc`)
- `status` (string, optional): Filter by status (admin only) - `published`, `draft`, `all`

#### Response Format
```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "string",
        "title": "string",
        "slug": "string",
        "summary": "string",
        "category": "string",
        "tags": ["string"],
        "coverImageUrl": "string",
        "readTime": 5,
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
          "views": 150,
          "likes": 12,
          "comments": 3
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

### 3. Get Article by ID
**GET** `/api/content/articles/:id`

Get a specific article by its ID.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Article ID

#### Headers
- `Authorization` (optional): Bearer token (required for private articles)

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "slug": "string",
    "content": "string",
    "summary": "string",
    "category": "string",
    "tags": ["string"],
    "coverImageUrl": "string",
    "visibility": "public",
    "status": "published",
    "allowComments": true,
    "readTime": 5,
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
      "views": 150,
      "likes": 12,
      "comments": 3,
      "shares": 2
    }
  }
}
```

---

### 4. Get Article by Slug
**GET** `/api/content/articles/slug/:slug`

Get a specific article by its slug (SEO-friendly URL).

#### Parameters
- **Path Parameters:**
  - `slug` (string, required): Article slug

#### Response Format
Same as Get Article by ID.

---

### 5. Update Article
**PUT** `/api/content/articles/:id`

Update an existing article.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Article ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "title": "string", // optional, 3-200 characters
  "content": "string", // optional, min 10 characters
  "summary": "string", // optional, max 500 characters
  "category": "string", // optional, valid category
  "tags": ["string"], // optional, max 10 tags
  "visibility": "string", // optional: public, private, unlisted
  "allowComments": true // optional, boolean
}
```

#### Response Format
Same as Create Article response.

#### Error Responses
- **403 Forbidden**: Not the article author
- **404 Not Found**: Article not found

---

### 6. Delete Article
**DELETE** `/api/content/articles/:id`

Delete an article.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Article ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "message": "Article deleted successfully"
}
```

#### Error Responses
- **403 Forbidden**: Not the article author
- **404 Not Found**: Article not found

---

## Article Search & Filtering

### 1. Search Articles
**GET** `/api/content/articles/search`

Search articles by title, content, or tags.

#### Query Parameters
- `q` (string, required): Search query (1-100 characters)
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `category` (string, optional): Filter by category
- `tags` (string, optional): Filter by tags (comma-separated)
- `author` (string, optional): Filter by author username
- `sortBy` (string, optional): Sort field - `relevance`, `recent`, `popular` (default: `relevance`)
- `dateFrom` (string, optional): Filter from date (ISO format)
- `dateTo` (string, optional): Filter to date (ISO format)

#### Response Format
```json
{
  "success": true,
  "data": {
    "query": "javascript tutorial",
    "articles": [
      {
        "id": "string",
        "title": "string",
        "summary": "string",
        "category": "string",
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
    },
    "filters": {
      "category": "technology",
      "tags": ["javascript", "tutorial"],
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

### 2. Get Articles by Category
**GET** `/api/content/articles/category/:category`

Get articles filtered by specific category.

#### Parameters
- **Path Parameters:**
  - `category` (string, required): Category name

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort field (default: `publishedAt`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "category": "technology",
    "articles": [
      // Article objects
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 3. Get User's Articles
**GET** `/api/content/users/:userId/articles`

Get articles by specific user.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Filter by status - `published`, `draft`, `all` (default: `published`)

#### Headers
- `Authorization` (optional): Bearer token (required for drafts or private articles)

#### Response Format
```json
{
  "success": true,
  "data": {
    "articles": [
      // Article objects
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 4. Get Related Articles
**GET** `/api/content/articles/:id/related`

Get articles related to the specified article.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Article ID

#### Query Parameters
- `limit` (number, optional): Number of related articles (default: 5, max: 10)

#### Response Format
```json
{
  "success": true,
  "data": {
    "relatedArticles": [
      {
        "id": "string",
        "title": "string",
        "summary": "string",
        "category": "string",
        "publishedAt": "2025-09-30T00:00:00.000Z",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "relevanceScore": 85.5
      }
    ]
  }
}
```

---

## Article Publishing

### 1. Publish Article
**POST** `/api/content/articles/:id/publish`

Publish a draft article.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Article ID

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
    // Updated article object with status: "published"
  },
  "message": "Article published successfully"
}
```

#### Error Responses
- **403 Forbidden**: Not the article author
- **404 Not Found**: Article not found
- **400 Bad Request**: Article already published

---

## Article Analytics

### 1. Get Article Stats
**GET** `/api/content/articles/:id/stats`

Get detailed analytics for an article.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Article ID

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `period` (string, optional): Time period - `7d`, `30d`, `90d`, `1y` (default: `30d`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "articleId": "string",
    "period": "30d",
    "stats": {
      "views": {
        "total": 1250,
        "unique": 890,
        "growth": 15.5,
        "daily": [
          {"date": "2025-09-01", "views": 45},
          {"date": "2025-09-02", "views": 52}
        ]
      },
      "engagement": {
        "likes": 89,
        "comments": 23,
        "shares": 12,
        "averageReadTime": 4.5,
        "completionRate": 78.5
      },
      "traffic": {
        "sources": {
          "direct": 45,
          "search": 30,
          "social": 15,
          "referral": 10
        },
        "countries": [
          {"country": "US", "views": 450},
          {"country": "GB", "views": 230}
        ],
        "devices": {
          "desktop": 60,
          "mobile": 35,
          "tablet": 5
        }
      }
    }
  }
}
```

#### Error Responses
- **403 Forbidden**: Not the article author
- **404 Not Found**: Article not found

---

### 2. Get Article Revisions
**GET** `/api/content/articles/:id/revisions`

Get revision history of an article.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Article ID

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 50)

#### Response Format
```json
{
  "success": true,
  "data": {
    "revisions": [
      {
        "id": "string",
        "version": 3,
        "title": "string",
        "summary": "Updated content with new examples",
        "changedFields": ["title", "content", "tags"],
        "createdAt": "2025-09-30T00:00:00.000Z",
        "createdBy": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## Bulk Operations

### 1. Bulk Update Articles
**PUT** `/api/content/articles/bulk-update`

Update multiple articles at once.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "articleIds": ["id1", "id2", "id3"],
  "updates": {
    "category": "technology",
    "tags": ["updated", "bulk"],
    "visibility": "public"
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
        "message": "Article updated successfully"
      }
    ]
  },
  "message": "Bulk update completed"
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
- `INVALID_CATEGORY`: 400 - Invalid category value
- `INVALID_TAGS`: 400 - Invalid tags format or count
- `TITLE_TOO_SHORT`: 400 - Title must be at least 3 characters
- `TITLE_TOO_LONG`: 400 - Title cannot exceed 200 characters
- `CONTENT_TOO_SHORT`: 400 - Content must be at least 10 characters

### Resource Errors
- `ARTICLE_NOT_FOUND`: 404 - Article not found
- `ARTICLE_ALREADY_PUBLISHED`: 400 - Article is already published
- `ARTICLE_NOT_DRAFT`: 400 - Article is not in draft status

### Permission Errors
- `NOT_ARTICLE_AUTHOR`: 403 - Not the article author
- `ACCESS_DENIED`: 403 - Access denied to resource

### Server Errors
- `INTERNAL_ERROR`: 500 - Internal server error
- `SERVICE_UNAVAILABLE`: 503 - Service temporarily unavailable

---

## JavaScript Examples

### Create Article
```javascript
const createArticle = async (articleData) => {
  const formData = new FormData();
  
  // Add text fields
  Object.keys(articleData).forEach(key => {
    if (key !== 'coverImage' && articleData[key] !== undefined) {
      if (Array.isArray(articleData[key])) {
        formData.append(key, JSON.stringify(articleData[key]));
      } else {
        formData.append(key, articleData[key]);
      }
    }
  });
  
  // Add cover image if provided
  if (articleData.coverImage) {
    formData.append('coverImage', articleData.coverImage);
  }
  
  const response = await fetch('/api/content/articles', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return await response.json();
};
```

### Search Articles
```javascript
const searchArticles = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    page: filters.page || 1,
    limit: filters.limit || 20,
    category: filters.category || '',
    tags: filters.tags ? filters.tags.join(',') : '',
    author: filters.author || '',
    sortBy: filters.sortBy || 'relevance'
  });
  
  const response = await fetch(`/api/content/articles/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

### Get Article Analytics
```javascript
const getArticleStats = async (articleId, period = '30d') => {
  const response = await fetch(`/api/content/articles/${articleId}/stats?period=${period}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

This documentation provides comprehensive information for frontend developers to integrate with the MediaCMS article management system.