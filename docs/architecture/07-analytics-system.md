# MediaVerse MVP - Analytics System

## 1. Giới Thiệu

Hệ thống Analytics thu thập, xử lý và phân tích dữ liệu về hành vi người dùng và hiệu suất nội dung để cung cấp insights có giá trị.

### Tính Năng Chính
- **Real-time Analytics** - Phân tích theo thời gian thực
- **Content Analytics** - Metrics của từng nội dung
- **User Analytics** - Hành vi và engagement của người dùng
- **Daily Summaries** - Tổng hợp hàng ngày
- **Demographic Analysis** - Phân tích đối tượng người dùng
- **Traffic Source Tracking** - Theo dõi nguồn traffic
- **Engagement Metrics** - Đo lường tương tác

## 2. Analytics Architecture

```mermaid
graph TB
    subgraph "Data Collection Layer"
        CLIENT[Client Events]
        API[API Events]
        WORKER[Background Jobs]
    end
    
    subgraph "Event Tracking"
        VIEW[View Events]
        LIKE[Like Events]
        COMMENT[Comment Events]
        SHARE[Share Events]
        PLAY[Video Play Events]
    end
    
    subgraph "Processing Layer"
        REALTIME[Real-time Processor]
        BATCH[Batch Processor]
        AGGREGATOR[Data Aggregator]
    end
    
    subgraph "Storage Layer"
        REDIS[(Redis<br/>Real-time Data)]
        POSTGRES[(PostgreSQL<br/>Historical Data)]
    end
    
    subgraph "Analytics Services"
        METRICS[Metrics Service]
        BEHAVIOR[Behavior Service]
        REALTIME_SVC[Real-time Service]
    end
    
    subgraph "Output Layer"
        DASHBOARD[Creator Dashboard]
        REPORTS[Analytics Reports]
        API_OUT[Analytics API]
    end
    
    CLIENT --> VIEW
    CLIENT --> LIKE
    CLIENT --> COMMENT
    CLIENT --> SHARE
    CLIENT --> PLAY
    
    VIEW --> REALTIME
    LIKE --> REALTIME
    COMMENT --> REALTIME
    SHARE --> REALTIME
    PLAY --> REALTIME
    
    REALTIME --> REDIS
    REALTIME --> BATCH
    
    BATCH --> AGGREGATOR
    AGGREGATOR --> POSTGRES
    
    REDIS --> REALTIME_SVC
    POSTGRES --> METRICS
    POSTGRES --> BEHAVIOR
    
    REALTIME_SVC --> API_OUT
    METRICS --> API_OUT
    BEHAVIOR --> API_OUT
    
    API_OUT --> DASHBOARD
    API_OUT --> REPORTS
    
    style REALTIME fill:#61dafb,stroke:#333,stroke-width:2px
    style REDIS fill:#dc382d,stroke:#333,stroke-width:2px
    style POSTGRES fill:#336791,stroke:#333,stroke-width:2px
```

## 3. Event Tracking System

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant RealtimeService
    participant Redis
    participant BatchProcessor
    participant Database
    
    User->>Client: Views Content
    Client->>API: POST /analytics/track<br/>{event: "view", contentId}
    
    API->>RealtimeService: Track View Event
    
    par Real-time Update
        RealtimeService->>Redis: Increment view counter<br/>views:contentId:today
        RealtimeService->>Redis: Add to sorted set<br/>trending:today
        Redis-->>RealtimeService: Updated counters
    and Database Log
        RealtimeService->>Database: Create ContentView record
        Database-->>RealtimeService: Record created
    end
    
    RealtimeService-->>API: Tracking success
    API-->>Client: 200 OK
    
    Note over BatchProcessor: Runs every hour
    
    BatchProcessor->>Redis: Get hourly stats
    Redis-->>BatchProcessor: Aggregated data
    
    BatchProcessor->>Database: Update hourly aggregates
    
    Note over BatchProcessor: Runs daily at midnight
    
    BatchProcessor->>Database: Query daily data
    Database-->>BatchProcessor: Raw events
    
    BatchProcessor->>BatchProcessor: Calculate metrics:<br/>- Total views<br/>- Unique viewers<br/>- Avg duration<br/>- Engagement rate
    
    BatchProcessor->>Database: Create AnalyticsSummaryDaily
    Database-->>BatchProcessor: Summary saved
