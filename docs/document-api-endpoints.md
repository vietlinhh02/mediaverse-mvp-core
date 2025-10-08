# Document API Endpoints

This document describes all the document-related endpoints available in the MediaCMS platform.

## Base URL
```
/api/content/documents
```

## Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Quick Reference - Available Endpoints

### Document Management
- `POST /api/content/documents` - Upload a new document ✅
- `GET /api/content/documents` - Get all public documents ✅
- `GET /api/content/documents/search` - Search documents ✅
- `GET /api/content/documents/:id` - Get document by ID ✅
- `PUT /api/content/documents/:id` - Update document metadata ✅
- `DELETE /api/content/documents/:id` - Delete document ✅
- `POST /api/content/documents/:id/publish` - Publish document ✅

### Document Access
- `GET /api/content/documents/:id/preview` - Preview document ✅
- `GET /api/content/documents/:id/download` - Download document file ✅
- `POST /api/content/documents/:id/download-link` - Generate temporary download link ✅

### Document Processing
- `GET /api/content/documents/:id/processing-status` - Get processing status ✅
- `POST /api/content/documents/:id/reprocess` - Reprocess document ✅
- `GET /api/content/documents/:id/extract-text` - Extract text from document ✅

### Filtering & Organization
- `GET /api/content/documents/category/:category` - Get documents by category ✅
- `GET /api/content/users/:userId/documents` - Get user's documents ✅
- `GET /api/content/folders/:folderId/documents` - Get documents in folder ✅

### Analytics & Stats
- `GET /api/content/documents/:id/stats` - Get document analytics ✅
- `GET /api/content/documents/:id/recommendations` - Get related documents ✅

### Bulk Operations
- `PUT /api/content/documents/bulk-update` - Bulk update documents ✅
- `PUT /api/content/documents/bulk-move` - Bulk move to folder ✅

### Folder Management
- `POST /api/content/folders` - Create folder ✅
- `GET /api/content/folders` - Get user's folders ✅

---

