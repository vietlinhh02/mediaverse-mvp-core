# MediaVerse MVP - Moderation System

## 1. Giới Thiệu

Hệ thống Moderation (Kiểm duyệt) đảm bảo nội dung và người dùng tuân thủ các quy tắc cộng đồng thông qua việc kết hợp kiểm duyệt tự động (AI) và thủ công (con người).

### Tính Năng Chính
- **Content Reporting** - Báo cáo nội dung vi phạm
- **User Reporting** - Báo cáo người dùng vi phạm
- **AI-Powered Moderation** - Phát hiện tự động nội dung độc hại
- **Priority Queue System** - Hệ thống ưu tiên xử lý
- **Moderation Actions** - Xóa, cảnh báo, ban user
- **Audit Logging** - Ghi lại mọi hành động kiểm duyệt
- **SLA Management** - Quản lý thời gian phản hồi

## 2. Moderation System Architecture

```mermaid
graph TB
    subgraph "Report Submission"
        USER[User Reports Content/User]
        REPORT_API[Report API]
        AUTO_DETECT[AI Auto Detection]
    end
    
    subgraph "AI Moderation Layer"
        TEXT_ANALYSIS[Text Analysis]
        IMAGE_ANALYSIS[Image Analysis]
        PROFANITY[Profanity Detection]
        HATE_SPEECH[Hate Speech Detection]
    end
    
    subgraph "Priority Queue"
        CALCULATE[Calculate Priority]
        QUEUE[Report Queue]
        ESCALATE[Auto-Escalation]
    end
    
    subgraph "Review Process"
        MODERATOR[Moderator Dashboard]
        REVIEW[Review Report]
        DECISION[Make Decision]
    end
    
    subgraph "Actions"
        REMOVE[Remove Content]
        WARN[Warn User]
        BAN[Ban User]
        APPROVE[Approve Content]
    end
    
    subgraph "Audit & Logging"
        AUDIT_LOG[Moderation Log]
        NOTIFICATION[Notify Reporter & User]
    end
    
    USER --> REPORT_API
    AUTO_DETECT --> REPORT_API
    
    REPORT_API --> TEXT_ANALYSIS
    REPORT_API --> IMAGE_ANALYSIS
    
    TEXT_ANALYSIS --> PROFANITY
    TEXT_ANALYSIS --> HATE_SPEECH
    IMAGE_ANALYSIS --> PROFANITY
    
    PROFANITY --> CALCULATE
    HATE_SPEECH --> CALCULATE
    
    CALCULATE --> QUEUE
    QUEUE --> ESCALATE
    ESCALATE --> QUEUE
    
    QUEUE --> MODERATOR
    MODERATOR --> REVIEW
    REVIEW --> DECISION
    
    DECISION --> REMOVE
    DECISION --> WARN
    DECISION --> BAN
    DECISION --> APPROVE
    
    REMOVE --> AUDIT_LOG
    WARN --> AUDIT_LOG
    BAN --> AUDIT_LOG
    APPROVE --> AUDIT_LOG
    
    AUDIT_LOG --> NOTIFICATION
    
    style AI_ANALYSIS fill:#61dafb,stroke:#333,stroke-width:2px
    style QUEUE fill:#FFD700,stroke:#333,stroke-width:2px
    style AUDIT_LOG fill:#90EE90,stroke:#333,stroke-width:2px
```

## 3. Report Workflow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant AIService
    participant QueueService
    participant Database
    participant Notification
    
    User->>API: POST /moderation/reports<br/>{contentId, reason, type}
    
    API->>AIService: Analyze Content
    
    alt Content is Text
        AIService->>AIService: Analyze Text:<br/>- Profanity detection<br/>- Hate speech detection
        AIService-->>API: {score: 0.9, flagged: true}
    else Content is Image
        AIService->>AIService: Analyze Image<br/>(Placeholder for future)
        AIService-->>API: {score: 0.0, flagged: false}
    end
    
    API->>Database: Create Report Record
    Database-->>API: Report Created
    
    API->>QueueService: Calculate Priority
    
    QueueService->>QueueService: Factors:<br/>- Report count for content<br/>- Content type weight<br/>- Reporter reputation
    
    QueueService->>QueueService: Score Calculation:<br/>score = (reportCount × 0.5) +<br/>(contentTypeWeight × 0.2) +<br/>(userReputation × 0.3)
    
    QueueService->>QueueService: Determine Priority:<br/>HIGH: score > 3.0<br/>MEDIUM: score > 1.5<br/>LOW: score ≤ 1.5
    
    QueueService->>Database: Update Report Priority
    Database-->>API: Priority Updated
    
    alt AI Flagged as High Risk
        API->>Database: Auto-flag for immediate review
        API->>Notification: Alert Moderators
    end
    
    API-->>User: Report Submitted<br/>{reportId, status: "PENDING"}
    
    Note over QueueService: Daily SLA Check Job
    
    QueueService->>Database: Find reports > 24h old
    Database-->>QueueService: Overdue reports
    
    QueueService->>Database: Escalate to HIGH priority
    QueueService->>Notification: Alert Moderators