```

## 4. Content Analytics

```mermaid
graph TB
    subgraph "Content Metrics"
        VIEWS[View Count]
        UNIQUE[Unique Viewers]
        DURATION[Avg Watch Duration]
        COMPLETION[Completion Rate]
        
        LIKES[Like Count]
        COMMENTS[Comment Count]
        SHARES[Share Count]
        
        ENGAGEMENT[Engagement Rate]
        RETENTION[Retention Rate]
    end
    
    subgraph "Calculated Metrics"
        VIEWS --> ENGAGEMENT_CALC[Engagement Rate =<br/>Engagements / Views × 100]
        LIKES --> ENGAGEMENT_CALC
        COMMENTS --> ENGAGEMENT_CALC
        SHARES --> ENGAGEMENT_CALC
        
        DURATION --> RETENTION_CALC[Retention Rate =<br/>Avg Duration / Total Duration × 100]
        
        VIEWS --> TRENDING[Trending Score =<br/>Weighted Engagement × Time Decay]
        LIKES --> TRENDING
        COMMENTS --> TRENDING
        SHARES --> TRENDING
    end
    
    subgraph "Insights"
        ENGAGEMENT_CALC --> PERFORMANCE[Content Performance]
        RETENTION_CALC --> QUALITY[Content Quality]
        TRENDING --> DISCOVERY[Content Discovery]
    end
    
    style ENGAGEMENT_CALC fill:#61dafb,stroke:#333,stroke-width:2px
    style RETENTION_CALC fill:#61dafb,stroke:#333,stroke-width:2px
    style TRENDING fill:#61dafb,stroke:#333,stroke-width:2px
```

### Metrics Calculation Service

```javascript
// src/modules/analytics/services/metricsService.js

/**
 * Calculate engagement rate for content
 * Engagement Rate = (Total Engagements / Total Views) × 100
 */
exports.calculateEngagementRate = (likes = 0, comments = 0, shares = 0, views = 0) => {
  if (views === 0) return 0;
  
  const totalEngagements = likes + comments + shares;
  const rate = (totalEngagements / views) * 100;
  
  return parseFloat(rate.toFixed(2));
};

/**
 * Calculate retention rate
 * Retention Rate = (Average Watch Duration / Total Duration) × 100
 */
exports.calculateRetentionRate = (avgDuration = 0, totalDuration = 0) => {
  if (totalDuration === 0) return 0;
  
  const rate = (avgDuration / totalDuration) * 100;
  
  return parseFloat(rate.toFixed(2));
};

/**
 * Calculate growth metrics between periods
 */