## Table of Contents
1. [Document Upload & Management](#document-upload--management)
2. [Get All Documents](#get-all-documents)
3. [Document Processing](#document-processing)
4. [Document Preview & Download](#document-preview--download)
5. [Document Search & Filtering](#document-search--filtering)
6. [Document Analytics](#document-analytics)
7. [Bulk Operations](#bulk-operations)
8. [Folder Management](#folder-management)
9. [Common Response Formats](#common-response-formats)
10. [Error Codes](#error-codes)

---

## Document Upload & Management

### 1. Upload Document
**POST** `/api/content/documents`

Upload a new document file.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: multipart/form-data

#### Request Body (Form Data)
```json
{
  "title": "string", // required, 3-200 characters
  "description": "string", // optional, max 2000 characters
  "category": "string", // required, valid category
  "tags": ["string"], // optional, max 10 tags
  "document": "file", // required, document file
  "visibility": "string", // public, private, unlisted (default: public)
  "allowComments": true, // boolean (default: true)
  "allowDownload": true, // boolean (default: true)
  "password": "string", // optional, password protection
  "expiresAt": "2025-12-31T23:59:59.000Z", // optional, expiration date
  "folderId": "string" // optional, folder to organize documents
}
```

#### Supported Document Formats
- **PDF**: Adobe PDF documents
- **Office Documents**: DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Text Documents**: TXT, RTF, MD
- **Images**: JPEG, PNG, GIF, BMP, TIFF, WEBP
- **Archives**: ZIP, RAR, 7Z, TAR
- **eBooks**: EPUB, MOBI
- **Maximum file size**: 100MB per document

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "category": "string",
    "tags": ["string"],
    "visibility": "public",
    "status": "processing",
    "allowComments": true,
    "allowDownload": true,
    "fileType": "pdf",
    "mimeType": "application/pdf",
    "fileSize": 2048000,
    "originalFilename": "document.pdf",
    "uploadProgress": 100,
    "processingProgress": 0,
    "authorId": "string",
    "folderId": "string",
    "createdAt": "2025-09-30T00:00:00.000Z",
    "author": {
      "id": "string",
      "username": "string",
      "profile": {
        "displayName": "string",
        "avatarUrl": "string"
      }
    },
    "processingStatus": {
      "stage": "extracting",
      "message": "Extracting text and generating preview",
      "estimatedTime": "2-5 minutes"
    }
  },
  "message": "Document uploaded successfully and queued for processing"
}
```

---

### 2. Get Document
**GET** `/api/content/documents/:id`

Get a specific document by its ID.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (optional): Bearer token (required for private documents)

#### Query Parameters
- `password` (string, optional): Password for password-protected documents

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "category": "string",
    "tags": ["string"],
    "visibility": "public",
    "status": "published",
    "allowComments": true,
    "allowDownload": true,
    "fileType": "pdf",
    "mimeType": "application/pdf",
    "fileSize": 2048000,
    "pageCount": 25,
    "hasPassword": false,
    "downloadUrl": "string",
    "previewUrl": "string",
    "thumbnailUrl": "string",
    "publishedAt": "2025-09-30T00:00:00.000Z",
    "expiresAt": null,
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
    "folder": {
      "id": "string",
      "name": "string"
    },
    "stats": {
      "views": 450,
      "downloads": 123,
      "likes": 28,
      "comments": 5
    },
    "metadata": {
      "wordCount": 5420,
      "language": "en",
      "extractedText": "First 500 characters of extracted text...",
      "author": "Document Author Name",
      "subject": "Document Subject",
      "keywords": ["keyword1", "keyword2"],
      "createdDate": "2025-09-25T10:30:00.000Z",
      "modifiedDate": "2025-09-28T14:20:00.000Z"
    }
  }
}
```

---

### 3. Update Document
**PUT** `/api/content/documents/:id`

Update document metadata.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "title": "string", // optional, 3-200 characters
  "description": "string", // optional, max 2000 characters
  "category": "string", // optional, valid category
  "tags": ["string"], // optional, max 10 tags
  "visibility": "string", // optional: public, private, unlisted
  "allowComments": true, // optional, boolean
  "allowDownload": true, // optional, boolean
  "password": "string", // optional, password protection
  "expiresAt": "2025-12-31T23:59:59.000Z", // optional, expiration date
  "folderId": "string" // optional, move to different folder
}
```

#### Response Format
Same as Get Document response.

---

### 4. Delete Document
**DELETE** `/api/content/documents/:id`

Delete a document and all its associated files.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## Get All Documents

### Get All Documents
**GET** `/api/content/documents`

Get a paginated list of all public documents.

#### Query Parameters
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `category` (string, optional): Filter by category
- `sortBy` (string, optional): Sort field - `recent`, `popular`, `title`, `size` (default: `recent`)

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "featuredImage": "string",
      "category": "string",
      "tags": ["string"],
      "views": 450,
      "likesCount": 28,
      "commentsCount": 5,
      "metadata": {
        "fileSize": 2048000,
        "pageCount": 25,
        "mimetype": "application/pdf",
        "extension": ".pdf",
        "processingStatus": "completed"
      },
      "createdAt": "2025-09-30T00:00:00.000Z",
      "publishedAt": "2025-09-30T00:00:00.000Z",
      "author": {
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
    "total": 150,
    "pages": 8
  }
}
```

#### Example Request
```bash
# Get all documents
GET /api/content/documents

# Get documents with pagination
GET /api/content/documents?page=2&limit=10

# Filter by category
GET /api/content/documents?category=education

# Sort by popularity
GET /api/content/documents?sortBy=popular
```

---

## Document Processing

### 1. Get Processing Status
**GET** `/api/content/documents/:id/processing-status`

Get the processing status of a document.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "status": "processing",
    "stage": "text_extraction",
    "progress": 65,
    "message": "Extracting text content",
    "estimatedTimeRemaining": "1 minute",
    "stages": [
      {
        "name": "upload",
        "status": "completed",
        "timestamp": "2025-09-30T10:00:00.000Z"
      },
      {
        "name": "virus_scan",
        "status": "completed",
        "timestamp": "2025-09-30T10:01:00.000Z"
      },
      {
        "name": "text_extraction",
        "status": "processing",
        "timestamp": "2025-09-30T10:02:00.000Z"
      },
      {
        "name": "preview_generation",
        "status": "pending",
        "timestamp": null
      },
      {
        "name": "indexing",
        "status": "pending",
        "timestamp": null
      }
    ]
  }
}
```

---

### 2. Reprocess Document
**POST** `/api/content/documents/:id/reprocess`

Reprocess a document (re-extract text, regenerate preview, etc.).

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (required): Bearer token

#### Request Body
```json
{
  "tasks": ["text_extraction", "preview", "indexing"], // optional, specific tasks
  "force": false // optional, force reprocessing even if already processed
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "processingJobId": "string",
    "estimatedTime": "3-5 minutes",
    "tasks": ["text_extraction", "preview", "indexing"]
  },
  "message": "Document queued for reprocessing"
}
```

---

### 3. Extract Text
**GET** `/api/content/documents/:id/extract-text`

Extract full text content from a document.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `format` (string, optional): Text format - `plain`, `html`, `markdown` (default: `plain`)
- `includeMetadata` (boolean, optional): Include document metadata (default: false)

#### Response Format
```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "text": "Full extracted text content...",
    "format": "plain",
    "wordCount": 5420,
    "characterCount": 32850,
    "language": "en",
    "confidence": 0.95,
    "extractedAt": "2025-09-30T10:05:00.000Z",
    "metadata": {
      "pageCount": 25,
      "hasImages": true,
      "hasTables": true,
      "hasFormFields": false
    }
  }
}
```

---

## Document Preview & Download

### 1. Get Document Preview
**GET** `/api/content/documents/:id/preview`

Get a preview of the document (images of pages or embedded viewer).

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (optional): Bearer token (required for private documents)

#### Query Parameters
- `page` (number, optional): Specific page number for PDF documents (default: 1)
- `format` (string, optional): Preview format - `text`, `html` (default: `text`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "title": "string",
    "description": "string",
    "pageCount": 25,
    "currentPage": 1,
    "textContent": "Full extracted text content...",
    "previewText": "First 500 characters...",
    "thumbnailUrl": "string",
    "format": "text",
    "canDownload": true
  }
}
```

#### Example Request
```bash
# Get preview of first page
GET /api/content/documents/{id}/preview

# Get preview of specific page
GET /api/content/documents/{id}/preview?page=5

# Get HTML formatted preview
GET /api/content/documents/{id}/preview?format=html
```

---

### 2. Download Document
**GET** `/api/content/documents/:id/download`

Download the original document file.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (required): Bearer token

#### Response
- Direct file download with appropriate headers
- `Content-Type`: Based on document type
- `Content-Disposition`: attachment; filename="document-name.pdf"
- File stream (binary data)

#### Example Request
```bash
# Download document
GET /api/content/documents/{id}/download
Authorization: Bearer <token>
```

#### Success Response
- HTTP 200 OK
- File stream is returned directly
- Headers include:
  - `Content-Type`: application/pdf (or appropriate mime type)
  - `Content-Disposition`: attachment; filename="document.pdf"

#### Error Response (if download not allowed)
```json
{
  "error": "Download not allowed",
  "code": "DOWNLOAD_FORBIDDEN",
  "message": "The document author has disabled downloads"
}
```

---

### 3. Generate Download Link
**POST** `/api/content/documents/:id/download-link`

Generate a temporary download link for the document.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (required): Bearer token

#### Request Body
```json
{
  "expiresIn": 3600, // optional, link expiration in seconds (default: 1 hour)
  "password": "string", // optional, password for password-protected documents
  "maxDownloads": 5 // optional, maximum number of downloads allowed
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "downloadUrl": "string",
    "token": "string",
    "expiresAt": "2025-09-30T11:00:00.000Z",
    "maxDownloads": 5,
    "remainingDownloads": 5
  },
  "message": "Download link generated successfully"
}
```

---

## Document Search & Filtering

### 1. Search Documents
**GET** `/api/content/documents/search`

Search documents by title, content, or tags using MeiliSearch.

#### Query Parameters
- `q` (string, optional): Search query (if empty, returns all documents)
- `limit` (number, optional): Items per page (default: 20, min: 1, max: 50)
- `offset` (number, optional): Offset for pagination (default: 0)
- `sortBy` (string, optional): Sort field - `relevance`, `recent`, `popular`, `size` (default: `relevance`)
- `category` (string, optional): Filter by category (can be combined with search)

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "tags": ["string"],
      "contentType": "document",
      "views": 250,
      "likesCount": 45,
      "commentsCount": 12,
      "createdAt": "2025-09-30T00:00:00.000Z",
      "author": {
        "username": "string",
        "displayName": "string",
        "avatarUrl": "string"
      },
      "_rankingScore": 0.95
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45,
    "estimatedTotalHits": 45
  }
}
```

#### Example Requests
```bash
# Search for documents
GET /api/content/documents/search?q=project report

