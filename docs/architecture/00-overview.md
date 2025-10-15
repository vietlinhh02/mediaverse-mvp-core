# MediaVerse MVP - Tổng Quan Kiến Trúc Hệ Thống

## 1. Giới Thiệu

MediaVerse MVP là một nền tảng chia sẻ nội dung đa phương tiện toàn diện, kết hợp các tính năng:
- **Video Sharing** - Chia sẻ và xem video
- **Article Publishing** - Viết và đọc bài viết
- **Document Sharing** - Chia sẻ tài liệu
- **Social Interactions** - Tương tác xã hội
- **Learning Features** - Tính năng học tập

## 2. Kiến Trúc Tổng Quan

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        API_CONSUMER[3rd Party Apps]
    end

    subgraph "API Gateway & Load Balancer"
        NGINX[Nginx/Load Balancer]
        RATE_LIMIT[Rate Limiting]
        SECURITY[Security Layer]
    end

    subgraph "Application Layer"
        EXPRESS[Express.js Server]
        
        subgraph "Core Modules"
            AUTH[Authentication & Authorization]
            USER_MGT[User Management]
            CONTENT[Content Management]
            INTERACTION[Social Interactions]
            RECOMMENDATION[Recommendation Engine]
            ANALYTICS[Analytics & Reporting]
            MODERATION[Moderation System]
            NOTIFICATION[Notification System]
            UPLOAD[Upload & Storage]
        end
    end

    subgraph "Background Jobs Layer"
        REDIS_QUEUE[Redis Queue Manager]
        
        subgraph "Job Workers"
            VIDEO_WORKER[Video Processing Worker]
            THUMBNAIL_WORKER[Thumbnail Generator]
            STREAM_WORKER[Adaptive Streaming]
            AUDIO_WORKER[Audio Processing]
        end
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL Database)]
        REDIS[(Redis Cache & Queue)]
        MEILISEARCH[(MeiliSearch)]
        MINIO[(MinIO S3 Storage)]
    end

    subgraph "External Services"
        OAUTH[OAuth Providers<br/>Google, Facebook, GitHub]
        EMAIL[SendGrid Email Service]
        WEBPUSH[Web Push Service]
    end

    WEB --> NGINX
    MOBILE --> NGINX
    API_CONSUMER --> NGINX
    
    NGINX --> RATE_LIMIT
    RATE_LIMIT --> SECURITY
    SECURITY --> EXPRESS
    
    EXPRESS --> AUTH
    EXPRESS --> USER_MGT
    EXPRESS --> CONTENT
    EXPRESS --> INTERACTION
    EXPRESS --> RECOMMENDATION
    EXPRESS --> ANALYTICS
    EXPRESS --> MODERATION
    EXPRESS --> NOTIFICATION
    EXPRESS --> UPLOAD
    
    AUTH --> OAUTH
    NOTIFICATION --> EMAIL
    NOTIFICATION --> WEBPUSH
    
    UPLOAD --> REDIS_QUEUE
    REDIS_QUEUE --> VIDEO_WORKER
    REDIS_QUEUE --> THUMBNAIL_WORKER
    REDIS_QUEUE --> STREAM_WORKER
    REDIS_QUEUE --> AUDIO_WORKER
    
    AUTH --> POSTGRES
    USER_MGT --> POSTGRES
    CONTENT --> POSTGRES
    INTERACTION --> POSTGRES
    RECOMMENDATION --> POSTGRES
    ANALYTICS --> POSTGRES
    MODERATION --> POSTGRES
    NOTIFICATION --> POSTGRES
    
    AUTH --> REDIS
    CONTENT --> REDIS
    RECOMMENDATION --> REDIS
    
    CONTENT --> MEILISEARCH
    USER_MGT --> MEILISEARCH
    
    UPLOAD --> MINIO
    VIDEO_WORKER --> MINIO
    THUMBNAIL_WORKER --> MINIO
    STREAM_WORKER --> MINIO
    AUDIO_WORKER --> MINIO

    style EXPRESS fill:#61dafb,stroke:#333,stroke-width:3px
    style POSTGRES fill:#336791,stroke:#333,stroke-width:2px
    style REDIS fill:#dc382d,stroke:#333,stroke-width:2px
    style MINIO fill:#c72e49,stroke:#333,stroke-width:2px