exports.calculateGrowthMetrics = (previousValue = 0, currentValue = 0) => {
  if (previousValue === 0) {
    return currentValue > 0 ? 100.0 : 0.0;
  }
  
  const growth = ((currentValue - previousValue) / previousValue) * 100;
  
  return parseFloat(growth.toFixed(2));
};
```

## 5. Real-time Analytics

```mermaid
flowchart TD
    START[Event Occurs] --> IDENTIFY{Event Type}
    
    IDENTIFY -->|View| VIEW_EVENT[View Event]
    IDENTIFY -->|Like| LIKE_EVENT[Like Event]
    IDENTIFY -->|Comment| COMMENT_EVENT[Comment Event]
    IDENTIFY -->|Share| SHARE_EVENT[Share Event]
    
    VIEW_EVENT --> REDIS_VIEW[Redis Increment:<br/>views:contentId:today<br/>views:contentId:hour]
    LIKE_EVENT --> REDIS_LIKE[Redis Increment:<br/>likes:contentId:today]
    COMMENT_EVENT --> REDIS_COMMENT[Redis Increment:<br/>comments:contentId:today]
    SHARE_EVENT --> REDIS_SHARE[Redis Increment:<br/>shares:contentId:today]
    
    REDIS_VIEW --> UPDATE_TRENDING[Update Trending Score]
    REDIS_LIKE --> UPDATE_TRENDING
    REDIS_COMMENT --> UPDATE_TRENDING
    REDIS_SHARE --> UPDATE_TRENDING
    
    UPDATE_TRENDING --> SORTED_SET[Add to Sorted Set:<br/>trending:today<br/>score = engagementScore]
    
    SORTED_SET --> BROADCAST[Broadcast via WebSocket<br/>to Dashboard]
    
    BROADCAST --> PERSIST[Persist to Database<br/> Async]
    
    PERSIST --> END[Complete]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style REDIS_VIEW fill:#dc382d,stroke:#333,stroke-width:2px
    style REDIS_LIKE fill:#dc382d,stroke:#333,stroke-width:2px
    style REDIS_COMMENT fill:#dc382d,stroke:#333,stroke-width:2px
    style REDIS_SHARE fill:#dc382d,stroke:#333,stroke-width:2px
    style END fill:#90EE90,stroke:#333,stroke-width:2px
```

### Redis Key Structure

```javascript
// View tracking
const viewKeyToday = `views:${contentId}:${YYYY-MM-DD}`;
const viewKeyHour = `views:${contentId}:${YYYY-MM-DD}:${HH}`;

// Engagement tracking
const likesKey = `likes:${contentId}:${YYYY-MM-DD}`;
const commentsKey = `comments:${contentId}:${YYYY-MM-DD}`;
const sharesKey = `shares:${contentId}:${YYYY-MM-DD}`;

// Trending sorted set (score = engagement score)
const trendingKey = `trending:${YYYY-MM-DD}`;
// ZADD trending:2025-10-15 1250 contentId-123

// Unique viewers (using HyperLogLog)
const uniqueViewersKey = `unique:viewers:${contentId}:${YYYY-MM-DD}`;
// PFADD unique:viewers:contentId:2025-10-15 userId
```

### Real-time Service Implementation

```javascript
// src/modules/analytics/services/realtimeService.js
const { redisCache } = require('../../../config/redis');
const { startOfDay, format } = require('date-fns');

class RealtimeAnalyticsService {
  /**
   * Track a view event in real-time
   */
  static async trackView(contentId, userId, metadata = {}) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const hour = format(new Date(), 'yyyy-MM-dd:HH');
    
    // Increment view counters
    await Promise.all([
      redisCache.incr(`views:${contentId}:${today}`),
      redisCache.incr(`views:${contentId}:${hour}`),
      redisCache.pfAdd(`unique:viewers:${contentId}:${today}`, userId)
    ]);
    
    // Update trending score
    await this.updateTrendingScore(contentId);
    