# Search with filters
GET /api/content/documents/search?q=pdf&category=education&sortBy=popular

# Get all documents (no search query)
GET /api/content/documents/search?limit=20&offset=0

# Pagination
GET /api/content/documents/search?q=tutorial&limit=10&offset=20
```

---

### 2. Get Documents by Category
**GET** `/api/content/documents/category/:category`

Get documents filtered by specific category.

#### Parameters
- **Path Parameters:**
  - `category` (string, required): Category name

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort field - `recent`, `popular`, `size` (default: `recent`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "category": "reports",
    "documents": [
      // Document objects
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 3. Get Documents by Folder
**GET** `/api/content/folders/:folderId/documents`

Get documents in a specific folder.

#### Parameters
- **Path Parameters:**
  - `folderId` (string, required): Folder ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort field - `name`, `recent`, `size` (default: `name`)

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "folder": {
      "id": "string",
      "name": "string",
      "path": "Projects/Reports"
    },
    "documents": [
      // Document objects
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

### 4. Get User's Documents
**GET** `/api/content/users/:userId/documents`

Get documents by specific user.

#### Parameters
- **Path Parameters:**
  - `userId` (string, required): User ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Filter by status - `published`, `processing`, `draft`, `all` (default: `published`)

#### Headers
- `Authorization` (optional): Bearer token (required for private documents)

#### Response Format
```json
{
  "success": true,
  "data": {
    "documents": [
      // Document objects
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

## Document Analytics

### 1. Get Document Stats
**GET** `/api/content/documents/:id/stats`

Get detailed analytics for a document.

#### Parameters
- **Path Parameters:**
  - `id` (string, required): Document ID

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `period` (string, optional): Time period - `7d`, `30d`, `90d`, `1y` (default: `30d`)

#### Response Format
```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "period": "30d",
    "stats": {
      "views": {
        "total": 1250,
        "unique": 980,
        "growth": 15.2,
        "daily": [
          {"date": "2025-09-01", "views": 45},
          {"date": "2025-09-02", "views": 52}
        ]
      },
      "downloads": {
        "total": 320,
        "unique": 285,
        "growth": 8.5,
        "daily": [
          {"date": "2025-09-01", "downloads": 12},
          {"date": "2025-09-02", "downloads": 15}
        ]
      },
      "engagement": {
        "likes": 28,
        "comments": 5,
        "shares": 12,
        "averageViewTime": 5.5,
        "completionRate": 65.8
      },
      "traffic": {
        "sources": {
          "direct": 45,
          "search": 30,
          "social": 15,
          "referral": 10
        },
        "devices": {
          "desktop": 70,
          "mobile": 25,
          "tablet": 5
        },
        "locations": [
          {"country": "US", "views": 450},
          {"country": "UK", "views": 320}
        ]
      },
      "preview": {
        "pageViews": {
          "page1": 1250,
          "page2": 890,
          "page3": 650
        },
        "averagePagesViewed": 3.2,
        "bounceRate": 25.5
      }
    }
  }
}
```

---

## Folder Management

### 1. Create Folder
**POST** `/api/content/folders`

Create a new folder for organizing documents.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "name": "string", // required, 1-100 characters
  "description": "string", // optional, max 500 characters
  "parentId": "string", // optional, parent folder ID
  "visibility": "private" // private, shared (default: private)
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "path": "Projects/Reports",
    "visibility": "private",
    "parentId": "string",
    "authorId": "string",
    "documentCount": 0,
    "createdAt": "2025-09-30T00:00:00.000Z",
    "updatedAt": "2025-09-30T00:00:00.000Z"
  },
  "message": "Folder created successfully"
}
```

---

### 2. Get Folders
**GET** `/api/content/folders`

Get user's folders.

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `parentId` (string, optional): Parent folder ID (null for root folders)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

#### Response Format
```json
{
  "success": true,
  "data": {
    "folders": [
      {
        "id": "string",
        "name": "string",
        "path": "string",
        "documentCount": 15,
        "createdAt": "2025-09-30T00:00:00.000Z"
      }
    ],
    "pagination": {
      // Pagination object
    }
  }
}
```

---

## Folder Management

### 1. Create Folder
**POST** `/api/content/folders`

Create a new folder for organizing documents.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "name": "string", // required, 1-100 characters
  "description": "string", // optional, max 500 characters
  "parentId": "string", // optional, parent folder ID
  "visibility": "private" // private, shared (default: private)
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "path": "Projects/Reports",
    "visibility": "private",
    "parentId": "string",
    "authorId": "string",
    "documentCount": 0,
    "createdAt": "2025-09-30T00:00:00.000Z",
    "updatedAt": "2025-09-30T00:00:00.000Z"
  },
  "message": "Folder created successfully"
}
```

---

### 2. Get Folders
**GET** `/api/content/folders`

Get user's folders.

#### Headers
- `Authorization` (required): Bearer token

#### Query Parameters
- `parentId` (string, optional): Parent folder ID (null for root folders)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

#### Response Format
```json
{
  "success": true,
  "data": {
    "folders": [
      {
        "id": "string",
        "name": "string",
        "path": "string",
        "documentCount": 15,
        "createdAt": "2025-09-30T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### 3. Get Documents in Folder
**GET** `/api/content/folders/:folderId/documents`

Get documents in a specific folder.

#### Parameters
- **Path Parameters:**
  - `folderId` (string, required): Folder ID

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort field - `name`, `recent`, `size` (default: `name`)

#### Headers
- `Authorization` (required): Bearer token

#### Response Format
```json
{
  "success": true,
  "data": {
    "folder": {
      "id": "string",
      "name": "string",
      "path": "Projects/Reports"
    },
    "documents": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "category": "string",
        "metadata": {
          "fileSize": 2048000,
          "pageCount": 25
        },
        "createdAt": "2025-09-30T00:00:00.000Z",
        "author": {
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
      "total": 15,
      "pages": 1
    }
  }
}
```

---

## Bulk Operations

### 1. Bulk Update Documents
**PUT** `/api/content/documents/bulk-update`

Update multiple documents at once.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "documentIds": ["id1", "id2", "id3"],
  "updates": {
    "category": "reports",
    "tags": ["updated", "bulk"],
    "visibility": "public",
    "folderId": "folder-id"
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
        "message": "Document updated successfully"
      }
    ]
  },
  "message": "Bulk update completed"
}
```

---

### 2. Bulk Move Documents
**PUT** `/api/content/documents/bulk-move`

Move multiple documents to a folder.

#### Headers
- `Authorization` (required): Bearer token
- `Content-Type`: application/json

#### Request Body
```json
{
  "documentIds": ["id1", "id2", "id3"],
  "targetFolderId": "folder-id" // null to move to root
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "moved": 3,
    "failed": 0,
    "targetFolder": {
      "id": "folder-id",
      "name": "Target Folder",
      "path": "Projects/Reports"
    }
  },
  "message": "Documents moved successfully"
}
```

---

## Testing Guide

### Using cURL

#### 1. Upload a Document
```bash
curl -X POST http://localhost:3001/api/content/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@/path/to/file.pdf" \
  -F "title=My Document" \
  -F "description=Document description" \
  -F "category=education" \
  -F "tags=[\"tutorial\",\"pdf\"]" \
  -F "visibility=public"
```

#### 2. Get All Documents
```bash
curl -X GET http://localhost:3001/api/content/documents?page=1&limit=10
```

#### 3. Search Documents
```bash
curl -X GET "http://localhost:3001/api/content/documents/search?q=tutorial&category=education"
```

#### 4. Preview Document
```bash
curl -X GET http://localhost:3001/api/content/documents/{DOCUMENT_ID}/preview?page=1
```

#### 5. Download Document
```bash
curl -X GET http://localhost:3001/api/content/documents/{DOCUMENT_ID}/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded-file.pdf
```

#### 6. Check Processing Status
```bash
curl -X GET http://localhost:3001/api/content/documents/{DOCUMENT_ID}/processing-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman

1. **Import Collection**: Create a new collection in Postman
2. **Set Base URL**: `http://localhost:3001/api/content`
3. **Add Bearer Token**: In Authorization tab, select "Bearer Token" and paste your token
4. **Test Endpoints**: Follow the examples above

### Using JavaScript Fetch

#### Upload Document
```javascript
const uploadDocument = async (file, metadata, token) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('title', metadata.title);
  formData.append('description', metadata.description);
  formData.append('category', metadata.category);
  formData.append('tags', JSON.stringify(metadata.tags));
  formData.append('visibility', metadata.visibility || 'public');

  const response = await fetch('http://localhost:3001/api/content/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};

// Usage
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

const result = await uploadDocument(file, {
  title: 'My Document',
  description: 'Document description',
  category: 'education',
  tags: ['tutorial', 'pdf']
}, 'YOUR_TOKEN');

console.log(result);
```

#### Get All Documents
```javascript
const getAllDocuments = async (page = 1, limit = 20) => {
  const response = await fetch(
    `http://localhost:3001/api/content/documents?page=${page}&limit=${limit}`
  );
  return response.json();
};