```

## 4. AI Moderation Service

```mermaid
flowchart TD
    START[Content to Analyze] --> TYPE{Content Type}
    
    TYPE -->|Text| TEXT_ANALYSIS[Text Analysis]
    TYPE -->|Image| IMAGE_ANALYSIS[Image Analysis]
    
    TEXT_ANALYSIS --> WORDLIST[Check Wordlists]
    TEXT_ANALYSIS --> REGEX[Check Regex Patterns]
    
    WORDLIST --> HATE[Hate Speech Words<br/>Weight: 0.9-1.0]
    WORDLIST --> PROFANITY[Profanity Words<br/>Weight: 0.5-0.7]
    
    REGEX --> PATTERNS[Profanity Patterns<br/>Weight: 0.5]
    
    HATE --> SCORE[Calculate Score]
    PROFANITY --> SCORE
    PATTERNS --> SCORE
    
    SCORE --> NORMALIZE[Normalize Score<br/>Max: 1.0]
    
    NORMALIZE --> THRESHOLD{Score ≥ 0.8?}
    
    THRESHOLD -->|Yes| FLAGGED[Flagged: TRUE]
    THRESHOLD -->|No| NOT_FLAGGED[Flagged: FALSE]
    
    IMAGE_ANALYSIS --> PLACEHOLDER[Placeholder<br/>Future: AWS Rekognition<br/>or Google Vision AI]
    
    PLACEHOLDER --> NOT_FLAGGED
    
    FLAGGED --> RETURN[Return Analysis Result]
    NOT_FLAGGED --> RETURN
    
    RETURN --> END{Should Flag?}
    
    END -->|Flagged = TRUE| AUTO_FLAG[Auto-flag for Review]
    END -->|Flagged = FALSE| QUEUE_NORMAL[Queue Normal Priority]
    
    style START fill:#90EE90,stroke:#333,stroke-width:2px
    style FLAGGED fill:#FFB6C1,stroke:#333,stroke-width:2px
    style NOT_FLAGGED fill:#90EE90,stroke:#333,stroke-width:2px
    style AUTO_FLAG fill:#FFB6C1,stroke:#333,stroke-width:2px
```

### AI Moderation Implementation

```javascript
// src/modules/moderation/services/aiModerationService.js

const PROFANITY_THRESHOLD = 0.8;

// Hate speech wordlist with weights
const HATE_SPEECH_WORDS = {
  word1: 0.9,
  word2: 1.0
  // More words in production
};

// Profanity wordlist with weights
const PROFANITY_WORDS = {
  badword1: 0.5,
  badword2: 0.7
  // More words in production
};

// Regex patterns for profanity variations
const PROFANITY_REGEX = [
  /f\*[ck]{2}/i
  // More patterns in production
];

/**
 * Analyze text content for moderation flags
 */
const analyzeText = async (text) => {
  if (!text || typeof text !== 'string') {
    return { score: 0, flagged: false, details: { reason: 'No text provided.' } };
  }
  
  let score = 0;
  const matchedWords = new Set();
  const lowerCaseText = text.toLowerCase();
  
  // 1. Check against hate speech wordlist
  for (const word in HATE_SPEECH_WORDS) {
    if (lowerCaseText.includes(word)) {
      score += HATE_SPEECH_WORDS[word];
      matchedWords.add(word);
    }
  }
  
  // 2. Check against profanity wordlist
  for (const word in PROFANITY_WORDS) {
    if (lowerCaseText.includes(word)) {
      score += PROFANITY_WORDS[word];
      matchedWords.add(word);
    }
  }
  
  // 3. Check against regex patterns
  for (const regex of PROFANITY_REGEX) {
    if (regex.test(lowerCaseText)) {
      score += 0.5;
      matchedWords.add(regex.toString());
    }
  }
  
  // Normalize score (cap at 1.0)
  const finalScore = Math.min(score, 1.0);
  const flagged = finalScore >= PROFANITY_THRESHOLD;
  
  return {
    score: finalScore,
    flagged,
    details: {
      matched: Array.from(matchedWords),
      threshold: PROFANITY_THRESHOLD
    }
  };
};

