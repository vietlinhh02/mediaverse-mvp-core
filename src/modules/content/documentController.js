/**
 * @swagger
 * tags:
 *   - name: Content
 *     description: Content creation, management, and interaction endpoints
 *   - name: Documents
 *     description: Document-specific endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       required:
 *         - title
 *         - documentUrl
 *       properties:
 *         id:
 *           type: string
 *           description: Document unique identifier
 *         title:
 *           type: string
 *           description: Document title
 *         description:
 *           type: string
 *           description: Document description
 *         documentUrl:
 *           type: string
 *           format: uri
 *           description: Document file URL
 *         previewUrl:
 *           type: string
 *           format: uri
 *           description: Document preview URL
 *         category:
 *           type: string
 *           description: Document category
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Document tags
 *         status:
 *           type: string
 *           enum: [draft, published, scheduled, failed]
 *           description: Document status
 *         visibility:
 *           type: string
 *           enum: [public, private, unlisted]
 *           description: Document visibility
 *         fileSize:
 *           type: number
 *           description: Document file size in bytes
 *         extension:
 *           type: string
 *           description: File extension
 *         pageCount:
 *           type: number
 *           description: Number of pages in document
 *         channelId:
 *           type: string
 *           description: Associated channel ID
 *         authorId:
 *           type: string
 *           description: Author user ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         publishedAt:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 *           description: Additional document metadata
 *       example:
 *         id: "doc_123"
 *         title: "React Development Guide"
 *         description: "Comprehensive guide to React development"
 *         documentUrl: "https://example.com/document.pdf"
 *         previewUrl: "https://example.com/preview.pdf"
 *         category: "programming"
 *         tags: ["react", "javascript", "guide"]
 *         status: "published"
 *         visibility: "public"
 *         fileSize: 2048000
 *         extension: "pdf"
 *         pageCount: 150
 */

// Document controller for managing PDF and document uploads
const path = require('path');
const ContentService = require('./contentService');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { authenticateToken, requireActiveUser } = require('../../middleware/auth');
const { uploadMiddleware, validateUploadedFile, handleUploadError } = require('../../middleware/upload');
const { queue } = require('../../config/redis');
const fs = require('fs').promises;
const searchService = require('../../services/searchService'); // Import the search service

