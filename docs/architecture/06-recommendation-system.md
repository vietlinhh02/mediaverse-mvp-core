# MediaVerse MVP - Recommendation System

## 1. Giới Thiệu

Hệ thống Recommendation (Gợi ý) sử dụng kết hợp nhiều thuật toán để đề xuất nội dung phù hợp với từng người dùng, tương tự như "For You" feed của TikTok/Facebook.

### Các Phương Pháp Recommendation
- **Content-Based Filtering** - Dựa trên đặc điểm nội dung
- **Collaborative Filtering** - Dựa trên hành vi người dùng tương tự
- **Behavior-Based** - Dựa trên lịch sử tương tác
- **Trending Algorithm** - Nội dung đang thịnh hành
- **Social Graph** - Nội dung từ người dùng theo dõi

## 2. Kiến Trúc Recommendation System

```mermaid
graph TB
    subgraph "Data Collection"
        LIKE[User Likes]
        COMMENT[User Comments]
        VIEW[View History]
        FOLLOW[Following List]
        PROFILE[User Preferences]
    end
    
    subgraph "Interest Profile Builder"
        COLLECT[Collect User Interactions]
        WEIGHT[Apply Interaction Weights]
        AGGREGATE[Aggregate Interests]
        PROFILE_BUILD[Build Interest Profile]
    end
    
    subgraph "Recommendation Engine"
        SMART[Smart Recommendations]
        TRENDING[Trending Content]
        SIMILAR[Similar Content]
        CATEGORY[Category-Based]
        PERSONALIZED[Personalized Feed]
    end
    
    subgraph "Ranking & Filtering"
        SCORE[Calculate Scores]
        FILTER[Apply Filters]
        SORT[Sort by Relevance]
        DIVERSE[Ensure Diversity]
    end
    
    subgraph "Cache Layer"
        REDIS[(Redis Cache)]
    end
    
    subgraph "Output"
        FEED[Personalized Feed]
        API[Recommendation API]
    end
    
    LIKE --> COLLECT
    COMMENT --> COLLECT
    VIEW --> COLLECT
    FOLLOW --> COLLECT
    PROFILE --> COLLECT
    
    COLLECT --> WEIGHT
    WEIGHT --> AGGREGATE
    AGGREGATE --> PROFILE_BUILD
    PROFILE_BUILD --> REDIS
    
    REDIS --> SMART
    REDIS --> TRENDING
    REDIS --> SIMILAR
    REDIS --> CATEGORY
    REDIS --> PERSONALIZED
    
    SMART --> SCORE
    TRENDING --> SCORE
    SIMILAR --> SCORE
    CATEGORY --> SCORE
    PERSONALIZED --> SCORE
    
    SCORE --> FILTER
    FILTER --> SORT
    SORT --> DIVERSE
    
    DIVERSE --> FEED
    FEED --> API
    
    style PROFILE_BUILD fill:#61dafb,stroke:#333,stroke-width:2px
    style REDIS fill:#dc382d,stroke:#333,stroke-width:2px
    style FEED fill:#90EE90,stroke:#333,stroke-width:2px
```

## 3. User Interest Profile

### Building Interest Profile

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Service
    participant Cache
    participant Database
    
    Client->>API: Request Recommendations
    API->>Cache: Check Interest Profile
    
    alt Profile Cached
        Cache-->>API: Return Cached Profile
    else Profile Not Cached
        API->>Service: Build Interest Profile
        Service->>Database: Get User Likes (last 50)
        Database-->>Service: Liked Content
        
        Service->>Database: Get User Comments (last 30)
        Database-->>Service: Commented Content
        
        Service->>Database: Get View History
        Database-->>Service: Viewed Content
        
        Service->>Service: Apply Interaction Weights:<br/>Comment = 5<br/>Like = 3<br/>View = 1
        
        Service->>Service: Aggregate Interests:<br/>- Top 5 Categories<br/>- Top 10 Tags<br/>- Top 10 Authors<br/>- Content Types
        
        Service->>Cache: Cache Profile (1 hour)
        Cache-->>API: Return Profile
    end
    
    API->>Service: Get Recommendations<br/>using Profile
    Service->>Database: Query Matching Content
    Database-->>Service: Content List
    
    Service->>Service: Rank & Score Content
    Service-->>API: Recommendations
    API-->>Client: Personalized Feed