/**
 * Analyze image content (placeholder for future)
 * Will integrate with AWS Rekognition or Google Vision AI
 */
const analyzeImage = async (imageUrl) => {
  console.log(`[STUB] Analyzing image at: ${imageUrl}`);
  
  // Future implementation:
  // 1. Call third-party AI service (AWS Rekognition, Google Vision)
  // 2. Analyze labels: 'Violence', 'Nudity', 'Explicit Content'
  // 3. Return score and flagged status
  
  return { score: 0, flagged: false, details: { reason: 'Image analysis not implemented.' } };
};

/**
 * Determine if content should be flagged
 */
const shouldFlagContent = async (content, contentType = 'text') => {
  let result;
  
  if (contentType === 'text') {
    result = await analyzeText(content);
  } else if (contentType === 'image') {
    result = await analyzeImage(content);
  } else {
    return false;
  }
  
  return result.flagged;
};

module.exports = {
  analyzeText,
  analyzeImage,
  shouldFlagContent,
  PROFANITY_THRESHOLD
};
```

## 5. Priority Queue System

```mermaid
graph TB
    subgraph "Priority Calculation Factors"
        F1[Report Count<br/>for Content<br/>Weight: 0.5]
        F2[Content Type<br/>Video: 1.5x<br/>Other: 1.0x<br/>Weight: 0.2]
        F3[Reporter Reputation<br/>Admin/Mod: 1.0<br/>User: 0.5<br/>Weight: 0.3]
    end
    
    subgraph "Score Calculation"
        F1 --> FORMULA[Score = <br/>reportCount × 0.5 +<br/>contentTypeWeight × 0.2 +<br/>userReputation × 0.3]
        F2 --> FORMULA
        F3 --> FORMULA
    end
    
    subgraph "Priority Assignment"
        FORMULA --> HIGH{Score > 3.0?}
        HIGH -->|Yes| P_HIGH[Priority: HIGH]
        HIGH -->|No| MEDIUM{Score > 1.5?}
        MEDIUM -->|Yes| P_MEDIUM[Priority: MEDIUM]
        MEDIUM -->|No| P_LOW[Priority: LOW]
    end
    
    subgraph "Queue Order"
        P_HIGH --> QUEUE[Moderation Queue]
        P_MEDIUM --> QUEUE
        P_LOW --> QUEUE
        
        QUEUE --> SORT[Sort by:<br/>1. Priority DESC<br/>2. CreatedAt ASC]
    end
    
    style P_HIGH fill:#FFB6C1,stroke:#333,stroke-width:2px
    style P_MEDIUM fill:#FFD700,stroke:#333,stroke-width:2px
    style P_LOW fill:#90EE90,stroke:#333,stroke-width:2px
```

### Queue Service Implementation

```javascript
// src/modules/moderation/services/queueService.js

const SLA_HOURS = 24;

/**
 * Get user reputation score
 * Admin/Moderator: 1.0
 * Verified User: 0.7
 * Regular User: 0.5
 */
const getUserReputation = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (user && (user.role === 'admin' || user.role === 'moderator')) {
    return 1.0;
  }
  
  if (user && user.isVerified) {
    return 0.7;
  }
  
  return 0.5;
};

/**
 * Calculate priority for a report
 */
const calculatePriority = async (report) => {
  if (!report.contentId) return 'LOW';
  
  // Factor 1: How many times has this content been reported?
  const reportCount = await prisma.report.count({
    where: { contentId: report.contentId }
  });
  
  // Factor 2: Content type (video has higher priority)
  const content = await prisma.content.findUnique({
    where: { id: report.contentId },
    select: { type: true }
  });
  const contentTypeWeight = (content && content.type === 'video') ? 1.5 : 1.0;
  
  // Factor 3: Reporter reputation
  const userReputation = await getUserReputation(report.reporterId);
  
  // Calculate score
  const score = 
    (reportCount * 0.5) + 
    (contentTypeWeight * 0.2) + 
    (userReputation * 0.3);
  
  // Assign priority
  if (score > 3.0) return 'HIGH';
  if (score > 1.5) return 'MEDIUM';
  return 'LOW';
};

