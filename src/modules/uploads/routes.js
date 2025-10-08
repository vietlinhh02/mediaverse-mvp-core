const express = require('express');
const { authenticateToken, requireActiveUser } = require('../../middleware/auth');
const ChunkController = require('./chunkUploadController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Uploads
 *     description: Chunked video upload endpoints
 */

// Init upload
router.post(
  '/videos/chunk/init',
  authenticateToken,
  requireActiveUser,
  ChunkController.initUpload
);

// Upload part
/**
 * @swagger
 * /api/uploads/videos/chunk/{uploadId}:
 *   put:
 *     summary: Upload a video chunk
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Upload ID
 *       - in: query
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Chunk index
 *       - in: query
 *         name: checksum
 *         schema:
 *           type: string
 *         description: SHA-1 checksum of the chunk (optional)
 *     requestBody:
 *       required: true
 *       content:
 *         application/octet-stream:
 *           schema:
 *             type: string
 *             format: binary
 *             description: Video chunk data
 *     responses:
 *       200:
 *         description: Chunk uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     index:
 *                       type: integer
 *                     size:
 *                       type: integer
 *                     uploadedBytes:
 *                       type: integer
 */
router.put(
  '/videos/chunk/:uploadId',
  authenticateToken,
  requireActiveUser,
  ChunkController.uploadPart
);

// Status
/**
 * @swagger
 * /api/uploads/videos/chunk/{uploadId}/status:
 *   get:
 *     summary: Get upload status
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Upload ID
 *     responses:
 *       200:
 *         description: Upload status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadedBytes:
 *                       type: integer
 *                     receivedParts:
 *                       type: array
 *                       items: { type: integer }
 */
router.get(
  '/videos/chunk/:uploadId/status',
  authenticateToken,
  requireActiveUser,
  ChunkController.status
);

// Complete
/**
 * @swagger
 * /api/uploads/videos/chunk/{uploadId}/complete:
 *   post:
 *     summary: Complete chunked upload
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Upload ID
 *     responses:
 *       200:
 *         description: Upload completed and processing started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     contentId:
 *                       type: string
 *                     jobId:
 *                       type: string
 */
router.post(
  '/videos/chunk/:uploadId/complete',
  authenticateToken,
  requireActiveUser,
  ChunkController.complete
);

// Abort
/**
 * @swagger
 * /api/uploads/videos/chunk/{uploadId}:
 *   delete:
 *     summary: Abort chunked upload
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Upload ID
 *     responses:
 *       200:
 *         description: Upload aborted
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
 */
router.delete(
  '/videos/chunk/:uploadId',
  authenticateToken,
  requireActiveUser,
  ChunkController.abort
);

module.exports = router;


