const express = require('express');
const { getS3Client, getBucketName } = require('../config/minio');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Storage
 *     description: Storage proxy endpoints for MinIO objects
 */

/**
 * @swagger
 * /api/storage/{bucket}/*:
 *   get:
 *     summary: Get presigned URL for MinIO object
 *     tags: [Storage]
 *     parameters:
 *       - in: path
 *         name: bucket
 *         required: true
 *         schema:
 *           type: string
 *         description: MinIO bucket name
 *       - in: path
 *         name: objectKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Object key path (wildcard)
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           default: 3600
 *         description: URL expiration time in seconds (default: 1 hour)
 *     responses:
 *       302:
 *         description: Redirect to presigned URL
 *       404:
 *         description: Object not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: File not found
 *                 code:
 *                   type: string
 *                   example: NOT_FOUND
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to generate presigned URL
 *                 code:
 *                   type: string
 *                   example: INTERNAL_ERROR
 */

// Proxy route for MinIO objects with presigned URLs
router.get('/:bucket/*', async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const objectKey = req.params[0]; // Wildcard parameter captures the rest of the path
    const expiresIn = parseInt(req.query.expiresIn) || 3600; // Default 1 hour

    if (!bucket || !objectKey) {
      return res.status(400).json({
        error: 'Bucket and object key are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate bucket name (security check)
    const allowedBuckets = ['videos', 'images', 'documents', 'audio', 'thumbnails'];
    if (!allowedBuckets.includes(bucket)) {
      return res.status(403).json({
        error: 'Access denied to this bucket',
        code: 'ACCESS_DENIED'
      });
    }

    const s3Client = getS3Client();
    const bucketName = getBucketName();

    // Use the bucket from URL parameter, but validate it exists
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    // Generate presigned URL
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expiresIn
    });

    // Redirect to the presigned URL
    res.redirect(presignedUrl);

  } catch (error) {
    console.error('Storage proxy error:', error);
    
    // Handle specific AWS S3 errors
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        error: 'File not found',
        code: 'NOT_FOUND'
      });
    }

    if (error.name === 'NoSuchBucket') {
      return res.status(404).json({
        error: 'Bucket not found',
        code: 'BUCKET_NOT_FOUND'
      });
    }

    if (error.name === 'AccessDenied') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.status(500).json({
      error: 'Failed to generate presigned URL',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/storage/{bucket}/*:
 *   head:
 *     summary: Check if MinIO object exists
 *     tags: [Storage]
 *     parameters:
 *       - in: path
 *         name: bucket
 *         required: true
 *         schema:
 *           type: string
 *         description: MinIO bucket name
 *       - in: path
 *         name: objectKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Object key path (wildcard)
 *     responses:
 *       200:
 *         description: Object exists
 *       404:
 *         description: Object not found
 *       500:
 *         description: Internal server error
 */

// HEAD request to check if object exists
router.head('/:bucket/*', async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const objectKey = req.params[0];

    if (!bucket || !objectKey) {
      return res.status(400).end();
    }

    // Validate bucket name
    const allowedBuckets = ['videos', 'images', 'documents', 'audio', 'thumbnails'];
    if (!allowedBuckets.includes(bucket)) {
      return res.status(403).end();
    }

    const s3Client = getS3Client();
    const bucketName = getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    // Try to get object metadata
    await s3Client.send(command);
    res.status(200).end();

  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).end();
    }

    if (error.name === 'NoSuchBucket') {
      return res.status(404).end();
    }

    res.status(500).end();
  }
});

module.exports = router;