// Usage
const documents = await getAllDocuments(1, 10);
console.log(documents);
```

#### Search Documents
```javascript
const searchDocuments = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    ...filters
  });

  const response = await fetch(
    `http://localhost:3001/api/content/documents/search?${params}`
  );
  return response.json();
};

// Usage
const results = await searchDocuments('tutorial', {
  category: 'education',
  sortBy: 'popular',
  limit: 20
});
console.log(results);
```

#### Download Document
```javascript
const downloadDocument = async (documentId, token) => {
  const response = await fetch(
    `http://localhost:3001/api/content/documents/${documentId}/download`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : 'document.pdf';
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
};

// Usage
await downloadDocument('document-id-here', 'YOUR_TOKEN');
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

## Document Processing Workflow

### Upload to Completion Flow

```
1. User uploads document
   POST /api/content/documents
   ↓
2. Server receives file
   - Validates file type and size
   - Stores file in uploads/documents/
   - Creates database entry
   ↓
3. Document queued for processing
   - Status: "draft"
   - processingStatus: "queued"
   ↓
4. Worker processes document
   - Status: "draft"
   - processingStatus: "processing"
   - Extracts text content (for PDFs)
   - Counts pages
   - Extracts metadata
   ↓
5. Processing completed
   - Status: "draft"
   - processingStatus: "completed"
   - Text content available
   ↓
6. User publishes document
   POST /api/content/documents/:id/publish
   - Status: "published"
   - Document now visible to public
```

### Checking Processing Status

```javascript
// Poll for processing status
const checkProcessingStatus = async (documentId, token) => {
  const response = await fetch(
    `http://localhost:3001/api/content/documents/${documentId}/processing-status`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  return data.data;
};