    // Persist to database (async)
    await this.persistViewEvent(contentId, userId, metadata);
  }
  
  /**
   * Get real-time stats for content
   */
  static async getRealtimeStats(contentId) {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const [views, likes, comments, shares, uniqueViewers] = await Promise.all([
      redisCache.get(`views:${contentId}:${today}`),
      redisCache.get(`likes:${contentId}:${today}`),
      redisCache.get(`comments:${contentId}:${today}`),
      redisCache.get(`shares:${contentId}:${today}`),
      redisCache.pfCount(`unique:viewers:${contentId}:${today}`)
    ]);
    
    return {
      views: parseInt(views || 0),
      likes: parseInt(likes || 0),
      comments: parseInt(comments || 0),
      shares: parseInt(shares || 0),
      uniqueViewers,
      engagementRate: this.calculateEngagementRate(
        parseInt(likes || 0),
        parseInt(comments || 0),
        parseInt(shares || 0),
        parseInt(views || 0)
      )
    };
  }
  
  /**
   * Update trending score in sorted set
   */
  static async updateTrendingScore(contentId) {
    const stats = await this.getRealtimeStats(contentId);
    
    // Calculate weighted engagement score
    const score = 
      (stats.views * 1) +
      (stats.likes * 3) +
      (stats.comments * 5) +
      (stats.shares * 4);
    
    const today = format(new Date(), 'yyyy-MM-dd');
    await redisCache.zAdd(`trending:${today}`, {
      score,
      value: contentId
    });
  }
}
```

## 6. Daily Summary Aggregation

```mermaid
flowchart TD
    START[Daily Job Trigger<br/>00:00 UTC] --> GET_CONTENT[Get All Active Content]
    
    GET_CONTENT --> LOOP[For Each Content]
    
    LOOP --> QUERY_VIEWS[Query ContentView<br/>records for yesterday]
    
    QUERY_VIEWS --> CALC_METRICS[Calculate Metrics]
    
    CALC_METRICS --> TOTAL_VIEWS[Total Views]
    CALC_METRICS --> UNIQUE_VIEWERS[Unique Viewers<br/>COUNT DISTINCT userId]
    CALC_METRICS --> AVG_DURATION[Average Watch Duration]
    CALC_METRICS --> TRAFFIC_SOURCES[Aggregate Traffic Sources]
    CALC_METRICS --> DEMOGRAPHICS[Aggregate Demographics]
    
    TOTAL_VIEWS --> QUERY_ENGAGEMENT[Query Engagement Data]
    UNIQUE_VIEWERS --> QUERY_ENGAGEMENT
    AVG_DURATION --> QUERY_ENGAGEMENT
    TRAFFIC_SOURCES --> QUERY_ENGAGEMENT
    DEMOGRAPHICS --> QUERY_ENGAGEMENT
    
    QUERY_ENGAGEMENT --> COUNT_LIKES[Count Likes]
    QUERY_ENGAGEMENT --> COUNT_COMMENTS[Count Comments]
    QUERY_ENGAGEMENT --> COUNT_SHARES[Count Shares]
    
    COUNT_LIKES --> CALC_RATES[Calculate Rates]
    COUNT_COMMENTS --> CALC_RATES
    COUNT_SHARES --> CALC_RATES
    
    CALC_RATES --> ENGAGEMENT_RATE[Engagement Rate]
    CALC_RATES --> RETENTION_RATE[Retention Rate]
    CALC_RATES --> GROWTH_RATE[Growth Rate vs Previous Day]
    
    ENGAGEMENT_RATE --> CREATE_SUMMARY[Create AnalyticsSummaryDaily]
    RETENTION_RATE --> CREATE_SUMMARY
    GROWTH_RATE --> CREATE_SUMMARY
    
    CREATE_SUMMARY --> SAVE_DB[Save to Database]
    
    SAVE_DB --> MORE{More Content?}
    MORE -->|Yes| LOOP
    MORE -->|No| CLEANUP[Cleanup Old Redis Keys]
    
    CLEANUP --> NOTIFY[Notify Creators<br/>via Email/Notification]
    
    NOTIFY --> END[Complete]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style END fill:#90EE90,stroke:#333,stroke-width:2px
    style CREATE_SUMMARY fill:#61dafb,stroke:#333,stroke-width:2px