class DocumentController {
  /**
   * @swagger
   * /api/content/documents:
   *   post:
   *     summary: Upload a new document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - document
   *               - title
   *             properties:
   *               document:
   *                 type: string
   *                 format: binary
   *                 description: Document file to upload
   *               title:
   *                 type: string
   *                 description: Document title
   *               description:
   *                 type: string
   *                 description: Document description
   *               category:
   *                 type: string
   *                 description: Document category
   *               tags:
   *                 type: string
   *                 description: Document tags (comma-separated)
   *               channelId:
   *                 type: string
   *                 description: Channel ID to publish in
   *               visibility:
   *                 type: string
   *                 enum: [public, private, unlisted]
   *                 default: public
   *                 description: Document visibility
   *             example:
   *               title: "React Development Guide"
   *               description: "Comprehensive guide to React development"
   *               category: "programming"
   *               tags: "react,javascript,guide"
   *               channelId: "ch_123"
   *               visibility: "public"
   *     responses:
   *       201:
   *         description: Document uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Document uploaded successfully. Processing will begin shortly."
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "doc_123"
   *                     title:
   *                       type: string
   *                       example: "React Development Guide"
   *                     status:
   *                       type: string
   *                       example: "draft"
   *                     processingStatus:
   *                       type: string
   *                       example: "queued"
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static uploadDocument = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { channelId } = req.body;

    // Validate channel ownership if channelId is provided
    if (channelId && channelId.trim() !== '') {
      const channel = await require('../../config/database').prisma.channel.findUnique({
        where: { id: channelId }
      });
      if (!channel) {
        throw new AppError('Channel not found', 404, 'CHANNEL_NOT_FOUND');
      }
      if (channel.ownerId !== userId) {
        throw new AppError('Unauthorized to create content in this channel', 403, 'UNAUTHORIZED');
      }
    }

    // Check if file was uploaded
    if (!req.file) {
      throw new AppError('No document file uploaded', 400, 'NO_FILE_UPLOADED');
    }

    const documentFile = req.file;

    // Basic document metadata
    const documentData = {
      ...req.body,
      fileSize: documentFile.size,
      documentUrl: `/uploads/documents/${documentFile.filename}`,
      filename: documentFile.filename,
      originalName: documentFile.originalname,
      mimetype: documentFile.mimetype,
      uploadPath: documentFile.path,
      extension: path.extname(documentFile.originalname).toLowerCase()
    };

    // Create document record in database
    const document = await ContentService.createDocument(userId, documentData, channelId);

    // Queue document processing job
    await DocumentController.queueDocumentProcessing(document.id, documentFile);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. Processing will begin shortly.',
      data: {
        id: document.id,
        title: document.title,
        status: document.status,
        processingStatus: 'queued'
      }
    });
  });

  // Queue document processing
  static async queueDocumentProcessing(documentId, documentFile) {
    try {
      const processingJob = {
        documentId,
        filePath: documentFile.path,
        filename: documentFile.filename,
        originalName: documentFile.originalname,
        mimetype: documentFile.mimetype,
        fileSize: documentFile.size,
        extension: path.extname(documentFile.originalname).toLowerCase(),
        jobType: 'document_processing'
      };

      await queue.push('document-processing', processingJob, 0);

      console.log(`Document processing queued for document ID: ${documentId}`);
    } catch (error) {
      console.error('Error queuing document processing:', error);

      // Update document status to failed
      await ContentService.updateContent(documentId, {
        status: 'failed',
        metadata: {
          error: 'Failed to queue processing job'
        }
      });
    }
  }

  // Get document by ID
  /**
   * @swagger
   * /api/content/documents/{id}:
   *   get:
   *     summary: Get document by ID
   *     tags: [Documents]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Document ID
   *     responses:
   *       200:
   *         description: Document retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Document'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static getDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const document = await ContentService.getContent(id);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    res.json({
      success: true,
      data: document
    });
  });

  // Update document
  /**
   * @swagger
   * /api/content/documents/{id}:
   *   put:
   *     summary: Update a document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Document ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 description: Document title
   *               description:
   *                 type: string
   *                 description: Document description
   *               category:
   *                 type: string
   *                 description: Document category
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Document tags
   *               visibility:
   *                 type: string
   *                 enum: [public, private, unlisted]
   *                 description: Document visibility
   *             example:
   *               title: "Updated React Guide"
   *               description: "Updated version with new content"
   *               category: "programming"
   *               tags: ["react", "javascript", "guide", "updated"]
   *               visibility: "public"
   *     responses:
   *       200:
   *         description: Document updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Document updated successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Document'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static updateDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const updatedDocument = await ContentService.updateContent(id, req.body, userId);

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: updatedDocument
    });
  });

  // Delete document
  /**
   * @swagger
   * /api/content/documents/{id}:
   *   delete:
   *     summary: Delete a document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Document ID
   *     responses:
   *       200:
   *         description: Document deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Document deleted successfully"
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static deleteDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    await ContentService.deleteContent(id, userId);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  });

  // Publish document
  /**
   * @swagger
   * /api/content/documents/{id}/publish:
   *   post:
   *     summary: Publish a document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Document ID
   *     responses:
   *       200:
   *         description: Document published successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Document published successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Document'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static publishDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const publishedDocument = await ContentService.publishContent(id, userId);

    res.json({
      success: true,
      message: 'Document published successfully',
      data: publishedDocument
    });
  });

  // Get user's documents
  static getUserDocuments = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20, status = 'published' } = req.query;

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      require('../../config/database').prisma.content.findMany({
        where: {
          type: 'document',
          authorId: userId,
          status: status === 'all' ? undefined : status
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          channel: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      require('../../config/database').prisma.content.count({
        where: {
          type: 'document',
          authorId: userId,
          status: status === 'all' ? undefined : status
        }
      })
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  });

  // Search documents
  static searchDocuments = asyncHandler(async (req, res) => {
    const {
      q, limit = 20, offset = 0, sortBy = 'relevance'
    } = req.query;

    const { mapSortByToMeiliSearch } = require('../../utils/searchHelpers');

    // Combine existing filters from query with our mandatory filter
    const existingFilters = req.query.filters ? `${req.query.filters} AND ` : '';
    const filters = `${existingFilters}contentType = document`;

    // Map sortBy to MeiliSearch format
    const sort = mapSortByToMeiliSearch(sortBy);

    const searchResults = await searchService.search('content', q || '*', {
      limit: parseInt(limit),
      offset: parseInt(offset),
      filters,
      sort
    });

    // Remove 'document-' prefix from id to match database UUID format
    const transformedHits = searchResults.hits.map(hit => ({
      ...hit,
      id: hit.id.replace(/^document-/, '')
    }));

    res.json({
      success: true,
      data: transformedHits,
      pagination: {
        limit: searchResults.limit,
        offset: searchResults.offset,
        total: searchResults.estimatedTotalHits,
        hasMore: (searchResults.offset + searchResults.hits.length) < searchResults.estimatedTotalHits
      }
    });
  });

  // Get documents by category
  static getDocumentsByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await ContentService.getContentByCategory(category, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      ...result
    });
  });

  // Get document processing status
  static getDocumentProcessingStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    const status = {
      documentId: document.id,
      status: document.status,
      processingStatus: document.status === 'draft' ? 'processing'
        : document.status === 'published' ? 'completed'
          : document.status === 'failed' ? 'failed' : 'unknown',
      metadata: document.metadata,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };

    res.json({
      success: true,
      data: status
    });
  });

  // Get document preview
  static getDocumentPreview = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check if user has access to this document
    if (document.visibility === 'private' && document.author.id !== req.user?.userId) {
      const user = await require('../../config/database').prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true }
      });

      if (!user || !['admin', 'moderator'].includes(user.role)) {
        throw new AppError('Unauthorized to view this document', 403, 'UNAUTHORIZED');
      }
    }

    const previewData = {
      documentId: document.id,
      title: document.title,
      description: document.description,
      pageCount: document.metadata?.pageCount || 0,
      textContent: document.metadata?.textContent || null,
      previewText: document.metadata?.previewText || null,
      thumbnailUrl: document.metadata?.thumbnailUrl || null,
      canDownload: document.visibility === 'public'
                   || document.author.id === req.user?.userId
                   || (req.user?.role && ['admin', 'moderator'].includes(req.user.role))
    };

    res.json({
      success: true,
      data: previewData
    });
  });

  // Download document
  static downloadDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check if user has access to download
    if (document.visibility === 'private' && document.author.id !== req.user?.userId) {
      const user = await require('../../config/database').prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true }
      });

      if (!user || !['admin', 'moderator'].includes(user.role)) {
        throw new AppError('Unauthorized to download this document', 403, 'UNAUTHORIZED');
      }
    }

    // In a real implementation, this would serve the actual file
    // For now, return document info
    res.json({
      success: true,
      data: {
        documentId: document.id,
        title: document.title,
        downloadUrl: document.metadata?.documentUrl || null,
        filename: document.metadata?.originalName || document.title,
        fileSize: document.metadata?.fileSize || 0,
        mimetype: document.metadata?.mimetype || 'application/octet-stream'
      }
    });
  });

  // Reprocess document (admin/moderator only)
  static reprocessDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user is admin or moderator
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to reprocess documents', 403, 'UNAUTHORIZED');
    }

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    // Reset document status to draft and clear metadata
    const updatedDocument = await ContentService.updateContent(id, {
      status: 'draft',
      metadata: {
        ...document.metadata,
        error: null,
        pageCount: 0,
        textContent: null,
        previewText: null
      }
    });

    // Queue for reprocessing if file exists
    if (document.metadata?.uploadPath) {
      const documentFile = {
        path: document.metadata.uploadPath,
        filename: document.metadata.filename,
        originalname: document.metadata.originalName,
        mimetype: document.metadata.mimetype,
        size: document.metadata.fileSize,
        extension: document.metadata.extension
      };

      await DocumentController.queueDocumentProcessing(id, documentFile);
    }

    res.json({
      success: true,
      message: 'Document queued for reprocessing',
      data: updatedDocument
    });
  });

  // Get document statistics
  static getDocumentStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check if user is the author or admin/moderator
    const canViewStats = document.author.id === userId
      || (req.user.role && ['admin', 'moderator'].includes(req.user.role));

    if (!canViewStats) {
      throw new AppError('Unauthorized to view document statistics', 403, 'UNAUTHORIZED');
    }

    const stats = {
      views: document.stats?.views || 0,
      likes: document._count?.likes || 0,
      comments: document._count?.comments || 0,
      pageCount: document.metadata?.pageCount || 0,
      fileSize: document.metadata?.fileSize || 0,
      processingStatus: document.status === 'draft' ? 'processing'
        : document.status === 'published' ? 'completed'
          : document.status === 'failed' ? 'failed' : 'unknown',
      engagementRate: 0
    };

    // Calculate engagement rate
    if (stats.views > 0) {
      stats.engagementRate = ((stats.likes + stats.comments) / stats.views * 100).toFixed(2);
    }

    res.json({
      success: true,
      data: stats
    });
  });

  // Bulk update documents status
  static bulkUpdateDocuments = asyncHandler(async (req, res) => {
    const { documentIds, status, visibility } = req.body;
    const { userId } = req.user;

    // Check if user is admin or moderator
    if (!req.user.role || !['admin', 'moderator'].includes(req.user.role)) {
      throw new AppError('Unauthorized to perform bulk operations', 403, 'UNAUTHORIZED');
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (visibility) updateData.visibility = visibility;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No update fields provided', 400, 'INVALID_REQUEST');
    }

    const updatedDocuments = await Promise.all(
      documentIds.map((id) => ContentService.updateContent(id, updateData, userId))
    );

    res.json({
      success: true,
      message: `${updatedDocuments.length} documents updated successfully`,
      data: updatedDocuments
    });
  });

  // Search within document text
  static searchInDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { q } = req.query;

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check if user has access to this document
    if (document.visibility === 'private' && document.author.id !== req.user?.userId) {
      const user = await require('../../config/database').prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true }
      });

      if (!user || !['admin', 'moderator'].includes(user.role)) {
        throw new AppError('Unauthorized to search in this document', 403, 'UNAUTHORIZED');
      }
    }

    const textContent = document.metadata?.textContent || '';
    const searchResults = [];

    if (q && textContent) {
      const searchTerm = q.toLowerCase();
      const lines = textContent.split('\n');
      const matches = [];

      lines.forEach((line, index) => {
        const lineLower = line.toLowerCase();
        if (lineLower.includes(searchTerm)) {
          matches.push({
            line: index + 1,
            text: line.trim(),
            preview: line.trim().substring(0, 200) + (line.trim().length > 200 ? '...' : '')
          });
        }
      });

      searchResults.push({
        documentId: document.id,
        documentTitle: document.title,
        matches,
        totalMatches: matches.length
      });
    }

    res.json({
      success: true,
      data: searchResults
    });
  });

  // Get document recommendations
  static getDocumentRecommendations = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    // Get documents with similar tags or category
    const recommendations = await require('../../config/database').prisma.content.findMany({
      where: {
        id: { not: id },
        type: 'document',
        status: 'published',
        visibility: { in: ['public', 'unlisted'] },
        OR: [
          { category: document.category },
          { tags: { hasSome: document.tags } }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: 10
    });

    res.json({
      success: true,
      data: recommendations
    });
  });

  /**
   * @swagger
   * /api/content/documents/{id}/extract-text:
   *   get:
   *     summary: Extract full text content from a document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [plain, html, markdown]
   *           default: plain
   *       - in: query
   *         name: includeMetadata
   *         schema:
   *           type: boolean
   *           default: false
   *     responses:
   *       200:
   *         description: Text extracted successfully
   */
  static extractText = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'plain', includeMetadata = false } = req.query;

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check access permissions
    if (document.visibility === 'private' && document.author.id !== req.user?.userId) {
      const user = await require('../../config/database').prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true }
      });

      if (!user || !['admin', 'moderator'].includes(user.role)) {
        throw new AppError('Unauthorized to extract text from this document', 403, 'UNAUTHORIZED');
      }
    }

    const textContent = document.metadata?.textContent || '';
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

    const responseData = {
      documentId: document.id,
      text: textContent,
      format,
      wordCount,
      characterCount: textContent.length,
      language: document.metadata?.language || 'en',
      confidence: 0.95,
      extractedAt: document.metadata?.processedAt || document.updatedAt
    };

    if (includeMetadata === 'true' || includeMetadata === true) {
      responseData.metadata = {
        pageCount: document.metadata?.pageCount || 0,
        hasImages: document.metadata?.hasImages || false,
        hasTables: document.metadata?.hasTables || false,
        hasFormFields: document.metadata?.hasFormFields || false
      };
    }

    res.json({
      success: true,
      data: responseData
    });
  });

  /**
   * @swagger
   * /api/content/documents/{id}/download-link:
   *   post:
   *     summary: Generate a temporary download link for the document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               expiresIn:
   *                 type: number
   *                 default: 3600
   *               maxDownloads:
   *                 type: number
   *                 default: 5
   *     responses:
   *       200:
   *         description: Download link generated successfully
   */
  static generateDownloadLink = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { expiresIn = 3600, maxDownloads = 5 } = req.body;

    const document = await ContentService.getContent(id, false);

    if (document.type !== 'document') {
      throw new AppError('Content is not a document', 400, 'INVALID_CONTENT_TYPE');
    }

    // Check permissions
    if (document.visibility === 'private' && document.author.id !== req.user.userId) {
      throw new AppError('Unauthorized to generate download link', 403, 'UNAUTHORIZED');
    }

    // Generate a secure token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store token in metadata (in production, use a separate table)
    await ContentService.updateContent(id, {
      metadata: {
        ...document.metadata,
        downloadTokens: [
          ...(document.metadata?.downloadTokens || []),
          {
            token,
            expiresAt: expiresAt.toISOString(),
            maxDownloads,
            remainingDownloads: maxDownloads,
            createdBy: req.user.userId,
            createdAt: new Date().toISOString()
          }
        ]
      }
    });

    res.json({
      success: true,
      data: {
        downloadUrl: `/api/content/documents/${id}/download?token=${token}`,
        token,
        expiresAt: expiresAt.toISOString(),
        maxDownloads,
        remainingDownloads: maxDownloads
      },
      message: 'Download link generated successfully'
    });
  });

  /**
   * @swagger
   * /api/content/documents/bulk-move:
   *   put:
   *     summary: Move multiple documents to a folder
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - documentIds
   *             properties:
   *               documentIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               targetFolderId:
   *                 type: string
   *                 nullable: true
   *     responses:
   *       200:
   *         description: Documents moved successfully
   */
  static bulkMoveDocuments = asyncHandler(async (req, res) => {
    const { documentIds, targetFolderId } = req.body;
    const { userId } = req.user;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      throw new AppError('Document IDs are required', 400, 'INVALID_REQUEST');
    }

    const results = {
      moved: 0,
      failed: 0,
      details: []
    };

    for (const docId of documentIds) {
      try {
        const document = await ContentService.getContent(docId, false);
        
        // Check ownership
        if (document.author.id !== userId && !['admin', 'moderator'].includes(req.user.role)) {
          results.failed++;
          results.details.push({
            id: docId,
            status: 'failed',
            message: 'Unauthorized'
          });
          continue;
        }

        await ContentService.updateContent(docId, {
          metadata: {
            ...document.metadata,
            folderId: targetFolderId
          }
        });

        results.moved++;
        results.details.push({
          id: docId,
          status: 'success',
          message: 'Moved successfully'
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          id: docId,
          status: 'failed',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `${results.moved} documents moved successfully`
    });
  });
}