// Poll every 2 seconds
const pollStatus = async (documentId, token) => {
  const interval = setInterval(async () => {
    const status = await checkProcessingStatus(documentId, token);
    
    console.log('Processing status:', status.processingStatus);
    
    if (status.processingStatus === 'completed') {
      console.log('✅ Processing completed!');
      clearInterval(interval);
    } else if (status.processingStatus === 'failed') {
      console.log('❌ Processing failed!');
      clearInterval(interval);
    }
  }, 2000);
};
```

### Processing States

| State | Description | Can Download | Can View |
|-------|-------------|--------------|----------|
| `queued` | Document waiting to be processed | ❌ | ❌ |
| `processing` | Document currently being processed | ❌ | ❌ |
| `completed` | Processing finished successfully | ✅ | ✅ |
| `failed` | Processing failed with error | ❌ | Limited |

---

## Error Codes

### Upload Errors
- `FILE_TOO_LARGE`: 400 - Document file exceeds maximum size (100MB)
- `INVALID_FILE_FORMAT`: 400 - Unsupported document format
- `UPLOAD_FAILED`: 500 - Document upload failed
- `VIRUS_DETECTED`: 400 - Document contains malicious content

### Document Errors
- `DOCUMENT_NOT_FOUND`: 404 - Document not found
- `DOCUMENT_NOT_READY`: 400 - Document is still processing
- `DOCUMENT_EXPIRED`: 410 - Document has expired
- `DOCUMENT_PASSWORD_REQUIRED`: 401 - Password required for protected document
- `DOCUMENT_PASSWORD_INCORRECT`: 401 - Incorrect password

### Processing Errors
- `PROCESSING_FAILED`: 500 - Document processing failed
- `TEXT_EXTRACTION_FAILED`: 500 - Failed to extract text content
- `PREVIEW_GENERATION_FAILED`: 500 - Failed to generate preview

### Permission Errors
- `NOT_DOCUMENT_OWNER`: 403 - Not the document owner
- `DOCUMENT_PRIVATE`: 403 - Document is private
- `DOWNLOAD_FORBIDDEN`: 403 - Download not allowed
- `FOLDER_ACCESS_DENIED`: 403 - No access to folder

---

## Best Practices

### 1. File Upload Optimization

#### Client-Side Validation
```javascript
const validateDocumentFile = (file) => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (file.size > maxSize) {
    throw new Error('File too large (max 100MB)');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  return true;
};
```

#### Upload Progress Tracking
```javascript
const uploadWithProgress = (file, metadata, token, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    formData.append('document', file);
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.statusText));
      }
    });

    xhr.open('POST', 'http://localhost:3001/api/content/documents');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