```

### Interest Profile Structure

```javascript
{
  userId: "user-123",
  categories: ["technology", "science", "education", "programming", "ai"],
  tags: ["javascript", "react", "nodejs", "python", "machine-learning", "tutorial", "beginner", "advanced", "web-dev", "backend"],
  contentTypes: ["video", "article", "document"],
  authors: ["author-1", "author-2", "author-3", ...],
  totalInteractions: 85,
  lastUpdated: "2025-10-15T10:30:00Z"
}
```

## 4. Interaction Weight System

```mermaid
graph LR
    subgraph "Interaction Types & Weights"
        A[Comment] -->|Weight: 5| SCORE[Total Score]
        B[Like] -->|Weight: 3| SCORE
        C[View] -->|Weight: 1| SCORE
        D[Share] -->|Weight: 4| SCORE
        E[Save/Bookmark] -->|Weight: 6| SCORE
    end
    
    SCORE --> AGGREGATE[Aggregate by:<br/>- Category<br/>- Tag<br/>- Author<br/>- Content Type]
    
    AGGREGATE --> TOP[Extract Top Interests]
    
    style A fill:#FFD700,stroke:#333,stroke-width:2px
    style E fill:#FFD700,stroke:#333,stroke-width:2px
    style SCORE fill:#61dafb,stroke:#333,stroke-width:2px
```

### Weight Calculation Example

```javascript
const WEIGHTS = {
  like: 3,      // Strong signal - user actively liked
  comment: 5,   // Very strong signal - user engaged deeply
  view: 1,      // Weak signal - passive consumption
  share: 4,     // Strong signal - user found valuable
  bookmark: 6   // Very strong signal - user wants to keep
};

// Example: User interactions with "JavaScript Tutorial" content
// - Viewed: +1
// - Liked: +3
// - Commented: +5
// Total Score for "JavaScript" tag = 9 points
```

## 5. Smart Recommendations Algorithm

```mermaid
flowchart TD
    START[User Requests Feed] --> CHECK_PROFILE{Has Interest<br/>Profile?}
    
    CHECK_PROFILE -->|Yes| BUILD_QUERY[Build Recommendation Query]
    CHECK_PROFILE -->|No - New User| TRENDING[Return Trending Content]
    
    BUILD_QUERY --> CONDITION1[Condition 1:<br/>Authors User Follows<br/>Weight: HIGH]
    BUILD_QUERY --> CONDITION2[Condition 2:<br/>Preferred Categories<br/>Weight: HIGH]
    BUILD_QUERY --> CONDITION3[Condition 3:<br/>Matching Tags<br/>Weight: MEDIUM]
    
    CONDITION1 --> COMBINE[Combine with OR]
    CONDITION2 --> COMBINE
    CONDITION3 --> COMBINE
    
    COMBINE --> QUERY_DB[Query Database]
    QUERY_DB --> RESULTS[Get Content Results]
    
    RESULTS --> EXCLUDE[Exclude Already Viewed]
    EXCLUDE --> SCORE_CALC[Calculate Trending Score]
    SCORE_CALC --> SORT[Sort by:<br/>1. Trending Score<br/>2. Published Date]
    
    SORT --> PAGINATE[Apply Pagination]
    TRENDING --> PAGINATE
    
    PAGINATE --> RETURN[Return Recommendations]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style RETURN fill:#90EE90,stroke:#333,stroke-width:2px
    style TRENDING fill:#FFB6C1,stroke:#333,stroke-width:2px