```

### Daily Summary Data Model

```javascript
// AnalyticsSummaryDaily Schema
{
  id: "summary-123",
  contentId: "content-456",
  date: "2025-10-15",
  
  // View metrics
  totalViews: 1500,
  uniqueViewers: 850,
  averageViewDuration: 245.5, // seconds
  
  // Engagement metrics
  totalLikes: 120,
  totalComments: 45,
  totalShares: 30,
  
  // Calculated metrics
  engagementRate: 13.00, // percentage
  retentionRate: 65.50,  // percentage
  
  // Traffic sources
  trafficSources: {
    "direct": 600,
    "search": 400,
    "social": 300,
    "referral": 200
  },
  
  // Demographics
  demographics: {
    "ageGroups": {
      "18-24": 450,
      "25-34": 600,
      "35-44": 300,
      "45+": 150
    },
    "countries": {
      "US": 500,
      "UK": 300,
      "CA": 200,
      "VN": 500
    }
  },
  
  // Growth metrics
  viewsGrowth: 15.5, // percentage vs previous day
  likesGrowth: 8.2,
  
  createdAt: "2025-10-16T00:05:00Z"
}
```

## 7. Traffic Source Analysis

```mermaid
pie title "Traffic Sources Distribution"
    "Direct" : 35
    "Search Engines" : 25
    "Social Media" : 20
    "Referrals" : 15
    "Other" : 5
```

### Traffic Source Tracking

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant Analytics
    participant Database
    
    User->>Client: Click link with UTM params<br/>?utm_source=facebook&utm_medium=social
    
    Client->>Client: Extract UTM parameters
    
    Client->>API: View content<br/>+ trafficSource metadata
    
    API->>Analytics: Track view with source
    
    Analytics->>Database: Create ContentView<br/>with trafficSource: "facebook"
    
    Database-->>Analytics: Saved
    
    Note over Analytics: Daily aggregation
    
    Analytics->>Database: Query ContentView<br/>GROUP BY trafficSource
    
    Database-->>Analytics: Aggregated counts
    
    Analytics->>Database: Update AnalyticsSummaryDaily<br/>trafficSources: {facebook: 150, ...}
```

### UTM Parameter Structure

```javascript
// Client-side tracking
const urlParams = new URLSearchParams(window.location.search);
const trafficSource = {
  source: urlParams.get('utm_source') || 'direct',
  medium: urlParams.get('utm_medium') || null,
  campaign: urlParams.get('utm_campaign') || null,
  term: urlParams.get('utm_term') || null,
  content: urlParams.get('utm_content') || null,
  referrer: document.referrer || null
};

// Send with view event
await trackView(contentId, { trafficSource });
```

## 8. Demographics Analysis

```mermaid
graph TB
    subgraph "User Demographics"
        AGE[Age Groups:<br/>18-24, 25-34, 35-44, 45+]
        GENDER[Gender:<br/>Male, Female, Other]
        LOCATION[Location:<br/>Country, City]
        DEVICE[Device Type:<br/>Mobile, Desktop, Tablet]
    end
    
    subgraph "Data Collection"
        PROFILE[User Profile Data]
        IP[IP Geolocation]
        USER_AGENT[User Agent Parsing]
    end
    
    subgraph "Aggregation"
        DAILY[Daily Aggregates]
        WEEKLY[Weekly Aggregates]
        MONTHLY[Monthly Aggregates]
    end
    
    PROFILE --> AGE
    PROFILE --> GENDER
    IP --> LOCATION
    USER_AGENT --> DEVICE
    
    AGE --> DAILY
    GENDER --> DAILY
    LOCATION --> DAILY
    DEVICE --> DAILY
    
    DAILY --> WEEKLY
    WEEKLY --> MONTHLY
    
    style DAILY fill:#61dafb,stroke:#333,stroke-width:2px
```

### Demographics Data Structure

```javascript
// Demographics in AnalyticsSummaryDaily
demographics: {
  ageGroups: {
    "18-24": 450,
    "25-34": 600,
    "35-44": 300,
    "45+": 150
  },
  
  gender: {
    "male": 800,
    "female": 600,
    "other": 100
  },
  
  countries: {
    "US": 500,
    "UK": 300,
    "CA": 200,
    "VN": 500
  },
  
  cities: {
    "New York": 200,
    "London": 150,
    "Ho Chi Minh": 300,
    "Toronto": 100
  },
  
  devices: {
    "mobile": 900,
    "desktop": 500,
    "tablet": 100
  }
}
```