// Usage
await uploadWithProgress(file, metadata, token, (progress) => {
  console.log(`Upload progress: ${progress.toFixed(2)}%`);
});
```

### 2. Efficient Document Listing

#### Use Pagination
```javascript
// Bad: Loading all documents at once
const documents = await fetch('/api/content/documents?limit=1000');

// Good: Use pagination
const getDocumentsPage = async (page = 1, limit = 20) => {
  const response = await fetch(
    `/api/content/documents?page=${page}&limit=${limit}`
  );
  return response.json();
};
```

#### Implement Infinite Scroll
```javascript
let currentPage = 1;
const loadMoreDocuments = async () => {
  const { data, pagination } = await getDocumentsPage(currentPage);
  
  // Append documents to UI
  displayDocuments(data);
  
  if (currentPage < pagination.pages) {
    currentPage++;
  }
};

// Load more on scroll
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    loadMoreDocuments();
  }
});
```

### 3. Search Optimization

#### Debounce Search Input
```javascript
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

const searchInput = document.getElementById('search');
const debouncedSearch = debounce(async (query) => {
  const results = await searchDocuments(query);
  displayResults(results);
}, 300);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

#### Cache Search Results
```javascript
const searchCache = new Map();

const searchWithCache = async (query, filters) => {
  const cacheKey = JSON.stringify({ query, filters });
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  
  const results = await searchDocuments(query, filters);
  searchCache.set(cacheKey, results);
  
  // Clear cache after 5 minutes
  setTimeout(() => searchCache.delete(cacheKey), 5 * 60 * 1000);
  
  return results;
};
```