```

### Smart Recommendation Implementation

```javascript
// src/services/smartRecommendationService.js
class SmartRecommendationService {
  static async getSmartRecommendations(userId, options = {}) {
    const { page = 1, limit = 20, excludeContentIds = [] } = options;
    const skip = (page - 1) * limit;
    
    // Get user's interest profile
    const interestProfile = await this.getUserInterestProfile(userId);
    
    // Build recommendation query
    const conditions = [];
    
    // 1. Content from followed authors (high weight)
    if (interestProfile.authors.length > 0) {
      conditions.push({
        authorId: { in: interestProfile.authors }
      });
    }
    
    // 2. Content in preferred categories (high weight)
    if (interestProfile.categories.length > 0) {
      conditions.push({
        category: { in: interestProfile.categories }
      });
    }
    
    // 3. Content with matching tags (medium weight)
    if (interestProfile.tags.length > 0) {
      conditions.push({
        tags: { hasSome: interestProfile.tags }
      });
    }
    
    // If new user with no interactions, show trending
    if (interestProfile.totalInteractions === 0) {
      return this.getTrendingContent({ page, limit });
    }
    
    // Query database
    const content = await prisma.content.findMany({
      where: {
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        id: { notIn: excludeContentIds },
        OR: conditions
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true }
            }
          }
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      },
      orderBy: [
        { trendingScore: 'desc' },
        { publishedAt: 'desc' }
      ],
      skip,
      take: limit
    });
    
    return content;
  }
}
```

## 6. Trending Algorithm

```mermaid
flowchart TD
    START[Calculate Trending Score] --> TIME[Time Window<br/>Last 24h / 7d / 30d]
    
    TIME --> METRICS[Collect Metrics]
    
    METRICS --> VIEWS[View Count<br/>Weight: 1x]
    METRICS --> LIKES[Like Count<br/>Weight: 3x]
    METRICS --> COMMENTS[Comment Count<br/>Weight: 5x]
    METRICS --> SHARES[Share Count<br/>Weight: 4x]
    
    VIEWS --> WEIGHTED[Weighted Sum]
    LIKES --> WEIGHTED
    COMMENTS --> WEIGHTED
    SHARES --> WEIGHTED
    
    WEIGHTED --> DECAY[Apply Time Decay]
    DECAY --> NORMALIZE[Normalize Score]
    
    NORMALIZE --> SAVE[Save Trending Score]
    SAVE --> UPDATE_DB[Update Content.trendingScore]
    
    UPDATE_DB --> END[Content Ranked by Score]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style END fill:#90EE90,stroke:#333,stroke-width:2px
```

### Trending Score Formula

```javascript
/**
 * Trending Score Calculation
 * 
 * Score = (Views × 1 + Likes × 3 + Comments × 5 + Shares × 4) × TimeDecay
 * 
 * TimeDecay = e^(-λt)
 * where:
 *   λ = decay constant (0.1 for 24h window)
 *   t = hours since published
 */

function calculateTrendingScore(content) {
  const { views, likes, comments, shares, publishedAt } = content;
  
  // Weighted engagement
  const engagementScore = 
    (views * 1) + 
    (likes * 3) + 
    (comments * 5) + 
    (shares * 4);
  
  // Time decay (exponential)
  const hoursOld = (Date.now() - new Date(publishedAt)) / (1000 * 60 * 60);
  const decayConstant = 0.1; // Adjust for faster/slower decay
  const timeDecay = Math.exp(-decayConstant * hoursOld);
  
  // Final score
  const trendingScore = engagementScore * timeDecay;
  
  return Math.round(trendingScore * 100) / 100; // Round to 2 decimals
}
```

### Time Decay Visualization

```mermaid
graph LR
    subgraph "Trending Score Over Time"
        T0[Hour 0<br/>Score: 100] --> T6[Hour 6<br/>Score: 55]
        T6 --> T12[Hour 12<br/>Score: 30]
        T12 --> T24[Hour 24<br/>Score: 9]
        T24 --> T48[Hour 48<br/>Score: 0.8]
    end
    
    style T0 fill:#90EE90,stroke:#333,stroke-width:2px
    style T6 fill:#FFD700,stroke:#333,stroke-width:2px
    style T12 fill:#FFA500,stroke:#333,stroke-width:2px
    style T24 fill:#FF6347,stroke:#333,stroke-width:2px
    style T48 fill:#FFB6C1,stroke:#333,stroke-width:2px
```

## 7. Personalized Feed Generation

```mermaid
sequenceDiagram
    participant User
    participant API
    participant RecService
    participant Cache
    participant Database
    
    User->>API: GET /recommendations/personalized
    API->>RecService: getPersonalizedFeed(userId, options)
    
    RecService->>Database: Get Following List
    Database-->>RecService: followingIds[]
    
    RecService->>Database: Get User Preferences
    Database-->>RecService: categories[], tags[]
    
    RecService->>RecService: Build Query Conditions:<br/>- Following content<br/>- Preferred categories<br/>- Matching tags
    
    RecService->>Database: Query Content with Filters
    Database-->>RecService: Matching Content
    
    RecService->>RecService: Apply Ranking:<br/>1. Trending Score<br/>2. Published Date
    
    RecService->>RecService: Apply Pagination
    
    RecService-->>API: Personalized Feed
    API-->>User: Content List + Pagination