## 9. Creator Dashboard Analytics

```mermaid
graph TB
    subgraph "Dashboard Overview"
        TOTAL_VIEWS[Total Views]
        TOTAL_LIKES[Total Likes]
        TOTAL_FOLLOWERS[Followers]
        REVENUE[Estimated Revenue]
    end
    
    subgraph "Charts & Graphs"
        VIEWS_CHART[Views Over Time<br/>Line Chart]
        ENGAGEMENT_CHART[Engagement Breakdown<br/>Pie Chart]
        TRAFFIC_CHART[Traffic Sources<br/>Bar Chart]
        DEMO_CHART[Demographics<br/>Stacked Bar]
    end
    
    subgraph "Top Content"
        TOP_VIDEOS[Top 10 Videos]
        TOP_ARTICLES[Top 10 Articles]
        TRENDING[Trending Content]
    end
    
    subgraph "Performance Insights"
        BEST_TIME[Best Time to Post]
        AUDIENCE_RETENTION[Audience Retention]
        GROWTH_TRENDS[Growth Trends]
    end
    
    TOTAL_VIEWS --> VIEWS_CHART
    TOTAL_LIKES --> ENGAGEMENT_CHART
    
    style TOTAL_VIEWS fill:#90EE90,stroke:#333,stroke-width:2px
    style TOTAL_LIKES fill:#90EE90,stroke:#333,stroke-width:2px
    style TOTAL_FOLLOWERS fill:#90EE90,stroke:#333,stroke-width:2px
```

### Dashboard API Endpoints

```http
# Get creator dashboard overview
GET /api/analytics/creator/dashboard
Headers: Authorization: Bearer <token>
Query Parameters:
  - startDate: ISO date (default: 30 days ago)
  - endDate: ISO date (default: today)

Response:
{
  "overview": {
    "totalViews": 15000,
    "totalLikes": 1200,
    "totalComments": 450,
    "totalShares": 300,
    "followers": 5000,
    "viewsGrowth": 15.5,
    "likesGrowth": 8.2
  },
  "topContent": [...],
  "viewsOverTime": [...],
  "trafficSources": {...},
  "demographics": {...}
}
```

```http
# Get content-specific analytics
GET /api/analytics/content/:contentId
Headers: Authorization: Bearer <token>
Query Parameters:
  - period: string (default: "30d", options: "24h", "7d", "30d", "90d", "all")

Response:
{
  "contentId": "content-123",
  "title": "React Hooks Tutorial",
  "metrics": {
    "totalViews": 2500,
    "uniqueViewers": 1800,
    "averageWatchDuration": 245.5,
    "totalLikes": 200,
    "totalComments": 75,
    "totalShares": 50,
    "engagementRate": 13.0,
    "retentionRate": 65.5
  },
  "viewsOverTime": [...],
  "trafficSources": {...},
  "demographics": {...}
}
```

## 10. Behavior Analytics