### 4. Error Handling

#### Comprehensive Error Handler
```javascript
const handleDocumentError = (error) => {
  const errorMap = {
    'FILE_TOO_LARGE': 'File size exceeds 100MB limit',
    'INVALID_FILE_FORMAT': 'Please upload a valid document file',
    'DOCUMENT_NOT_FOUND': 'Document not found',
    'UNAUTHORIZED': 'You do not have permission to access this document',
    'PROCESSING_FAILED': 'Document processing failed. Please try again.',
  };

  const message = errorMap[error.code] || error.message || 'An error occurred';
  
  // Show user-friendly error
  showNotification(message, 'error');
  
  // Log detailed error for debugging
  console.error('Document operation failed:', error);
};

// Usage
try {
  await uploadDocument(file, metadata, token);
} catch (error) {
  handleDocumentError(error);
}
```

### 5. Performance Tips

- ✅ **Use search instead of filtering**: Search API is optimized with MeiliSearch
- ✅ **Implement pagination**: Don't load all documents at once
- ✅ **Cache frequently accessed data**: Reduce API calls
- ✅ **Validate files client-side**: Save bandwidth and server resources
- ✅ **Show upload progress**: Better user experience
- ✅ **Handle errors gracefully**: Show user-friendly messages
- ✅ **Use appropriate page sizes**: 20-50 items per page
- ✅ **Debounce search input**: Reduce unnecessary API calls

---

## JavaScript Examples

