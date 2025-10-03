# Feed API Endpoints

This document describes all the feed and content discovery endpoints available in the MediaCMS platform.

## Base URL
```
/api/content/feed
```

## Authentication
Some endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [Feed Types](#feed-types)
2. [Personalized Content](#personalized-content)
3. [Content Discovery](#content-discovery)
4. [Trending & Popular](#trending--popular)
5. [Category-based Feeds](#category-based-feeds)
6. [Feed Customization](#feed-customization)
7. [Cache Management](#cache-management)
8. [Common Response Formats](#common-response-formats)
9. [Error Codes](#error-codes)

---

## Feed Types

### 1. Get Personalized Feed
**GET** `/api/content/feed/personalized`

Get a personalized content feed based on user's preferences, viewing history, and interactions.

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `contentTypes` (array, optional): Filter by content types - `['article', 'video', 'document']` (default: all)
- `timeframe` (string, optional): Content timeframe - `recent`, `week`, `month`, `all` (default: `all`)
- `includeFollowing` (boolean, optional): Include content from followed users (default: true)

#### Response Format
```json
{
  "success": true,
  "data": {
    "feed": [
      {
        "id": "string",
        "type": "article", // article, video, document
        "title": "string",
        "description": "string",
        "thumbnailUrl": "string",
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
          "views": 1250,
          "likes": 89,
          "comments": 23,
          "shares": 12
        },
        "engagement": {
          "isLiked": true,
          "isBookmarked": false,
          "userInteractionScore": 85.2
        },
        "recommendationReason": "Based on your interests in technology",
        "priority": 95.5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "feedMetadata": {
      "generatedAt": "2025-09-30T10:00:00.000Z",
      "refreshedAt": "2025-09-30T10:00:00.000Z",
      "algorithm": "collaborative_filtering_v2",
      "personalizationScore": 92.1
    }
  }
}
```

---

### 2. Get General Feed
**GET** `/api/content/feed/general`

Get a general content feed without personalization.

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `contentTypes` (array, optional): Filter by content types - `['article', 'video', 'document']` (default: all)
- `sortBy` (string, optional): Sort criteria - `recent`, `popular`, `trending` (default: `recent`)
- `timeframe` (string, optional): Content timeframe - `today`, `week`, `month`, `all` (default: `all`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "feed": [
      {
        "id": "string",
        "type": "video",
        "title": "string",
        "description": "string",
        "thumbnailUrl": "string",
        "duration": 1800, // for videos
        "fileSize": 2048000, // for documents
        "publishedAt": "2025-09-30T00:00:00.000Z",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "category": "technology",
        "tags": ["javascript", "tutorial"],
        "stats": {
          "views": 3250,
          "likes": 189,
          "comments": 45,
          "shares": 28
        }
      }
    ],
    "pagination": {
      // Pagination object
    },
    "feedMetadata": {
      "generatedAt": "2025-09-30T10:00:00.000Z",
      "sortBy": "recent",
      "timeframe": "all",
      "totalContent": 1250
    }
  }
}
```

---

### 3. Get Explore Feed
**GET** `/api/content/feed/explore`

Get an explore feed featuring diverse content for discovery.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `diversity` (string, optional): Diversity level - `low`, `medium`, `high` (default: `medium`)
- `excludeViewed` (boolean, optional): Exclude previously viewed content (default: false)

#### Headers
- `Authorization` (optional): Bearer token (for excluding viewed content)

#### Response Format
```json
{
  "success": true,
  "data": {
    "feed": [
      // Content objects with diversity scoring
    ],
    "sections": [
      {
        "title": "Trending in Technology",
        "content": [
          // Content objects
        ]
      },
      {
        "title": "Popular This Week",
        "content": [
          // Content objects
        ]
      },
      {
        "title": "Rising Creators",
        "content": [
          // Content objects
        ]
      }
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 4. Get Timeline Feed
**GET** `/api/content/feed/timeline`

Get a chronological timeline feed of recent content.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `since` (string, optional): ISO timestamp to get content since (default: last 24 hours)
- `contentTypes` (array, optional): Filter by content types

#### Response Format
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "date": "2025-09-30",
        "content": [
          // Content objects grouped by date
        ]
      },
      {
        "date": "2025-09-29",
        "content": [
          // Content objects
        ]
      }
    ],
    "pagination": {
      // Pagination object
    },
    "timelineMetadata": {
      "startDate": "2025-09-29T00:00:00.000Z",
      "endDate": "2025-09-30T23:59:59.999Z",
      "totalDays": 2
    }
  }
}
```

---

## Personalized Content

### 1. Get Recommendations
**GET** `/api/content/feed/recommendations`

Get personalized content recommendations based on user behavior.

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `limit` (number, optional): Number of recommendations (default: 10, max: 50)
- `type` (string, optional): Recommendation type - `similar`, `trending`, `collaborative`, `mixed` (default: `mixed`)
- `excludeViewed` (boolean, optional): Exclude previously viewed content (default: true)
- `includeReason` (boolean, optional): Include recommendation reasoning (default: true)

#### Response Format
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "string",
        "type": "article",
        "title": "string",
        "description": "string",
        "thumbnailUrl": "string",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "relevanceScore": 94.2,
        "recommendationType": "collaborative",
        "reason": "Users with similar interests also viewed",
        "confidence": 0.89,
        "stats": {
          "views": 2150,
          "likes": 128,
          "comments": 34
        }
      }
    ],
    "recommendationMetadata": {
      "algorithm": "hybrid_v2",
      "modelVersion": "2.1.0",
      "generatedAt": "2025-09-30T10:00:00.000Z",
      "userPreferences": {
        "topCategories": ["technology", "education"],
        "contentTypes": ["article", "video"],
        "avgEngagementScore": 78.5
      }
    }
  }
}
```

---

### 2. Update Feed Preferences
**PUT** `/api/content/feed/preferences`

Update user's feed preferences for personalization.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "categories": ["technology", "education", "entertainment"], // preferred categories
  "contentTypes": ["article", "video"], // preferred content types
  "authors": ["author-id-1", "author-id-2"], // followed authors
  "tags": ["javascript", "tutorial", "AI"], // interested tags
  "languages": ["en", "es"], // preferred languages
  "explicitFilter": true, // filter explicit content
  "diversity": "medium", // feed diversity preference
  "notificationSettings": {
    "newContent": true,
    "trending": false,
    "recommendations": true
  }
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "preferences": {
      // Updated preferences object
    },
    "estimatedImpact": {
      "personalizedScore": 92.1,
      "diversityScore": 75.5,
      "refreshRecommended": true
    }
  },
  "message": "Feed preferences updated successfully"
}
```

---

## Content Discovery

### 1. Get Featured Content
**GET** `/api/content/feed/featured`

Get featured/curated content selected by editors.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `category` (string, optional): Filter by category
- `timeframe` (string, optional): Featured timeframe - `today`, `week`, `month` (default: `week`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "featured": [
      {
        "id": "string",
        "type": "video",
        "title": "string",
        "description": "string",
        "thumbnailUrl": "string",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "featuredReason": "Editor's Pick",
        "featuredAt": "2025-09-30T08:00:00.000Z",
        "featuredBy": {
          "id": "editor-id",
          "username": "editor_name"
        },
        "stats": {
          "views": 5250,
          "likes": 324,
          "comments": 78
        }
      }
    ],
    "featuredMetadata": {
      "curatedBy": "Editorial Team",
      "lastUpdated": "2025-09-30T08:00:00.000Z",
      "criteria": "Quality, engagement, and relevance"
    },
    "pagination": {
      // Pagination object
    }
  }
}
```

---

## Trending & Popular

### 1. Get Trending Content
**GET** `/api/content/feed/trending`

Get currently trending content based on engagement velocity.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `timeframe` (string, optional): Trending timeframe - `hour`, `day`, `week` (default: `day`)
- `category` (string, optional): Filter by category
- `contentTypes` (array, optional): Filter by content types

#### Response Format
```json
{
  "success": true,
  "data": {
    "trending": [
      {
        "id": "string",
        "type": "article",
        "title": "string",
        "description": "string",
        "thumbnailUrl": "string",
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "trendingScore": 89.5,
        "trendingRank": 1,
        "engagementVelocity": {
          "viewsPerHour": 250,
          "likesPerHour": 45,
          "commentsPerHour": 12,
          "sharesPerHour": 8
        },
        "growth": {
          "views": "+150%",
          "engagement": "+200%"
        },
        "stats": {
          "views": 8250,
          "likes": 567,
          "comments": 134,
          "shares": 89
        }
      }
    ],
    "trendingMetadata": {
      "timeframe": "day",
      "calculatedAt": "2025-09-30T10:00:00.000Z",
      "algorithm": "engagement_velocity_v3",
      "totalTrending": 45
    },
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 2. Get Popular Content
**GET** `/api/content/feed/popular`

Get popular content based on overall engagement metrics.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `timeframe` (string, optional): Time period - `today`, `week`, `month`, `year`, `all` (default: `week`)
- `category` (string, optional): Filter by category
- `metric` (string, optional): Primary metric - `views`, `likes`, `comments`, `engagement` (default: `engagement`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "popular": [
      {
        "id": "string",
        "type": "video",
        "title": "string",
        "description": "string",
        "thumbnailUrl": "string",
        "duration": 1200,
        "author": {
          "id": "string",
          "username": "string",
          "profile": {
            "displayName": "string",
            "avatarUrl": "string"
          }
        },
        "popularityScore": 94.8,
        "popularityRank": 1,
        "stats": {
          "views": 25000,
          "likes": 1250,
          "comments": 345,
          "shares": 187,
          "engagementRate": 7.2
        },
        "metrics": {
          "viewsGrowth": "+25%",
          "likesGrowth": "+30%",
          "commentsGrowth": "+45%"
        }
      }
    ],
    "popularMetadata": {
      "timeframe": "week",
      "metric": "engagement",
      "calculatedAt": "2025-09-30T10:00:00.000Z",
      "totalPopular": 100
    },
    "pagination": {
      // Pagination object
    }
  }
}
```

---

## Category-based Feeds

### 1. Get Content by Category
**GET** `/api/content/feed/category/:category`

Get content filtered by specific category.

#### Parameters
- **Path Parameters:**
  - `category` (string, required): Category name

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort criteria - `recent`, `popular`, `trending` (default: `recent`)
- `contentTypes` (array, optional): Filter by content types
- `timeframe` (string, optional): Content timeframe

#### Response Format
```json
{
  "success": true,
  "data": {
    "category": {
      "name": "technology",
      "displayName": "Technology",
      "description": "Latest technology news and tutorials",
      "followerCount": 15420,
      "contentCount": 2350
    },
    "content": [
      // Content objects
    ],
    "categoryStats": {
      "totalContent": 2350,
      "recentContent": 45,
      "popularContent": 123,
      "trendingContent": 12
    },
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 2. Get Category List
**GET** `/api/content/categories`

Get list of available content categories.

#### Query Parameters
- `includeStats` (boolean, optional): Include content statistics (default: false)
- `sortBy` (string, optional): Sort by - `name`, `content_count`, `followers` (default: `name`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "technology",
        "displayName": "Technology",
        "description": "Latest technology news and tutorials",
        "contentCount": 2350,
        "followerCount": 15420,
        "isFollowing": true,
        "icon": "string",
        "color": "#3498db"
      },
      {
        "name": "education",
        "displayName": "Education",
        "description": "Educational content and tutorials",
        "contentCount": 1890,
        "followerCount": 12100,
        "isFollowing": false,
        "icon": "string",
        "color": "#2ecc71"
      }
    ],
    "totalCategories": 15
  }
}
```

---

## Feed Customization

### 1. Follow Category
**POST** `/api/content/categories/:category/follow`

Follow a specific category for personalized feeds.

#### Parameters
- **Path Parameters:**
  - `category` (string, required): Category name

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "category": "technology",
    "isFollowing": true,
    "followerCount": 15421
  },
  "message": "Category followed successfully"
}
```

---

### 2. Unfollow Category
**DELETE** `/api/content/categories/:category/follow`

Unfollow a specific category.

#### Parameters
- **Path Parameters:**
  - `category` (string, required): Category name

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "category": "technology",
    "isFollowing": false,
    "followerCount": 15419
  },
  "message": "Category unfollowed successfully"
}
```

---

### 3. Get Feed Analytics
**GET** `/api/content/feed/analytics`

Get analytics for user's feed consumption (user only).

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `period` (string, optional): Time period - `7d`, `30d`, `90d` (default: `30d`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "consumption": {
      "totalViewed": 145,
      "totalLiked": 23,
      "totalCommented": 8,
      "totalShared": 5,
      "averageDaily": 4.8,
      "engagementRate": 24.8
    },
    "preferences": {
      "topCategories": [
        {"category": "technology", "percentage": 45},
        {"category": "education", "percentage": 30}
      ],
      "contentTypes": [
        {"type": "article", "percentage": 60},
        {"type": "video", "percentage": 35}
      ],
      "viewingTimes": {
        "morning": 25,
        "afternoon": 35,
        "evening": 40
      }
    },
    "recommendations": {
      "accuracy": 78.5,
      "clickRate": 12.3,
      "satisfaction": 4.2
    }
  }
}
```

---

## Cache Management

### 1. Clear Feed Cache (Admin)
**POST** `/api/content/feed/clear-cache`

Clear feed cache to refresh content (admin only).

#### Headers
- `Authorization` (required): Bearer token (admin role)

#### Request Body
```json
{
  "cacheTypes": ["personalized", "trending", "popular"], // optional, specific cache types
  "userId": "string", // optional, clear cache for specific user
  "global": false // optional, clear global cache
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "clearedCaches": ["personalized", "trending", "popular"],
    "affectedUsers": 1250,
    "estimatedRefreshTime": "5-10 minutes"
  },
  "message": "Feed cache cleared successfully"
}
```

---

### 2. Refresh Feed
**POST** `/api/content/feed/refresh`

Manually refresh user's personalized feed.

#### Headers
- `Authorization` (required): Bearer token

#### Request Body
```json
{
  "forceRefresh": false, // optional, force complete refresh
  "updatePreferences": true // optional, update based on recent activity
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "refreshed": true,
    "newContentCount": 25,
    "lastRefresh": "2025-09-30T10:00:00.000Z",
    "nextScheduledRefresh": "2025-09-30T12:00:00.000Z"
  },
  "message": "Feed refreshed successfully"
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

### Feed Errors
- `FEED_NOT_AVAILABLE`: 503 - Feed service temporarily unavailable
- `PERSONALIZATION_FAILED`: 500 - Failed to generate personalized feed
- `INVALID_FEED_TYPE`: 400 - Invalid feed type requested
- `FEED_CACHE_ERROR`: 500 - Feed cache error

### Category Errors
- `CATEGORY_NOT_FOUND`: 404 - Category not found
- `CATEGORY_ALREADY_FOLLOWED`: 400 - Category already followed
- `CATEGORY_NOT_FOLLOWED`: 400 - Category not currently followed

### Recommendation Errors
- `INSUFFICIENT_DATA`: 400 - Insufficient user data for recommendations
- `RECOMMENDATION_ENGINE_ERROR`: 500 - Recommendation engine error

---

## JavaScript Examples

### Feed Reader Component
```javascript
class FeedReader {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.feedType = options.feedType || 'personalized';
    this.page = 1;
    this.loading = false;
    this.hasMore = true;
    this.content = [];
  }

  async initialize() {
    this.setupUI();
    await this.loadFeed();
    this.setupInfiniteScroll();
  }

  setupUI() {
    this.container.innerHTML = `
      <div class="feed-header">
        <div class="feed-tabs">
          <button class="tab active" data-feed="personalized">For You</button>
          <button class="tab" data-feed="trending">Trending</button>
          <button class="tab" data-feed="popular">Popular</button>
          <button class="tab" data-feed="explore">Explore</button>
        </div>
        <div class="feed-filters">
          <select id="content-type-filter">
            <option value="">All Content</option>
            <option value="article">Articles</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
          </select>
        </div>
      </div>
      <div id="feed-content" class="feed-content"></div>
      <div id="loading-indicator" class="loading-indicator" style="display: none;">
        Loading...
      </div>
    `;

    // Setup tab switching
    this.container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchFeedType(e.target.dataset.feed);
      });
    });

    // Setup filter
    document.getElementById('content-type-filter').addEventListener('change', (e) => {
      this.contentTypeFilter = e.target.value;
      this.resetFeed();
      this.loadFeed();
    });
  }

  async loadFeed() {
    if (this.loading || !this.hasMore) return;

    this.loading = true;
    this.showLoading();

    try {
      const url = this.buildFeedUrl();
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.appendContent(data.data.feed || data.data.trending || data.data.popular);
        this.hasMore = data.data.pagination.hasNext;
        this.page++;
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
      this.showError('Failed to load feed');
    } finally {
      this.loading = false;
      this.hideLoading();
    }
  }

  buildFeedUrl() {
    const baseUrls = {
      personalized: '/api/content/feed/personalized',
      trending: '/api/content/feed/trending',
      popular: '/api/content/feed/popular',
      explore: '/api/content/feed/explore',
      general: '/api/content/feed/general'
    };

    const params = new URLSearchParams({
      page: this.page,
      limit: 20
    });

    if (this.contentTypeFilter) {
      params.append('contentTypes', JSON.stringify([this.contentTypeFilter]));
    }

    return `${baseUrls[this.feedType]}?${params}`;
  }

  appendContent(newContent) {
    const feedContainer = document.getElementById('feed-content');
    
    newContent.forEach(item => {
      const contentElement = this.createContentElement(item);
      feedContainer.appendChild(contentElement);
    });

    this.content.push(...newContent);
  }

  createContentElement(item) {
    const element = document.createElement('div');
    element.className = 'feed-item';
    element.innerHTML = `
      <div class="content-header">
        <img src="${item.author.profile.avatarUrl}" alt="${item.author.profile.displayName}" class="author-avatar">
        <div class="author-info">
          <span class="author-name">${item.author.profile.displayName}</span>
          <span class="publish-date">${this.formatDate(item.publishedAt)}</span>
        </div>
        ${item.recommendationReason ? `<span class="recommendation-reason">${item.recommendationReason}</span>` : ''}
      </div>
      <div class="content-body">
        <h3 class="content-title">${item.title}</h3>
        <p class="content-description">${item.description}</p>
        ${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${item.title}" class="content-thumbnail">` : ''}
      </div>
      <div class="content-stats">
        <span class="stat">👁 ${this.formatNumber(item.stats.views)}</span>
        <span class="stat">❤️ ${this.formatNumber(item.stats.likes)}</span>
        <span class="stat">💬 ${this.formatNumber(item.stats.comments)}</span>
        <span class="stat">🔗 ${this.formatNumber(item.stats.shares)}</span>
      </div>
      <div class="content-actions">
        <button class="action-btn like-btn ${item.engagement?.isLiked ? 'active' : ''}" data-id="${item.id}">
          Like
        </button>
        <button class="action-btn comment-btn" data-id="${item.id}">
          Comment
        </button>
        <button class="action-btn share-btn" data-id="${item.id}">
          Share
        </button>
        <button class="action-btn bookmark-btn ${item.engagement?.isBookmarked ? 'active' : ''}" data-id="${item.id}">
          Save
        </button>
      </div>
    `;

    // Add click handler for content
    element.addEventListener('click', (e) => {
      if (!e.target.classList.contains('action-btn')) {
        this.openContent(item);
      }
    });

    return element;
  }

  switchFeedType(feedType) {
    this.feedType = feedType;
    
    // Update active tab
    this.container.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.feed === feedType);
    });

    this.resetFeed();
    this.loadFeed();
  }

  resetFeed() {
    this.page = 1;
    this.hasMore = true;
    this.content = [];
    document.getElementById('feed-content').innerHTML = '';
  }

  setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        this.loadFeed();
      }
    });
  }

  showLoading() {
    document.getElementById('loading-indicator').style.display = 'block';
  }

  hideLoading() {
    document.getElementById('loading-indicator').style.display = 'none';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
    return date.toLocaleDateString();
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  openContent(item) {
    // Navigate to content detail page
    window.location.href = `/content/${item.type}/${item.id}`;
  }

  getToken() {
    return localStorage.getItem('authToken');
  }
}

// Usage
const feedReader = new FeedReader('feed-container', {
  feedType: 'personalized'
});
feedReader.initialize();
```

### Recommendation Engine Integration
```javascript
class RecommendationEngine {
  constructor() {
    this.recommendations = [];
    this.preferences = {};
  }

  async getRecommendations(options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 10,
        type: options.type || 'mixed',
        excludeViewed: options.excludeViewed !== false,
        includeReason: options.includeReason !== false
      });

      const response = await fetch(`/api/content/feed/recommendations?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.recommendations = data.data.recommendations;
        return this.recommendations;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  }

  async updatePreferences(preferences) {
    try {
      const response = await fetch('/api/content/feed/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      const data = await response.json();
      
      if (data.success) {
        this.preferences = data.data.preferences;
        return this.preferences;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  async trackInteraction(contentId, interactionType, details = {}) {
    try {
      const response = await fetch('/api/content/feed/track-interaction', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentId,
          interactionType, // view, like, comment, share, click
          details,
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to track interaction:', error);
      return false;
    }
  }

  getToken() {
    return localStorage.getItem('authToken');
  }
}

// Usage
const recommendationEngine = new RecommendationEngine();

// Get recommendations
recommendationEngine.getRecommendations({
  limit: 5,
  type: 'collaborative'
}).then(recommendations => {
  console.log('Recommendations:', recommendations);
});

// Update preferences
recommendationEngine.updatePreferences({
  categories: ['technology', 'education'],
  contentTypes: ['article', 'video'],
  diversity: 'high'
});

// Track interactions
recommendationEngine.trackInteraction('content-id', 'view', {
  duration: 120,
  scrollDepth: 80
});
```

This documentation provides comprehensive information for frontend developers to integrate with the MediaCMS feed and content discovery system.