/**
 * Enqueue a report with calculated priority
 */
const enqueueReport = async (report) => {
  const priority = await calculatePriority(report);
  
  return prisma.report.update({
    where: { id: report.id },
    data: { priority }
  });
};

/**
 * Escalate overdue reports (run as daily cron job)
 * Reports pending > 24 hours are escalated to HIGH priority
 */
const escalateOverdueReports = async () => {
  const slaThreshold = new Date(Date.now() - SLA_HOURS * 60 * 60 * 1000);
  
  const { count } = await prisma.report.updateMany({
    where: {
      status: 'PENDING',
      priority: { not: 'HIGH' },
      createdAt: { lt: slaThreshold }
    },
    data: {
      priority: 'HIGH'
    }
  });
  
  if (count > 0) {
    console.log(`Escalated ${count} overdue reports.`);
    // Notify moderators
  }
  
  return count;
};

/**
 * Get batch of reports for moderator to review
 */
const getReportBatch = async (limit = 10) => {
  return prisma.report.findMany({
    where: { status: 'PENDING' },
    orderBy: [
      { priority: 'desc' },  // HIGH -> MEDIUM -> LOW
      { createdAt: 'asc' }   // Oldest first
    ],
    take: limit,
    include: {
      reporter: { 
        select: { id: true, username: true } 
      },
      reportedContent: { 
        select: { id: true, title: true, type: true } 
      }
    }
  });
};
```

## 6. SLA Management

```mermaid
gantt
    title Report Resolution SLA
    dateFormat  HH:mm
    
    section HIGH Priority
    Review & Action    :active, h1, 00:00, 2h
    
    section MEDIUM Priority
    Review & Action    :m1, 00:00, 8h
    
    section LOW Priority
    Review & Action    :l1, 00:00, 24h
    
    section Escalation
    Auto-escalate to HIGH    :crit, e1, 24:00, 1h
```

### SLA Targets

| Priority | Target Response Time | Auto-Escalation |
|----------|---------------------|-----------------|
| **HIGH** | 2 hours | - |
| **MEDIUM** | 8 hours | After 24 hours → HIGH |
| **LOW** | 24 hours | After 24 hours → HIGH |

### Daily SLA Check Job

```javascript
// Run as cron job: 0 */6 * * * (every 6 hours)
const checkAndEscalateReports = async () => {
  const escalatedCount = await escalateOverdueReports();
  
  if (escalatedCount > 0) {
    // Send notification to moderators
    await notificationService.notifyModerators({
      type: 'SLA_BREACH',
      message: `${escalatedCount} reports have been escalated to HIGH priority`,
      escalatedCount
    });
  }
};
```

## 7. Moderation Actions

```mermaid
sequenceDiagram
    participant Moderator
    participant Dashboard
    participant API
    participant ContentService
    participant Database
    participant AuditLog
    participant Notification
    
    Moderator->>Dashboard: Review Report
    Dashboard->>API: GET /moderation/reports/:id
    API->>Database: Fetch Report Details
    Database-->>Dashboard: Report + Content + User Info
    
    Moderator->>Dashboard: Make Decision
    
    alt Action: Remove Content
        Dashboard->>API: POST /moderation/action<br/>{action: "remove"}
        API->>ContentService: Process Content Removal
        ContentService->>Database: Update content.status = "removed"
        ContentService->>Database: Update report.status = "RESOLVED"
        ContentService->>AuditLog: Log Removal Action
    else Action: Warn User
        Dashboard->>API: POST /moderation/action<br/>{action: "warn"}
        API->>Database: Create ModerationLog<br/>action: WARN_USER
        API->>Database: Update report.status = "RESOLVED"
    else Action: Ban User
        Dashboard->>API: POST /moderation/action<br/>{action: "ban"}
        API->>Database: Update user.status = "banned"
        API->>Database: Update report.status = "RESOLVED"
        API->>AuditLog: Log Ban Action
    else Action: Approve (False Report)
        Dashboard->>API: POST /moderation/action<br/>{action: "approve"}
        API->>Database: Update report.status = "RESOLVED"<br/>decision: "approve"
        API->>AuditLog: Log Approval
    end
    
    API->>Notification: Notify Reporter
    API->>Notification: Notify Content Owner
    
    Notification-->>Reporter: Email: Report Resolved
    Notification-->>Owner: Email: Action Taken
    
    API-->>Dashboard: Action Success
```

### Content Moderation Service

```javascript
// src/modules/moderation/services/contentModerationService.js