### Upload Document with Progress
```javascript
const uploadDocument = async (documentFile, metadata, onProgress) => {
  const formData = new FormData();
  
  // Add document file
  formData.append('document', documentFile);
  
  // Add metadata
  Object.keys(metadata).forEach(key => {
    if (metadata[key] !== undefined) {
      if (Array.isArray(metadata[key])) {
        formData.append(key, JSON.stringify(metadata[key]));
      } else {
        formData.append(key, metadata[key]);
      }
    }
  });
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress?.(percentComplete);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.open('POST', '/api/content/documents');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};
```

### Document Viewer Component
```javascript
class DocumentViewer {
  constructor(containerId, documentId) {
    this.container = document.getElementById(containerId);
    this.documentId = documentId;
    this.currentPage = 1;
    this.totalPages = 1;
  }

  async initialize() {
    try {
      const response = await fetch(`/api/content/documents/${this.documentId}`);
      const data = await response.json();
      
      if (data.success) {
        this.setupViewer(data.data);
      }
    } catch (error) {
      console.error('Failed to initialize document viewer:', error);
    }
  }

  async setupViewer(document) {
    this.totalPages = document.pageCount || 1;
    
    // Create viewer container
    const viewerDiv = document.createElement('div');
    viewerDiv.className = 'document-viewer';
    
    // Add toolbar
    const toolbar = this.createToolbar(document);
    viewerDiv.appendChild(toolbar);
    
    // Add content area
    const contentArea = document.createElement('div');
    contentArea.className = 'document-content';
    contentArea.id = 'document-content';
    viewerDiv.appendChild(contentArea);
    
    this.container.appendChild(viewerDiv);
    
    // Load preview
    await this.loadPreview();
  }

  createToolbar(document) {
    const toolbar = document.createElement('div');
    toolbar.className = 'document-toolbar';
    
    // Page navigation (for multi-page documents)
    if (document.pageCount > 1) {
      const pageNav = document.createElement('div');
      pageNav.className = 'page-navigation';
      
      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'Previous';
      prevBtn.onclick = () => this.previousPage();
      
      const pageInfo = document.createElement('span');
      pageInfo.id = 'page-info';
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
      
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next';
      nextBtn.onclick = () => this.nextPage();
      
      pageNav.appendChild(prevBtn);
      pageNav.appendChild(pageInfo);
      pageNav.appendChild(nextBtn);
      toolbar.appendChild(pageNav);
    }
    
    // Download button
    if (document.allowDownload) {
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download';
      downloadBtn.onclick = () => this.downloadDocument();
      toolbar.appendChild(downloadBtn);
    }
    
    return toolbar;
  }

  async loadPreview() {
    try {
      const response = await fetch(
        `/api/content/documents/${this.documentId}/preview?page=${this.currentPage}`
      );
      const data = await response.json();
      
      if (data.success) {
        const contentArea = document.getElementById('document-content');
        
        if (data.data.previewType === 'image') {
          const img = document.createElement('img');
          img.src = data.data.previewUrl;
          img.alt = `Page ${this.currentPage}`;
          img.style.width = '100%';
          img.style.height = 'auto';
          
          contentArea.innerHTML = '';
          contentArea.appendChild(img);
        } else if (data.data.embedUrl) {
          const iframe = document.createElement('iframe');
          iframe.src = data.data.embedUrl;
          iframe.style.width = '100%';
          iframe.style.height = '600px';
          iframe.style.border = 'none';
          
          contentArea.innerHTML = '';
          contentArea.appendChild(iframe);
        }
        
        this.updatePageInfo();
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadPreview();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.loadPreview();
    }
  }

  updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }
  }

  async downloadDocument() {
    try {
      const response = await fetch(`/api/content/documents/${this.documentId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'document';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  }
}

// Usage
const viewer = new DocumentViewer('document-container', 'document-id');
viewer.initialize();
```

### Search Documents
```javascript
const searchDocuments = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    ...filters
  });
  
  try {
    const response = await fetch(`/api/content/documents/search?${params}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
};

// Usage
searchDocuments('project report', {
  category: 'reports',
  fileType: 'pdf',
  sortBy: 'recent'
}).then(results => {
  console.log('Search results:', results);
});
```

This documentation provides comprehensive information for frontend developers to integrate with the MediaCMS document management system.