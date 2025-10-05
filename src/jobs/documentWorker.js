// Document processing worker
const fs = require('fs-extra');
const path = require('path');
const { documentQueue } = require('./documentQueue');
const contentService = require('../modules/content/contentService');
const PDFDocument = require('pdf-parse');

/**
 * Process document file (PDF, DOCX, etc.)
 * - Extract text content
 * - Generate preview
 * - Extract metadata (page count, etc.)
 */
async function processDocument(filePath, documentId) {
  console.log(`[DocumentWorker] Processing document: ${filePath}`);

  const stats = await fs.stat(filePath);
  const extension = path.extname(filePath).toLowerCase();

  let textContent = '';
  let pageCount = 0;
  let metadata = {};

  try {
    // Process PDF files
    if (extension === '.pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await PDFDocument(dataBuffer);
      
      textContent = pdfData.text;
      pageCount = pdfData.numpages;
      metadata = {
        info: pdfData.info,
        version: pdfData.version
      };

      console.log(`[DocumentWorker] PDF processed: ${pageCount} pages, ${textContent.length} characters`);
    } 
    // Add more document types here (DOCX, TXT, etc.)
    else if (extension === '.txt') {
      textContent = await fs.readFile(filePath, 'utf-8');
      pageCount = Math.ceil(textContent.length / 3000); // Rough estimate
    }
    else {
      console.warn(`[DocumentWorker] Unsupported document type: ${extension}`);
    }

    return {
      textContent,
      pageCount,
      fileSize: stats.size,
      metadata
    };
  } catch (error) {
    console.error(`[DocumentWorker] Error processing document:`, error);
    throw error;
  }
}

/**
 * Setup document processing worker
 */
function setupDocumentWorker() {
  console.log('[DocumentWorker] Starting document processing worker...');

  documentQueue.process(5, async (job) => {
    const { documentId, filePath, mimetype } = job.data;
    
    console.log(`[DocumentWorker] Processing document job ${job.id} for document ${documentId}`);

    try {
      // Update status to processing
      await contentService.updateContent(documentId, { 
        metadata: { processingStatus: 'processing' } 
      });

      // Process the document
      const result = await processDocument(filePath, documentId);

      // Update document with processed data
      await contentService.updateContent(documentId, {
        metadata: {
          processingStatus: 'completed',
          textContent: result.textContent,
          pageCount: result.pageCount,
          fileSize: result.fileSize,
          ...result.metadata
        }
      });

      console.log(`[DocumentWorker] Document ${documentId} processed successfully`);

      return {
        success: true,
        documentId,
        pageCount: result.pageCount,
        textContentLength: result.textContent.length
      };

    } catch (error) {
      console.error(`[DocumentWorker] Failed to process document ${documentId}:`, error);

      // Update status to failed
      await contentService.updateContent(documentId, {
        status: 'failed',
        metadata: {
          processingStatus: 'failed',
          error: error.message
        }
      });

      throw error;
    }
  });

  console.log('[DocumentWorker] Document worker ready and listening for jobs');
}

module.exports = {
  setupDocumentWorker,
  documentQueue
};