```

## 3. Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: JavaScript (ES6+)
- **ORM**: Prisma

### Database & Storage
- **Primary Database**: PostgreSQL
- **Cache & Queue**: Redis (IORedis)
- **Search Engine**: MeiliSearch
- **Object Storage**: MinIO (S3-compatible)

### Authentication & Security
- **JWT**: jsonwebtoken
- **OAuth**: Passport.js (Google, Facebook, GitHub)
- **Password Hashing**: bcrypt
- **Security Headers**: helmet
- **Rate Limiting**: express-rate-limit

### Background Processing
- **Queue Management**: Bull (Redis-based)
- **Video Processing**: FFmpeg (fluent-ffmpeg)
- **Image Processing**: Sharp

### Real-time Communication
- **WebSocket**: Socket.io

### API Documentation
- **Swagger**: swagger-jsdoc, swagger-ui-express

## 4. Core Modules

### 4.1 Authentication Module
- Local authentication (email/password)
- OAuth 2.0 (Google, Facebook, GitHub)
- JWT token-based authentication
- OTP verification
- Password reset functionality

### 4.2 User Management Module
- User profiles & preferences
- Follow/Unfollow system
- Connected accounts (OAuth)
- User verification
- Privacy settings

### 4.3 Content Management Module
- **Video**: Upload, processing, adaptive streaming (HLS)
- **Article**: Rich text editor, publishing workflow
- **Document**: PDF, Word, etc.
- **Image**: Upload and optimization
- Content categorization & tagging
- Draft/Published/Archived status

### 4.4 Social Interaction Module
- Like/Unlike content
- Comment & reply system
- Share functionality
- Playlist creation & management
- Content bookmarking

### 4.5 Recommendation Module
- Content-based filtering
- Collaborative filtering
- Trending algorithm
- Personalized feed

### 4.6 Analytics Module
- View tracking
- Engagement metrics
- Daily summaries
- Real-time analytics
- User demographics

### 4.7 Moderation Module
- Content reporting system
- User moderation (ban, warn, unban)
- Review workflow
- Audit logs

### 4.8 Notification Module
- Real-time notifications (WebSocket)
- Email notifications
- Web push notifications
- Notification preferences
- Multi-channel delivery

### 4.9 Upload & Storage Module
- Chunked upload for large files
- Resume capability
- S3-compatible storage (MinIO)
- CDN integration ready

## 5. Data Models

### Core Entities
1. **User** - User accounts
2. **Profile** - User profiles
3. **Content** - Videos, Articles, Documents, Images
4. **Like** - Content & comment likes
5. **Comment** - Comments & replies
6. **Follow** - User relationships
7. **Playlist** - Content collections
8. **Notification** - User notifications
9. **Report** - Content & user reports
10. **Job** - Background processing jobs
11. **ContentView** - Analytics tracking
12. **AnalyticsSummaryDaily** - Aggregated analytics

## 6. API Endpoints Structure

```
/api
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /refresh
│   ├── POST /forgot-password
│   ├── POST /reset-password
│   ├── GET /oauth/google
│   ├── GET /oauth/facebook
│   └── GET /oauth/github
│
├── /users
│   ├── GET /profile
│   ├── PUT /profile
│   ├── GET /:userId
│   ├── POST /:userId/follow
│   ├── DELETE /:userId/unfollow
│   └── GET /:userId/followers
│
├── /content
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PUT /:id
│   ├── DELETE /:id
│   ├── POST /:id/like
│   ├── POST /:id/comment
│   ├── POST /:id/share
│   └── GET /:id/analytics
│
├── /recommendations
│   ├── GET /trending
│   ├── GET /personalized
│   └── GET /related/:contentId
│
├── /notifications
│   ├── GET /
│   ├── PUT /:id/read
│   ├── PUT /mark-all-read
│   └── GET /preferences
│
├── /moderation
│   ├── POST /reports
│   ├── GET /reports
│   ├── PUT /reports/:id
│   ├── POST /ban
│   └── POST /warn
│
├── /analytics
│   ├── GET /content/:id
│   ├── GET /user/dashboard
│   └── GET /realtime
│
├── /playlists
│   ├── GET /
│   ├── POST /
│   ├── PUT /:id
│   ├── DELETE /:id
│   └── POST /:id/items
│
├── /uploads
│   ├── POST /initiate
│   ├── POST /chunk
│   └── POST /complete
│
└── /storage
    └── GET /proxy/*
```

## 7. Background Job Processing

```mermaid
graph LR
    A[Client Upload] --> B[Initiate Upload Job]
    B --> C[Redis Queue]
    C --> D{Job Type}
    
    D -->|Video| E[Video Processing Worker]
    D -->|Thumbnail| F[Thumbnail Generator]
    D -->|Streaming| G[Adaptive Streaming]
    D -->|Audio| H[Audio Processing]
    
    E --> I[FFmpeg Processing]
    F --> J[Sharp Processing]
    G --> K[HLS Generation]
    H --> L[Audio Extraction]
    
    I --> M[Save to MinIO]
    J --> M
    K --> M
    L --> M
    
    M --> N[Update Database]
    N --> O[Send Notification]
```

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Load Balancer"
            LB[Nginx Load Balancer]
        end
        
        subgraph "Application Servers"
            APP1[App Server 1]
            APP2[App Server 2]
            APP3[App Server 3]
        end
        
        subgraph "Background Workers"
            WORKER1[Worker Pool 1]
            WORKER2[Worker Pool 2]
        end
        
        subgraph "Data Services"
            DB[(PostgreSQL Primary)]
            DB_REPLICA[(PostgreSQL Replica)]
            REDIS_CLUSTER[(Redis Cluster)]
            SEARCH[(MeiliSearch)]
            STORAGE[(MinIO Cluster)]
        end
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> DB
    APP2 --> DB
    APP3 --> DB
    
    APP1 --> DB_REPLICA
    APP2 --> DB_REPLICA
    APP3 --> DB_REPLICA
    
    APP1 --> REDIS_CLUSTER
    APP2 --> REDIS_CLUSTER
    APP3 --> REDIS_CLUSTER
    
    REDIS_CLUSTER --> WORKER1
    REDIS_CLUSTER --> WORKER2
    
    WORKER1 --> STORAGE
    WORKER2 --> STORAGE
    
    APP1 --> SEARCH
    APP2 --> SEARCH
    APP3 --> SEARCH
```

## 9. Security Features

1. **Authentication Security**
   - JWT with expiration
   - Refresh token rotation
   - OAuth 2.0 integration
   - OTP verification

2. **API Security**
   - Rate limiting
   - Request size limits
   - CORS configuration
   - Security headers (Helmet)
   - Input validation

3. **Data Security**
   - Password hashing (bcrypt)
   - Encrypted connections
   - SQL injection prevention (Prisma ORM)
   - XSS protection

4. **File Upload Security**
   - File type validation
   - Size limits
   - Virus scanning (planned)
   - Content verification

## 10. Performance Optimizations

1. **Caching Strategy**
   - Redis caching for frequently accessed data
   - API response caching
   - Static asset caching

2. **Database Optimization**
   - Indexed queries
   - Connection pooling
   - Query optimization
   - Read replicas

3. **Content Delivery**
   - Adaptive bitrate streaming (HLS)
   - Image optimization
   - CDN integration ready
   - Lazy loading

4. **Background Processing**
   - Asynchronous job processing
   - Queue-based architecture
   - Worker scaling

## 11. Monitoring & Logging

1. **Application Monitoring**
   - Health check endpoints
   - System metrics
   - Performance tracking

2. **Logging**
   - Winston logger
   - Request/Response logging
   - Error tracking
   - Audit logs

3. **Analytics**
   - Real-time analytics
   - Daily summaries
   - User engagement metrics

## 12. Tài Liệu Liên Quan

- [01 - Use Cases Chi Tiết](./01-use-cases.md)
- [02 - Authentication Workflow](./02-authentication-workflow.md)
- [03 - Content Management Workflow](./03-content-workflow.md)
- [04 - Social Interaction Workflow](./04-interaction-workflow.md)
- [05 - Video Processing Workflow](./05-video-processing-workflow.md)
- [06 - Recommendation System](./06-recommendation-system.md)
- [07 - Analytics System](./07-analytics-system.md)
- [08 - Moderation System](./08-moderation-system.md)
- [09 - Notification System](./09-notification-system.md)
- [10 - Database Schema](./10-database-schema.md)