```

### Feed Composition Strategy

```mermaid
pie title "Personalized Feed Content Mix"
    "Following Authors" : 40
    "Preferred Categories" : 30
    "Trending in Network" : 15
    "Discover New" : 10
    "Sponsored/Promoted" : 5
```

## 8. Similar Content Recommendations

```mermaid
flowchart TD
    START[User Views Content] --> GET_CONTENT[Get Content Details]
    GET_CONTENT --> EXTRACT[Extract Features:<br/>- Category<br/>- Tags<br/>- Author<br/>- Content Type]
    
    EXTRACT --> BUILD_QUERY[Build Similarity Query]
    
    BUILD_QUERY --> MATCH_CAT[Match Category<br/>Weight: HIGH]
    BUILD_QUERY --> MATCH_TAGS[Match Tags<br/>Weight: MEDIUM]
    BUILD_QUERY --> MATCH_AUTHOR[Same Author<br/>Weight: LOW]
    
    MATCH_CAT --> COMBINE[Combine Conditions]
    MATCH_TAGS --> COMBINE
    MATCH_AUTHOR --> COMBINE
    
    COMBINE --> EXCLUDE[Exclude Current Content]
    EXCLUDE --> QUERY[Query Database]
    
    QUERY --> SCORE[Calculate Similarity Score:<br/>- Same category: +10<br/>- Each matching tag: +5<br/>- Same author: +3]
    
    SCORE --> SORT[Sort by Similarity Score]
    SORT --> LIMIT[Take Top 10]
    
    LIMIT --> RETURN[Return Similar Content]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style RETURN fill:#90EE90,stroke:#333,stroke-width:2px
```

### Similar Content Implementation

```javascript
async function getSimilarContent(contentId, userId, options = {}) {
  const { limit = 10 } = options;
  
  // Get original content
  const original = await prisma.content.findUnique({
    where: { id: contentId },
    select: { category: true, tags: true, authorId: true, type: true }
  });
  
  if (!original) return [];
  
  // Find similar content
  const similar = await prisma.content.findMany({
    where: {
      id: { not: contentId },
      status: 'published',
      visibility: 'public',
      OR: [
        { category: original.category },          // Same category
        { tags: { hasSome: original.tags } },     // Overlapping tags
        { authorId: original.authorId }           // Same author
      ]
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } }
        }
      },
      _count: {
        select: { likes: true, comments: true }
      }
    },
    take: limit * 2 // Get more to score and filter
  });
  
  // Calculate similarity score
  const scored = similar.map(content => {
    let score = 0;
    
    // Same category: +10 points
    if (content.category === original.category) score += 10;
    
    // Each matching tag: +5 points
    const matchingTags = content.tags.filter(tag => 
      original.tags.includes(tag)
    );
    score += matchingTags.length * 5;
    
    // Same author: +3 points
    if (content.authorId === original.authorId) score += 3;
    
    return { ...content, similarityScore: score };
  });
  
  // Sort by score and return top results
  return scored
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}
```

## 9. Category-Based Recommendations

```mermaid
graph TB
    subgraph "Content Categories"
        CAT1[Technology]
        CAT2[Science]
        CAT3[Education]
        CAT4[Entertainment]
        CAT5[Business]
        CAT6[Health]
    end
    
    subgraph "Category Filtering"
        FILTER[Apply Category Filter]
        PUBLISHED[Status: Published]
        PUBLIC[Visibility: Public]
    end
    
    subgraph "Sorting Strategy"
        SORT1[Sort by Published Date]
        SORT2[Sort by Trending Score]
        SORT3[Sort by View Count]
    end
    
    CAT1 --> FILTER
    CAT2 --> FILTER
    CAT3 --> FILTER
    CAT4 --> FILTER
    CAT5 --> FILTER
    CAT6 --> FILTER
    
    FILTER --> PUBLISHED
    PUBLISHED --> PUBLIC
    
    PUBLIC --> SORT1
    PUBLIC --> SORT2
    PUBLIC --> SORT3
    
    SORT1 --> PAGINATE[Apply Pagination]
    SORT2 --> PAGINATE
    SORT3 --> PAGINATE
    
    PAGINATE --> RESULT[Category Content List]
    
    style FILTER fill:#61dafb,stroke:#333,stroke-width:2px
    style RESULT fill:#90EE90,stroke:#333,stroke-width:2px
