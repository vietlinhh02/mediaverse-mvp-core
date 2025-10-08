const { Server } = require('@tus/server');
const { FileStore } = require('@tus/file-store');
const express = require('express');
const { getS3Client, getBucketName } = require('../../config/minio');
const { enqueueProcessVideo, createVideoQueue } = require('../../jobs/queues/videoQueue');
const { prisma } = require('../../config/database');
const path = require('path');
const fs = require('fs-extra');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

function parseTusMetadata(headerVal = '') {
  const map = {};
  headerVal.split(',').forEach((pair) => {
    const [k, v] = pair.split(' ');
    if (!k || !v) return;
    try {
      const decoded = Buffer.from(v, 'base64').toString('utf8');
      map[k] = decoded;
    } catch (_) {}
  });
  return map;
}

function createTusHandler() {
  const router = express.Router();
  const s3 = getS3Client();
  const bucket = getBucketName();

  const uploadsDir = process.env.TUS_UPLOAD_DIR || path.join(process.cwd(), 'tmp', 'tus');
  fs.mkdirpSync(uploadsDir);
  const store = new FileStore({ directory: uploadsDir });

  const server = new Server({
    path: '/api/uploads/tus',
    datastore: store,
    onUploadFinish: async (req, res, upload) => {
      try {
        const metadata = parseTusMetadata(req.headers['upload-metadata']);
        const userId = req.user?.id || metadata.userId; // prefer JWT
        const tags = (() => {
          try { return metadata.tags ? JSON.parse(metadata.tags) : []; } catch (_) {
            return (metadata.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
          }
        })();

        // Move file from local tus to MinIO
        const localPath = path.join(uploadsDir, upload.id);
        const fileBuffer = await fs.readFile(localPath);
        const objectKey = `uploads/tus/${upload.id}`;
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: fileBuffer, ContentType: metadata.contentType || 'video/mp4' }));

        // Create Content record
        const content = await prisma.content.create({
          data: {
            type: 'video',
            title: metadata.title || upload.id,
            description: metadata.description || null,
            category: metadata.category || 'other',
            tags,
            status: metadata.status || 'draft',
            visibility: metadata.visibility || 'public',
            uploadStatus: 'uploaded',
            processingStatus: 'queued',
            author: userId ? { connect: { id: userId } } : undefined,
            channel: metadata.channelId ? { connect: { id: metadata.channelId } } : undefined,
            metadata: {
              sourceObjectKey: objectKey,
              originalName: metadata.filename || upload.metadata?.filename,
              useAdaptiveStorage: metadata.useAdaptiveStorage !== 'false'
            }
          }
        });

        // Enqueue processing job
        const queue = createVideoQueue();
        const { jobId } = await enqueueProcessVideo(queue, { contentId: content.id, sourceObjectKey: objectKey });

        await prisma.job.create({
          data: {
            userId: userId || content.authorId,
            type: 'PROCESS_VIDEO',
            status: 'PENDING',
            progress: 0,
            bullJobId: String(jobId),
            contentId: content.id,
            data: {
              uploadId: upload.id,
              bucket,
              key: objectKey
            }
          }
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('onUploadFinish error:', e);
      }
    }
  });

  router.all('*', (req, res) => server.handle(req, res));
  return router;
}

module.exports = {
  createTusHandler
};