/**
 * Process moderation action on content
 */
const processContentAction = async (contentId, action, details) => {
  const { reportId, moderatorId, reason } = details;
  
  const content = await prisma.content.findUnique({ 
    where: { id: contentId } 
  });
  
  if (!content) {
    throw new Error('Content not found.');
  }
  
  const transactions = [];
  
  // 1. Update content status if action is 'remove'
  if (action === 'remove') {
    transactions.push(
      prisma.content.update({
        where: { id: contentId },
        data: { status: 'removed' }
      })
    );
  }
  
  // 2. Resolve the report
  transactions.push(
    prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        reviewedBy: moderatorId,
        reviewedAt: new Date(),
        decision: action
      }
    })
  );
  
  // 3. Create audit log
  transactions.push(
    prisma.moderationLog.create({
      data: {
        moderatorId,
        userId: content.authorId,
        action: action === 'remove' ? 'REMOVE_CONTENT' : 'APPROVE_CONTENT',
        reason,
        notes: `Action on content ID: ${content.id}`
      }
    })
  );
  
  // Execute all operations in a single transaction
  const [updatedContent, updatedReport, log] = await prisma.$transaction(transactions);
  
  return {
    success: true,
    message: `Content successfully ${action}d.`,
    updatedContent,
    updatedReport,
    log
  };
};
```

## 8. Moderation Dashboard

```mermaid
graph TB
    subgraph "Dashboard Overview"
        PENDING[Pending Reports:<br/>Count by Priority]
        QUEUE[Moderation Queue]
        STATS[Today's Statistics]
    end
    
    subgraph "Queue View"
        HIGH_REPORTS[HIGH Priority<br/>Red Badge]
        MEDIUM_REPORTS[MEDIUM Priority<br/>Yellow Badge]
        LOW_REPORTS[LOW Priority<br/>Green Badge]
    end
    
    subgraph "Report Details"
        CONTENT_PREVIEW[Content Preview]
        REPORTER_INFO[Reporter Info]
        REPORT_REASON[Report Reason]
        AI_ANALYSIS[AI Analysis Results]
        HISTORY[Previous Reports<br/>on this Content]
    end
    
    subgraph "Actions"
        REMOVE_BTN[Remove Content]
        WARN_BTN[Warn User]
        BAN_BTN[Ban User]
        APPROVE_BTN[Approve (Dismiss)]
    end
    
    PENDING --> QUEUE
    QUEUE --> HIGH_REPORTS
    QUEUE --> MEDIUM_REPORTS
    QUEUE --> LOW_REPORTS
    
    HIGH_REPORTS --> CONTENT_PREVIEW
    MEDIUM_REPORTS --> CONTENT_PREVIEW
    LOW_REPORTS --> CONTENT_PREVIEW
    
    CONTENT_PREVIEW --> REPORTER_INFO
    REPORTER_INFO --> REPORT_REASON
    REPORT_REASON --> AI_ANALYSIS
    AI_ANALYSIS --> HISTORY
    
    HISTORY --> REMOVE_BTN
    HISTORY --> WARN_BTN
    HISTORY --> BAN_BTN
    HISTORY --> APPROVE_BTN
    
    style HIGH_REPORTS fill:#FFB6C1,stroke:#333,stroke-width:2px
    style MEDIUM_REPORTS fill:#FFD700,stroke:#333,stroke-width:2px
    style LOW_REPORTS fill:#90EE90,stroke:#333,stroke-width:2px
```

## 9. Audit Logging

```mermaid
graph LR
    subgraph "Moderation Actions"
        A1[Remove Content]
        A2[Warn User]
        A3[Ban User]
        A4[Approve Content]
        A5[Restore Content]
    end
    
    subgraph "Audit Log Entry"
        LOG[ModerationLog Record]
    end
    
    subgraph "Log Details"
        MODERATOR[Moderator ID]
        USER[Affected User ID]
        ACTION[Action Type]
        REASON[Reason]
        TIMESTAMP[Timestamp]
        NOTES[Additional Notes]
    end
    
    A1 --> LOG
    A2 --> LOG
    A3 --> LOG
    A4 --> LOG
    A5 --> LOG
    
    LOG --> MODERATOR
    LOG --> USER
    LOG --> ACTION
    LOG --> REASON
    LOG --> TIMESTAMP
    LOG --> NOTES
    
    style LOG fill:#61dafb,stroke:#333,stroke-width:2px
```

### Moderation Log Schema

```javascript
// Moderation Log Model
{
  id: "log-123",
  moderatorId: "mod-456",
  userId: "user-789",          // Affected user
  action: "REMOVE_CONTENT",    // REMOVE_CONTENT, WARN_USER, BAN_USER, etc.
  reason: "Hate speech",
  notes: "Action on content ID: content-999",
  contentId: "content-999",    // Optional
  reportId: "report-888",      // Optional
  createdAt: "2025-10-15T14:30:00Z"
}
```

## 10. Report Types & Reasons

```mermaid
graph TB
    subgraph "Content Reports"
        CR1[Spam or Misleading]
        CR2[Hate Speech]
        CR3[Harassment or Bullying]
        CR4[Graphic or Violent]
        CR5[Adult Content]
        CR6[Copyright Violation]
        CR7[Other]
    end
    
    subgraph "User Reports"
        UR1[Spam Account]
        UR2[Impersonation]
        UR3[Harassment]
        UR4[Inappropriate Behavior]
        UR5[Other]
    end
    
    style CR2 fill:#FFB6C1,stroke:#333,stroke-width:2px
    style CR3 fill:#FFB6C1,stroke:#333,stroke-width:2px
    style CR4 fill:#FFB6C1,stroke:#333,stroke-width:2px
```

### Report Model

```javascript
// Report Schema
{
  id: "report-123",
  type: "CONTENT",              // CONTENT or USER
  reporterId: "user-456",
  
  // For content reports
  contentId: "content-789",
  
  // For user reports
  reportedUserId: "user-999",
  
  reason: "HATE_SPEECH",        // Enum
  description: "User explanation of the issue",
  
  priority: "HIGH",             // HIGH, MEDIUM, LOW
  status: "PENDING",            // PENDING, RESOLVED, DISMISSED
  
  // AI analysis results
  aiAnalysis: {
    score: 0.9,
    flagged: true,
    matched: ["word1", "word2"]
  },
  
  // Resolution
  reviewedBy: "mod-123",
  reviewedAt: "2025-10-15T14:30:00Z",
  decision: "remove",           // remove, warn, ban, approve
  
  createdAt: "2025-10-15T10:00:00Z"
}
```

## 11. API Endpoints

### Create Report
```http
POST /api/moderation/reports
Headers: Authorization: Bearer <token>
Body:
{
  "type": "CONTENT",
  "contentId": "content-123",
  "reason": "HATE_SPEECH",
  "description": "This content contains offensive language"
}
```

### Get Reports (Moderator)
```http
GET /api/moderation/reports
Headers: Authorization: Bearer <token>
Query Parameters:
  - status: string (default: "PENDING")
  - priority: string
  - limit: number (default: 10)
  - offset: number (default: 0)
```

### Get Report Details
```http
GET /api/moderation/reports/:id
Headers: Authorization: Bearer <token>
```

### Take Moderation Action
```http
POST /api/moderation/reports/:id/action
Headers: Authorization: Bearer <token>
Body:
{
  "action": "remove",  // remove, warn, ban, approve
  "reason": "Violates community guidelines"
}
```

### Get Moderation Logs
```http
GET /api/moderation/logs
Headers: Authorization: Bearer <token>
Query Parameters:
  - moderatorId: string
  - userId: string
  - action: string
  - startDate: ISO date
  - endDate: ISO date
```

## 12. Performance & Metrics

```mermaid
graph TB
    subgraph "Key Metrics"
        M1[Reports Pending]
        M2[Average Resolution Time]
        M3[SLA Compliance Rate]
        M4[False Positive Rate]
        M5[Moderator Workload]
    end
    
    subgraph "Targets"
        T1[< 100 pending]
        T2[< 4 hours]
        T3[> 95%]
        T4[< 10%]
        T5[< 50 reports/day/mod]
    end
    
    M1 --> T1
    M2 --> T2
    M3 --> T3
    M4 --> T4
    M5 --> T5
    
    style T1 fill:#90EE90,stroke:#333,stroke-width:2px
    style T2 fill:#90EE90,stroke:#333,stroke-width:2px
    style T3 fill:#90EE90,stroke:#333,stroke-width:2px
```

## 13. Tài Liệu Liên Quan

- [00 - System Overview](./00-overview.md)
- [02 - Authentication Workflow](./02-authentication-workflow.md)
- [03 - Content Management Workflow](./03-content-workflow.md)
- [09 - Notification System](./09-notification-system.md)
- [10 - Database Schema](./10-database-schema.md)