```mermaid
flowchart TD
    START[User Behavior Data] --> COLLECT[Collect Events]
    
    COLLECT --> SESSION[Session Tracking]
    COLLECT --> INTERACTION[Interaction Tracking]
    COLLECT --> NAVIGATION[Navigation Tracking]
    
    SESSION --> SESSION_DURATION[Session Duration]
    SESSION --> PAGES_PER_SESSION[Pages per Session]
    SESSION --> BOUNCE_RATE[Bounce Rate]
    
    INTERACTION --> CLICKS[Click Tracking]
    INTERACTION --> SCROLLS[Scroll Depth]
    INTERACTION --> HOVERS[Hover Events]
    
    NAVIGATION --> PAGE_FLOW[Page Flow Analysis]
    NAVIGATION --> EXIT_PAGES[Exit Pages]
    NAVIGATION --> CONVERSION[Conversion Funnels]
    
    SESSION_DURATION --> INSIGHTS[Behavior Insights]
    PAGES_PER_SESSION --> INSIGHTS
    BOUNCE_RATE --> INSIGHTS
    CLICKS --> INSIGHTS
    PAGE_FLOW --> INSIGHTS
    
    INSIGHTS --> RECOMMENDATIONS[Improve UX<br/>Recommendations]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style INSIGHTS fill:#61dafb,stroke:#333,stroke-width:2px
    style RECOMMENDATIONS fill:#FFD700,stroke:#333,stroke-width:2px
```

### Key Behavior Metrics

| Metric | Description | Formula |
|--------|-------------|---------|
| **Session Duration** | Average time user spends per session | Total time / Sessions |
| **Pages per Session** | Average pages viewed per session | Total page views / Sessions |
| **Bounce Rate** | % of single-page sessions | Single-page sessions / Total sessions × 100 |
| **Exit Rate** | % of users leaving from a page | Exits from page / Total page views × 100 |
| **Conversion Rate** | % of users completing goal | Conversions / Total visitors × 100 |

## 11. Performance Monitoring

```mermaid
graph TB
    subgraph "System Metrics"
        API_LATENCY[API Response Time]
        DB_QUERY[Database Query Time]
        CACHE_HIT[Cache Hit Rate]
        ERROR_RATE[Error Rate]
    end
    
    subgraph "Thresholds"
        API_LATENCY --> T1{< 200ms?}
        DB_QUERY --> T2{< 50ms?}
        CACHE_HIT --> T3{> 80%?}
        ERROR_RATE --> T4{< 1%?}
    end
    
    subgraph "Alerts"
        T1 -->|No| ALERT1[Alert: Slow API]
        T2 -->|No| ALERT2[Alert: Slow Queries]
        T3 -->|No| ALERT3[Alert: Low Cache Hit]
        T4 -->|No| ALERT4[Alert: High Errors]
    end
    
    T1 -->|Yes| HEALTHY[System Healthy]
    T2 -->|Yes| HEALTHY
    T3 -->|Yes| HEALTHY
    T4 -->|Yes| HEALTHY
    
    style HEALTHY fill:#90EE90,stroke:#333,stroke-width:2px
    style ALERT1 fill:#FFB6C1,stroke:#333,stroke-width:2px
    style ALERT2 fill:#FFB6C1,stroke:#333,stroke-width:2px
    style ALERT3 fill:#FFB6C1,stroke:#333,stroke-width:2px
    style ALERT4 fill:#FFB6C1,stroke:#333,stroke-width:2px
```

## 12. Export & Reporting

```mermaid
sequenceDiagram
    participant Creator
    participant API
    participant Analytics
    participant Export
    participant Email
    
    Creator->>API: Request Analytics Export<br/>Format: CSV/JSON/PDF
    API->>Analytics: Get data for date range
    
    Analytics->>Database: Query analytics data
    Database-->>Analytics: Raw data
    
    Analytics->>Analytics: Process & format data
    Analytics-->>API: Formatted data
    
    API->>Export: Generate export file
    Export->>Export: Create CSV/JSON/PDF
    Export-->>API: File URL
    
    API->>Email: Send download link
    Email-->>Creator: Email with link
    
    Creator->>API: Download export file
    API-->>Creator: File download
```

## 13. Tài Liệu Liên Quan

- [00 - System Overview](./00-overview.md)
- [03 - Content Management Workflow](./03-content-workflow.md)
- [04 - Social Interaction Workflow](./04-interaction-workflow.md)
- [06 - Recommendation System](./06-recommendation-system.md)
- [10 - Database Schema](./10-database-schema.md)