```

## 10. Search-Based Recommendations

```mermaid
sequenceDiagram
    participant User
    participant API
    participant RecService
    participant MeiliSearch
    participant Database
    
    User->>API: Search Query: "react hooks tutorial"
    API->>RecService: searchContent(query, options)
    
    RecService->>MeiliSearch: Search Index<br/>with query
    MeiliSearch-->>RecService: Matching Content IDs<br/>+ Relevance Scores
    
    RecService->>Database: Get Full Content Details
    Database-->>RecService: Content with Authors
    
    RecService->>RecService: Apply Filters:<br/>- Content Type<br/>- Category<br/>- Date Range
    
    RecService->>RecService: Sort by:<br/>1. Relevance Score<br/>2. Trending Score
    
    RecService-->>API: Search Results
    API-->>User: Ranked Content List
    
    Note over User,API: User clicks on result
    User->>API: Track Search Click
    API->>Database: Update User Interests<br/>(tags from clicked content)
```

### MeiliSearch Integration

```javascript
// src/services/searchService.js
async function search(indexName, query, options = {}) {
  const {
    limit = 20,
    offset = 0,
    filters = '',
    sortBy = 'relevance'
  } = options;
  
  const searchParams = {
    q: query,
    limit,
    offset,
    filter: filters,
    attributesToHighlight: ['title', 'description'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>'
  };
  
  // Add sorting
  if (sortBy !== 'relevance') {
    searchParams.sort = [mapSortByToMeiliSearch(sortBy)];
  }
  
  const index = meiliClient.index(indexName);
  const results = await index.search(query, searchParams);
  
  return {
    hits: results.hits,
    nbHits: results.estimatedTotalHits,
    processingTimeMs: results.processingTimeMs,
    query: results.query
  };
}
```

## 11. Diversity & Freshness

```mermaid
flowchart TD
    START[Initial Recommendations] --> CHECK_DIVERSITY{Check Diversity}
    
    CHECK_DIVERSITY --> COUNT_AUTHORS[Count Authors]
    COUNT_AUTHORS --> AUTHOR_LIMIT{Max 2 items<br/>per author?}
    
    AUTHOR_LIMIT -->|No| REDUCE_AUTHOR[Reduce Author Frequency]
    AUTHOR_LIMIT -->|Yes| CHECK_CATEGORY
    
    REDUCE_AUTHOR --> CHECK_CATEGORY[Check Category Distribution]
    
    CHECK_CATEGORY --> CAT_BALANCE{Categories<br/>Balanced?}
    CAT_BALANCE -->|No| BALANCE_CAT[Balance Categories]
    CAT_BALANCE -->|Yes| CHECK_FRESHNESS
    
    BALANCE_CAT --> CHECK_FRESHNESS[Check Content Freshness]
    
    CHECK_FRESHNESS --> OLD_CONTENT{Too much<br/>old content?}
    OLD_CONTENT -->|Yes| ADD_FRESH[Inject Fresh Content<br/>from last 24h]
    OLD_CONTENT -->|No| CHECK_TYPE
    
    ADD_FRESH --> CHECK_TYPE[Check Content Types]
    
    CHECK_TYPE --> TYPE_MIX{Mix of Video/<br/>Article/Document?}
    TYPE_MIX -->|No| BALANCE_TYPE[Balance Content Types]
    TYPE_MIX -->|Yes| FINAL
    
    BALANCE_TYPE --> FINAL[Final Diverse Feed]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style FINAL fill:#90EE90,stroke:#333,stroke-width:2px
```

### Diversity Rules

| Rule | Constraint | Purpose |
|------|-----------|---------|
| **Author Diversity** | Max 2 items per author in top 20 | Prevent author monopoly |
| **Category Balance** | Each category < 40% of feed | Ensure variety |
| **Freshness** | At least 30% from last 24h | Show recent content |
| **Type Mix** | Video, Article, Document balanced | Cater to different consumption modes |
| **No Duplicates** | Exclude already viewed | Better user experience |

## 12. Caching Strategy

```mermaid
graph TB
    subgraph "Cache Layers"
        L1[L1: Interest Profile Cache<br/>TTL: 1 hour]
        L2[L2: Trending Content Cache<br/>TTL: 15 minutes]
        L3[L3: Category Content Cache<br/>TTL: 30 minutes]
        L4[L4: Similar Content Cache<br/>TTL: 1 hour]
    end
    
    subgraph "Cache Invalidation"
        INV1[User Interaction] --> CLEAR1[Clear Profile Cache]
        INV2[New Content Published] --> CLEAR2[Clear Category Cache]
        INV3[Trending Score Update] --> CLEAR3[Clear Trending Cache]
    end
    
    REQUEST[Recommendation Request] --> L1
    L1 -->|Hit| RETURN[Return Cached]
    L1 -->|Miss| COMPUTE[Compute Fresh]
    COMPUTE --> STORE[Store in Cache]
    STORE --> RETURN
    
    style L1 fill:#dc382d,stroke:#333,stroke-width:2px
    style RETURN fill:#90EE90,stroke:#333,stroke-width:2px
```

### Cache Key Structure

```javascript
// Interest Profile
const profileKey = `user:${userId}:interest-profile`;

// Trending Content
const trendingKey = `trending:${timeframe}:${contentTypes}`;

// Category Content
const categoryKey = `category:${category}:page:${page}`;

// Similar Content
const similarKey = `similar:${contentId}:limit:${limit}`;

// Personalized Feed
const feedKey = `feed:${userId}:page:${page}`;
```

## 13. API Endpoints

### Get Personalized Feed
```http
GET /api/recommendations/personalized
Headers: Authorization: Bearer <token>
Query Parameters:
  - limit: number (default: 20)
  - offset: number (default: 0)
  - contentTypes: string (default: "video,article,document")
  - includeFollowing: boolean (default: true)
```

### Get Trending Content
```http
GET /api/recommendations/trending
Query Parameters:
  - limit: number (default: 20)
  - timeframe: string (default: "24h", options: "24h", "7d", "30d")
  - contentTypes: string
  - categories: string
```

### Get Similar Content
```http
GET /api/recommendations/similar/:contentId
Headers: Authorization: Bearer <token>
Query Parameters:
  - limit: number (default: 10)
```

### Get Category Content
```http
GET /api/recommendations/category/:category
Query Parameters:
  - limit: number (default: 20)
  - offset: number (default: 0)
  - sortBy: string (default: "recent", options: "recent", "trending", "popular")
```

### Search Content
```http
GET /api/recommendations/search
Query Parameters:
  - q: string (required)
  - limit: number (default: 20)
  - offset: number (default: 0)
  - filters: string (MeiliSearch filter syntax)
  - sortBy: string (default: "relevance")
```

## 14. Performance Metrics

```mermaid
graph TB
    subgraph "Key Metrics"
        M1[Click-Through Rate<br/>CTR]
        M2[Average Session Duration]
        M3[Content Discovery Rate]
        M4[User Engagement]
    end
    
    subgraph "Goals"
        G1[CTR > 15%]
        G2[Session > 10 min]
        G3[Discovery > 30%]
        G4[Engagement > 50%]
    end
    
    M1 --> G1
    M2 --> G2
    M3 --> G3
    M4 --> G4
    
    style G1 fill:#90EE90,stroke:#333,stroke-width:2px
    style G2 fill:#90EE90,stroke:#333,stroke-width:2px
    style G3 fill:#90EE90,stroke:#333,stroke-width:2px
    style G4 fill:#90EE90,stroke:#333,stroke-width:2px
```

## 15. Tài Liệu Liên Quan

- [00 - System Overview](./00-overview.md)
- [03 - Content Management Workflow](./03-content-workflow.md)
- [04 - Social Interaction Workflow](./04-interaction-workflow.md)
- [07 - Analytics System](./07-analytics-system.md)
- [10 - Database Schema](./10-database-schema.md)