// Folder Management Controller
class FolderController {
  /**
   * @swagger
   * /api/content/folders:
   *   post:
   *     summary: Create a new folder
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               parentId:
   *                 type: string
   *               visibility:
   *                 type: string
   *                 enum: [private, shared]
   *     responses:
   *       201:
   *         description: Folder created successfully
   */
  static createFolder = asyncHandler(async (req, res) => {
    const { name, description, parentId, visibility = 'private' } = req.body;
    const { userId } = req.user;

    // Validate folder name
    if (!name || name.trim().length === 0) {
      throw new AppError('Folder name is required', 400, 'INVALID_REQUEST');
    }

    if (name.length > 100) {
      throw new AppError('Folder name cannot exceed 100 characters', 400, 'INVALID_REQUEST');
    }

    // Create folder metadata in user profile or separate table
    // For now, store in a simple structure
    const folder = {
      id: require('crypto').randomUUID(),
      name: name.trim(),
      description: description || '',
      parentId: parentId || null,
      visibility,
      authorId: userId,
      documentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In production, store in a dedicated folders table
    // For now, return the created folder
    res.status(201).json({
      success: true,
      data: folder,
      message: 'Folder created successfully'
    });
  });

  /**
   * @swagger
   * /api/content/folders:
   *   get:
   *     summary: Get user's folders
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: parentId
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: number
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *           default: 20
   *     responses:
   *       200:
   *         description: Folders retrieved successfully
   */
  static getFolders = asyncHandler(async (req, res) => {
    const { parentId, page = 1, limit = 20 } = req.query;
    const { userId } = req.user;

    // In production, query from folders table
    // For now, return mock data
    const folders = [];

    res.json({
      success: true,
      data: {
        folders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      }
    });
  });

  /**
   * @swagger
   * /api/content/folders/{folderId}/documents:
   *   get:
   *     summary: Get documents in a specific folder
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: folderId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: number
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *           default: 20
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [name, recent, size]
   *           default: name
   *     responses:
   *       200:
   *         description: Documents retrieved successfully
   */
  static getFolderDocuments = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { page = 1, limit = 20, sortBy = 'name' } = req.query;
    const { userId } = req.user;

    const skip = (page - 1) * limit;

    // Get documents with matching folderId in metadata
    const [documents, total] = await Promise.all([
      require('../../config/database').prisma.content.findMany({
        where: {
          type: 'document',
          authorId: userId,
          metadata: {
            path: ['folderId'],
            equals: folderId
          }
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: sortBy === 'name' ? { title: 'asc' }
          : sortBy === 'size' ? { metadata: { path: ['fileSize'], sort: 'desc' } }
            : { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      require('../../config/database').prisma.content.count({
        where: {
          type: 'document',
          authorId: userId,
          metadata: {
            path: ['folderId'],
            equals: folderId
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        folder: {
          id: folderId,
          name: 'Folder Name', // In production, fetch from folders table
          path: 'Root/Folder'
        },
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });
}

// Document processing utilities
class DocumentProcessingUtils {
  // Extract PDF metadata and text (to be implemented)
  static async extractPDFMetadata(filePath, extension) {
    try {
      // This would use pdf-parse or similar library to extract metadata
      // For now, return basic info
      const stats = await fs.stat(filePath);

      return {
        pageCount: 0, // Would be extracted from PDF
        textContent: null, // Would be extracted from PDF
        previewText: null, // Would be first few pages
        fileSize: stats.size,
        createdAt: stats.birthtime
      };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      throw error;
    }
  }

  // Extract document metadata for other formats
  static async extractDocumentMetadata(filePath, extension) {
    try {
      const stats = await fs.stat(filePath);

      // For non-PDF documents, we might not be able to extract text content
      return {
        pageCount: extension === '.pdf' ? 0 : null,
        textContent: null,
        previewText: null,
        fileSize: stats.size,
        createdAt: stats.birthtime
      };
    } catch (error) {
      console.error('Error extracting document metadata:', error);
      throw error;
    }
  }

  // Process document (to be implemented with document processing service)
  static async processDocument(documentId, filePath, metadata) {
    try {
      const { extension } = metadata;

      let extractedData;

      if (extension === '.pdf') {
        extractedData = await DocumentProcessingUtils.extractPDFMetadata(filePath, extension);
      } else {
        extractedData = await DocumentProcessingUtils.extractDocumentMetadata(filePath, extension);
      }

      await ContentService.updateContent(documentId, {
        metadata: {
          ...metadata,
          ...extractedData,
          processingStatus: 'completed',
          processedAt: new Date().toISOString()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error processing document:', error);

      await ContentService.updateContent(documentId, {
        status: 'failed',
        metadata: {
          ...metadata,
          error: error.message,
          failedAt: new Date().toISOString()
        }
      });

      throw error;
    }
  }

  // Generate document preview (placeholder)
  static async generatePreview(documentId, filePath) {
    try {
      // This would generate a preview image or text excerpt
      // For now, return placeholder
      return {
        previewUrl: null,
        previewType: 'text'
      };
    } catch (error) {
      console.error('Error generating document preview:', error);
      throw error;
    }
  }
}

module.exports = { DocumentController, FolderController };

module.exports = { DocumentController, FolderController };
