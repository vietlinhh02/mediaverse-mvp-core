# Content Management Workflow Documentation

This document describes the comprehensive workflows for the MediaCMS Content Management System, covering articles, videos, documents, and their lifecycle management.

## Table of Contents
1. [Content Lifecycle Overview](#content-lifecycle-overview)
2. [Article Workflow](#article-workflow)
3. [Video Processing Workflow](#video-processing-workflow)
4. [Document Processing Workflow](#document-processing-workflow)
5. [Content Publishing Workflow](#content-publishing-workflow)
6. [Content Moderation Workflow](#content-moderation-workflow)
7. [Search & Indexing Workflow](#search--indexing-workflow)
8. [Analytics & Metrics Workflow](#analytics--metrics-workflow)

---

## Content Lifecycle Overview

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> UnderReview: Submit for Review
    Draft --> Published: Direct Publish
    Draft --> Scheduled: Schedule Publication
    
    UnderReview --> Approved: Moderator Approval
    UnderReview --> Rejected: Moderator Rejection
    UnderReview --> NeedsRevision: Requires Changes
    
    Approved --> Published: Auto Publish
    Rejected --> Draft: Return to Author
    NeedsRevision --> Draft: Author Revision
    
    Scheduled --> Published: Scheduled Time
    Scheduled --> Draft: Cancel Schedule
    
    Published --> Archived: Archive Content
    Published --> Unpublished: Unpublish
    Published --> Flagged: User Reports
    
    Flagged --> UnderReview: Moderation Queue
    Flagged --> Published: False Report
    Flagged --> Removed: Violation Confirmed
    
    Unpublished --> Draft: Edit Mode
    Unpublished --> Published: Re-publish
    
    Archived --> Published: Restore
    Removed --> [*]
```

---

## Article Workflow

### 1. Article Creation Process

```mermaid
graph TD
    A[Author Starts Writing] --> B[Article Editor Interface]
    B --> C[Rich Text Editing]
    C --> D[Image Upload & Processing]
    D --> E[Auto-save Draft]
    
    E --> F{Publish Intent}
    F -->|Save Draft| G[Store as Draft]
    F -->|Submit Review| H[Moderation Queue]
    F -->|Publish Now| I[Direct Publish]
    F -->|Schedule| J[Schedule for Later]
    
    G --> K[Email Notification to Author]
    H --> L[Moderator Notification]
    I --> M[SEO Processing]
    J --> N[Scheduler Service]
    
    M --> O[Search Index Update]
    N --> P[Scheduled Job Queue]
```

#### Article Creation Implementation:
```javascript
const createArticleWorkflow = async (articleData, user) => {
  // Step 1: Validate input
  const validatedData = await validateArticleData(articleData);
  
  // Step 2: Process cover image if provided
  let coverImageUrl = null;
  if (validatedData.coverImage) {
    coverImageUrl = await processImage(validatedData.coverImage, {
      sizes: [400, 800, 1200],
      formats: ['webp', 'jpg'],
      quality: 85
    });
  }
  
  // Step 3: Generate slug
  const slug = generateUniqueSlug(validatedData.title);
  
  // Step 4: Calculate read time
  const readTime = calculateReadTime(validatedData.content);
  
  // Step 5: Create article record
  const article = await prisma.article.create({
    data: {
      ...validatedData,
      slug,
      readTime,
      coverImageUrl,
      authorId: user.id,
      status: 'draft'
    }
  });
  
  // Step 6: Process content for SEO
  await processSEOMetadata(article);
  
  // Step 7: Auto-save mechanism
  scheduleAutoSave(article.id);
  
  return article;
};
```

### 2. Article Publishing Workflow

```mermaid
sequenceDiagram
    participant Author
    participant ArticleController
    participant ModerationService
    participant SEOService
    participant SearchService
    participant NotificationService
    participant CDN
    
    Author->>ArticleController: Publish Article
    ArticleController->>ModerationService: Check moderation rules
    
    alt Auto-approve
        ModerationService-->>ArticleController: Approved
        ArticleController->>SEOService: Generate metadata
        ArticleController->>SearchService: Index content
        ArticleController->>CDN: Cache content
        ArticleController->>NotificationService: Notify followers
        ArticleController-->>Author: Published successfully
    else Requires review
        ModerationService-->>ArticleController: Queue for review
        ArticleController->>NotificationService: Notify moderators
        ArticleController-->>Author: Under review
    end
```

### 3. Article Revision System

```mermaid
graph TD
    A[Article Edit Request] --> B[Create Revision Branch]
    B --> C[Edit Content]
    C --> D[Auto-save Changes]
    D --> E{Save Action}
    
    E -->|Save Draft| F[Update Draft Revision]
    E -->|Publish Changes| G[Create New Version]
    
    F --> H[Maintain Edit History]
    G --> I[Version Comparison]
    I --> J[SEO Impact Analysis]
    J --> K[Update Published Version]
    K --> L[Archive Previous Version]
```

---

## Video Processing Workflow

### 1. Video Upload & Processing Pipeline

```mermaid
graph TD
    A[Video Upload Initiated] --> B[Chunk Upload]
    B --> C[Virus Scan]
    C --> D{Safe?}
    
    D -->|No| E[Reject & Notify]
    D -->|Yes| F[Generate Unique ID]
    
    F --> G[Extract Metadata]
    G --> H[Generate Thumbnails]
    H --> I[Queue for Transcoding]
    
    I --> J[FFmpeg Processing]
    J --> K[Multiple Quality Generation]
    K --> L[Audio Extraction]
    L --> M[Subtitle Generation]
    
    M --> N[Upload to CDN]
    N --> O[Update Database]
    O --> P[Notify Author]
    P --> Q[Ready for Publishing]
```

#### Video Processing Implementation:
```javascript
const processVideoWorkflow = async (videoFile, metadata, userId) => {
  const processingId = generateUniqueId();
  
  try {
    // Step 1: Initial upload processing
    const uploadResult = await processVideoUpload(videoFile, {
      userId,
      processingId,
      chunkSize: 5 * 1024 * 1024 // 5MB chunks
    });
    
    // Step 2: Security scan
    await performSecurityScan(uploadResult.filePath);
    
    // Step 3: Extract video metadata
    const videoMetadata = await extractVideoMetadata(uploadResult.filePath);
    
    // Step 4: Generate thumbnails
    const thumbnails = await generateThumbnails(uploadResult.filePath, {
      times: [0.1, 0.3, 0.5, 0.7, 0.9], // Generate at different points
      sizes: [
        { width: 320, height: 180, name: 'small' },
        { width: 640, height: 360, name: 'medium' },
        { width: 1280, height: 720, name: 'large' }
      ]
    });
    
    // Step 5: Queue transcoding jobs
    const transcodingJobs = await queueTranscodingJobs(uploadResult.filePath, {
      qualities: ['360p', '480p', '720p', '1080p'],
      formats: ['mp4', 'webm'],
      audioFormats: ['aac', 'opus']
    });
    
    // Step 6: Create database record
    const video = await prisma.video.create({
      data: {
        ...metadata,
        authorId: userId,
        processingId,
        status: 'processing',
        metadata: videoMetadata,
        thumbnails,
        processingJobs: transcodingJobs
      }
    });
    
    return { video, processingId };
    
  } catch (error) {
    await handleProcessingError(processingId, error);
    throw error;
  }
};
```

### 2. Video Transcoding Workflow

```mermaid
graph TD
    A[Video in Queue] --> B[Worker Assignment]
    B --> C[Download Original]
    C --> D[FFmpeg Transcoding]
    
    D --> E[360p Processing]
    D --> F[480p Processing]
    D --> G[720p Processing]
    D --> H[1080p Processing]
    
    E --> I[Quality Check]
    F --> I
    G --> I
    H --> I
    
    I --> J{Quality OK?}
    J -->|No| K[Retry Processing]
    J -->|Yes| L[Upload to CDN]
    
    K --> D
    L --> M[Generate HLS Playlist]
    M --> N[Generate DASH Manifest]
    N --> O[Update Database]
    O --> P[Notify Completion]
```

### 3. Video Streaming Workflow

```mermaid
sequenceDiagram
    participant Client
    participant CDN
    participant StreamingService
    participant Database
    participant Analytics
    
    Client->>StreamingService: Request video stream
    StreamingService->>Database: Check permissions
    
    alt Authorized
        Database-->>StreamingService: User authorized
        StreamingService->>CDN: Get stream URLs
        CDN-->>StreamingService: Return URLs
        StreamingService-->>Client: Return streaming info
        
        Client->>CDN: Request video chunks
        CDN-->>Client: Stream video data
        
        Client->>Analytics: Report playback events
    else Unauthorized
        Database-->>StreamingService: Access denied
        StreamingService-->>Client: 403 Forbidden
    end
```

---

## Document Processing Workflow

### 1. Document Upload & Processing

```mermaid
graph TD
    A[Document Upload] --> B[File Type Validation]
    B --> C{Supported Format?}
    
    C -->|No| D[Return Error]
    C -->|Yes| E[Virus Scan]
    
    E --> F{Safe?}
    F -->|No| G[Quarantine & Alert]
    F -->|Yes| H[Extract Text Content]
    
    H --> I[Generate Preview Images]
    I --> J[Create Searchable Index]
    J --> K[Generate Thumbnails]
    K --> L[Store in CDN]
    L --> M[Update Database]
    M --> N[Ready for Access]
```

#### Document Processing Implementation:
```javascript
const processDocumentWorkflow = async (documentFile, metadata, userId) => {
  const processingStages = [
    'upload',
    'virus_scan',
    'text_extraction',
    'preview_generation',
    'indexing',
    'storage'
  ];
  
  let currentStage = 0;
  
  try {
    // Stage 1: Upload validation
    await updateProcessingStatus(documentId, processingStages[currentStage++]);
    const uploadResult = await validateAndStoreDocument(documentFile);
    
    // Stage 2: Security scan
    await updateProcessingStatus(documentId, processingStages[currentStage++]);
    await performDocumentSecurityScan(uploadResult.filePath);
    
    // Stage 3: Text extraction
    await updateProcessingStatus(documentId, processingStages[currentStage++]);
    const extractedText = await extractTextFromDocument(uploadResult.filePath, {
      format: metadata.mimeType,
      options: {
        ocr: true, // Enable OCR for scanned documents
        languages: ['eng', 'vie'], // Support multiple languages
        preserveFormatting: true
      }
    });
    
    // Stage 4: Preview generation
    await updateProcessingStatus(documentId, processingStages[currentStage++]);
    const previewImages = await generateDocumentPreviews(uploadResult.filePath, {
      pages: 'all',
      format: 'jpeg',
      quality: 85,
      sizes: [
        { width: 200, height: 280, name: 'thumbnail' },
        { width: 600, height: 800, name: 'preview' },
        { width: 1200, height: 1600, name: 'full' }
      ]
    });
    
    // Stage 5: Search indexing
    await updateProcessingStatus(documentId, processingStages[currentStage++]);
    await indexDocumentContent({
      documentId,
      title: metadata.title,
      content: extractedText,
      metadata: {
        author: metadata.author,
        keywords: metadata.keywords,
        category: metadata.category
      }
    });
    
    // Stage 6: Final storage
    await updateProcessingStatus(documentId, processingStages[currentStage++]);
    const document = await prisma.document.create({
      data: {
        ...metadata,
        authorId: userId,
        extractedText,
        previewImages,
        status: 'ready',
        processingCompleted: true
      }
    });
    
    return document;
    
  } catch (error) {
    await handleDocumentProcessingError(documentId, currentStage, error);
    throw error;
  }
};
```

### 2. Document Viewing Workflow

```mermaid
sequenceDiagram
    participant User
    participant DocumentController
    participant PermissionService
    participant CDN
    participant Analytics
    participant WatermarkService
    
    User->>DocumentController: Request document view
    DocumentController->>PermissionService: Check access rights
    
    alt Access granted
        PermissionService-->>DocumentController: Authorized
        
        alt Password protected
            DocumentController-->>User: Request password
            User->>DocumentController: Provide password
            DocumentController->>PermissionService: Validate password
        end
        
        DocumentController->>WatermarkService: Apply watermark
        WatermarkService-->>DocumentController: Watermarked URLs
        
        DocumentController->>CDN: Get preview URLs
        CDN-->>DocumentController: Return URLs
        
        DocumentController-->>User: Return viewing data
        DocumentController->>Analytics: Log view event
        
    else Access denied
        PermissionService-->>DocumentController: Unauthorized
        DocumentController-->>User: 403 Forbidden
    end
```

---

## Content Publishing Workflow

### 1. Multi-Stage Publishing Process

```mermaid
graph TD
    A[Content Ready] --> B{Publishing Type}
    
    B -->|Immediate| C[Pre-publish Checks]
    B -->|Scheduled| D[Add to Schedule Queue]
    B -->|Review Required| E[Moderation Queue]
    
    C --> F[SEO Optimization]
    F --> G[Social Media Preparation]
    G --> H[CDN Distribution]
    H --> I[Search Index Update]
    I --> J[Notification Distribution]
    J --> K[Published]
    
    D --> L[Scheduler Service]
    L --> M{Time Reached?}
    M -->|Yes| C
    M -->|No| N[Wait]
    N --> M
    
    E --> O[Moderator Review]
    O --> P{Approved?}
    P -->|Yes| C
    P -->|No| Q[Return to Author]
```

### 2. Content Distribution Workflow

```mermaid
graph TD
    A[Content Published] --> B[Primary CDN]
    B --> C[Global Edge Locations]
    C --> D[Regional Caches]
    
    A --> E[Social Media APIs]
    E --> F[Twitter Posting]
    E --> G[Facebook Sharing]
    E --> H[LinkedIn Publishing]
    
    A --> I[Email Service]
    I --> J[Subscriber Notifications]
    J --> K[Digest Compilation]
    
    A --> L[RSS Feed Update]
    L --> M[Sitemap Generation]
    M --> N[Search Engine Notification]
```

#### Publishing Implementation:
```javascript
const publishContentWorkflow = async (contentId, publishOptions, userId) => {
  const publishingTasks = [];
  
  try {
    // Step 1: Pre-publish validation
    const content = await validateContentForPublishing(contentId, userId);
    
    // Step 2: SEO optimization
    publishingTasks.push(
      optimizeContentForSEO(content, {
        generateMetaTags: true,
        createOpenGraphData: true,
        generateStructuredData: true
      })
    );
    
    // Step 3: CDN distribution
    publishingTasks.push(
      distributeToContentDeliveryNetwork(content, {
        regions: ['us-east', 'eu-west', 'asia-pacific'],
        cacheSettings: {
          maxAge: 3600,
          staleWhileRevalidate: 86400
        }
      })
    );
    
    // Step 4: Search indexing
    publishingTasks.push(
      updateSearchIndex(content, {
        fullTextIndex: true,
        facetedSearch: true,
        autoComplete: true
      })
    );
    
    // Step 5: Social media preparation
    if (publishOptions.shareToSocialMedia) {
      publishingTasks.push(
        prepareSocialMediaPosts(content, publishOptions.socialPlatforms)
      );
    }
    
    // Step 6: Execute all tasks in parallel
    const results = await Promise.allSettled(publishingTasks);
    
    // Step 7: Update content status
    await prisma.content.update({
      where: { id: contentId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishingResults: results
      }
    });
    
    // Step 8: Send notifications
    await sendPublishingNotifications(content, publishOptions);
    
    return { success: true, content, results };
    
  } catch (error) {
    await handlePublishingError(contentId, error);
    throw error;
  }
};
```

---

## Content Moderation Workflow

### 1. Automated Moderation Pipeline

```mermaid
graph TD
    A[Content Submitted] --> B[Automated Scanning]
    
    B --> C[Profanity Filter]
    B --> D[Spam Detection]
    B --> E[Image Analysis]
    B --> F[Copyright Check]
    
    C --> G{Issues Found?}
    D --> G
    E --> G
    F --> G
    
    G -->|No Issues| H[Auto-Approve]
    G -->|Minor Issues| I[Flag for Review]
    G -->|Major Issues| J[Auto-Reject]
    
    H --> K[Publish Immediately]
    I --> L[Human Moderator Queue]
    J --> M[Notify Author]
    
    L --> N[Moderator Review]
    N --> O{Decision}
    O -->|Approve| K
    O -->|Reject| M
    O -->|Request Changes| P[Return to Author]
```

### 2. Human Moderation Interface

```mermaid
sequenceDiagram
    participant System
    participant Moderator
    participant ModerationService
    participant ContentService
    participant AuthorService
    
    System->>ModerationService: Content flagged
    ModerationService->>Moderator: Add to queue
    
    Moderator->>ModerationService: Review content
    ModerationService->>ContentService: Get full content
    ContentService-->>ModerationService: Return content data
    ModerationService-->>Moderator: Display content
    
    Moderator->>ModerationService: Make decision
    
    alt Approve
        ModerationService->>ContentService: Approve content
        ModerationService->>AuthorService: Notify approval
    else Reject
        ModerationService->>ContentService: Reject content
        ModerationService->>AuthorService: Notify rejection
    else Request changes
        ModerationService->>AuthorService: Request revisions
    end
```

---

## Search & Indexing Workflow

### 1. Content Indexing Process

```mermaid
graph TD
    A[Content Change Event] --> B[Extract Searchable Data]
    B --> C[Text Processing]
    C --> D[Tokenization]
    D --> E[Stop Word Removal]
    E --> F[Stemming/Lemmatization]
    F --> G[Index Generation]
    
    G --> H[Primary Search Index]
    G --> I[Faceted Search Index]
    G --> J[Auto-complete Index]
    G --> K[Related Content Index]
    
    H --> L[Search Service Update]
    I --> L
    J --> L
    K --> L
```

### 2. Search Query Processing

```mermaid
sequenceDiagram
    participant User
    participant SearchController
    participant QueryProcessor
    participant SearchEngine
    participant Database
    participant Cache
    
    User->>SearchController: Search query
    SearchController->>Cache: Check cache
    
    alt Cache hit
        Cache-->>SearchController: Return cached results
        SearchController-->>User: Return results
    else Cache miss
        SearchController->>QueryProcessor: Process query
        QueryProcessor->>SearchEngine: Execute search
        SearchEngine->>Database: Query indices
        Database-->>SearchEngine: Return matches
        SearchEngine-->>QueryProcessor: Ranked results
        QueryProcessor-->>SearchController: Formatted results
        SearchController->>Cache: Store results
        SearchController-->>User: Return results
    end
```

#### Search Implementation:
```javascript
const processSearchQuery = async (query, filters, pagination) => {
  // Step 1: Query preprocessing
  const processedQuery = await preprocessQuery(query, {
    expandAcronyms: true,
    correctSpelling: true,
    addSynonyms: true
  });
  
  // Step 2: Build search criteria
  const searchCriteria = {
    query: processedQuery,
    filters: {
      contentType: filters.contentType,
      category: filters.category,
      author: filters.author,
      dateRange: filters.dateRange
    },
    sort: {
      field: filters.sortBy || 'relevance',
      order: filters.sortOrder || 'desc'
    },
    pagination: {
      page: pagination.page || 1,
      limit: Math.min(pagination.limit || 20, 50)
    },
    facets: [
      'contentType',
      'category',
      'author',
      'publishYear'
    ]
  };
  
  // Step 3: Execute search
  const searchResults = await searchEngine.search(searchCriteria);
  
  // Step 4: Enhance results with metadata
  const enhancedResults = await Promise.all(
    searchResults.hits.map(async (hit) => {
      const metadata = await getContentMetadata(hit.id);
      return {
        ...hit,
        metadata,
        highlightedText: generateHighlights(hit.content, processedQuery)
      };
    })
  );
  
  return {
    query: processedQuery,
    results: enhancedResults,
    facets: searchResults.facets,
    pagination: searchResults.pagination,
    performance: searchResults.performance
  };
};
```

---

## Analytics & Metrics Workflow

### 1. Real-time Analytics Pipeline

```mermaid
graph TD
    A[User Interaction] --> B[Event Capture]
    B --> C[Event Validation]
    C --> D[Event Enrichment]
    D --> E[Stream Processing]
    
    E --> F[Real-time Dashboards]
    E --> G[Alerting System]
    E --> H[Hot Storage]
    
    H --> I[Batch Processing]
    I --> J[Data Aggregation]
    J --> K[Cold Storage]
    K --> L[Historical Reports]
```

### 2. Content Performance Tracking

```mermaid
sequenceDiagram
    participant User
    participant ContentService
    participant AnalyticsService
    participant MetricsDB
    participant RecommendationEngine
    
    User->>ContentService: View content
    ContentService->>AnalyticsService: Track view event
    
    AnalyticsService->>MetricsDB: Store event
    AnalyticsService->>RecommendationEngine: Update user profile
    
    par Real-time metrics
        AnalyticsService->>MetricsDB: Update view count
        AnalyticsService->>MetricsDB: Update user session
    and Batch processing
        AnalyticsService->>MetricsDB: Queue for aggregation
    end
    
    ContentService-->>User: Serve content
```

#### Analytics Implementation:
```javascript
const trackContentInteraction = async (eventData) => {
  const event = {
    id: generateEventId(),
    timestamp: new Date(),
    userId: eventData.userId,
    contentId: eventData.contentId,
    eventType: eventData.eventType, // view, like, share, comment
    metadata: {
      duration: eventData.duration,
      device: eventData.device,
      location: eventData.location,
      referrer: eventData.referrer
    }
  };
  
  // Immediate processing
  const immediateProcessing = [
    // Update real-time counters
    incrementCounter(`content:${event.contentId}:${event.eventType}`),
    
    // Update user activity
    updateUserActivity(event.userId, event),
    
    // Check for trending patterns
    checkTrendingThresholds(event.contentId),
    
    // Update recommendation signals
    updateRecommendationSignals(event.userId, event.contentId, event.eventType)
  ];
  
  await Promise.all(immediateProcessing);
  
  // Queue for batch processing
  await queueForBatchProcessing(event);
  
  return event;
};
```

This comprehensive content management workflow documentation provides detailed insights into how content flows through the MediaCMS system, from creation to analytics, including all the processing steps, validation, and optimization phases.