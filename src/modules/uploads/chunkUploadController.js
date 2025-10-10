const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const { v7: uuidv7 } = require('uuid');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getS3Client, getBucketName } = require('../../config/minio');
const { prisma } = require('../../config/database');
const { createVideoQueue, enqueueProcessVideo } = require('../../jobs/queues/videoQueue');

const TEMP_ROOT = process.env.CHUNK_TEMP_DIR || path.join(process.cwd(), 'tmp', 'chunks');

function hash(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

async function initUpload(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id;

    console.log('[Upload Init] Authenticated user object:', req.user);
    console.log(`[Upload Init] User ID from token: ${userId}`);

    const {
      filename, contentType = 'video/mp4', totalSize, chunkSize, title, description, category,
      tags, visibility = 'public', status = 'draft', useAdaptiveStorage = true
    } = req.body || {};

    if (!filename || !totalSize || !chunkSize || !title || !category) {
      return res.status(400).json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' });
    }

    const uploadId = uuidv7();
    const dir = path.join(TEMP_ROOT, uploadId);
    await fs.mkdirp(dir);

    const meta = {
      uploadId,
      filename,
      contentType,
      totalSize: Number(totalSize),
      chunkSize: Number(chunkSize),
      uploadedBytes: 0,
      receivedParts: {},
      title,
      description,
      category,
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []),
      visibility,
      status,
      useAdaptiveStorage: String(useAdaptiveStorage) !== 'false',
      userId
    };
    await fs.writeJson(path.join(dir, 'meta.json'), meta);
    return res.json({ success: true, data: { uploadId } });
  } catch (e) {
    return res.status(500).json({ error: e.message, code: 'INTERNAL_ERROR' });
  }
}

async function uploadPart(req, res) {
  try {
    const { uploadId } = req.params;
    const { index, checksum } = req.query;
    if (!uploadId || index === undefined) return res.status(400).json({ error: 'Missing uploadId or index', code: 'VALIDATION_ERROR' });
    const partIndex = Number(index);
    const dir = path.join(TEMP_ROOT, uploadId);
    const metaPath = path.join(dir, 'meta.json');
    if (!(await fs.pathExists(metaPath))) return res.status(404).json({ error: 'Upload not found', code: 'NOT_FOUND' });
    const meta = await fs.readJson(metaPath);

    const partPath = path.join(dir, `part-${partIndex}`);
    const buffers = [];
    
    req.on('data', (chunk) => buffers.push(chunk));
    
    req.on('end', async () => {
      try {
        const buf = Buffer.concat(buffers);
        if (checksum) {
          const h = hash(buf);
          if (h !== checksum) return res.status(400).json({ error: 'Checksum mismatch', code: 'CHECKSUM_MISMATCH' });
        }
        await fs.writeFile(partPath, buf);
        meta.uploadedBytes += buf.length;
        meta.receivedParts[partIndex] = buf.length;
        await fs.writeJson(metaPath, meta);
        res.json({ success: true, data: { index: partIndex, size: buf.length, uploadedBytes: meta.uploadedBytes } });
      } catch (error) {
        res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
      }
    });
    
    req.on('error', (error) => {
      res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
    });
    
  } catch (e) {
    return res.status(500).json({ error: e.message, code: 'INTERNAL_ERROR' });
  }
}

async function status(req, res) {
  try {
    const { uploadId } = req.params;
    const dir = path.join(TEMP_ROOT, uploadId);
    const metaPath = path.join(dir, 'meta.json');
    if (!(await fs.pathExists(metaPath))) return res.status(404).json({ error: 'Upload not found', code: 'NOT_FOUND' });
    const meta = await fs.readJson(metaPath);
    return res.json({ success: true, data: { uploadedBytes: meta.uploadedBytes, receivedParts: Object.keys(meta.receivedParts).map(Number).sort((a,b)=>a-b) } });
  } catch (e) {
    return res.status(500).json({ error: e.message, code: 'INTERNAL_ERROR' });
  }
}

async function abort(req, res) {
  try {
    const { uploadId } = req.params;
    const dir = path.join(TEMP_ROOT, uploadId);
    await fs.remove(dir);
    return res.json({ success: true, message: 'Upload aborted' });
  } catch (e) {
    return res.status(500).json({ error: e.message, code: 'INTERNAL_ERROR' });
  }
}

async function complete(req, res) {
  try {
    const { uploadId } = req.params;
    const dir = path.join(TEMP_ROOT, uploadId);
    const metaPath = path.join(dir, 'meta.json');
    if (!(await fs.pathExists(metaPath))) return res.status(404).json({ error: 'Upload not found', code: 'NOT_FOUND' });
    const meta = await fs.readJson(metaPath);

    const partFiles = (await fs.readdir(dir))
      .filter((f) => f.startsWith('part-'))
      .map((f) => ({ f, idx: Number(f.split('-')[1]) }))
      .sort((a, b) => a.idx - b.idx)
      .map((x) => x.f);

    const tempVideo = path.join(dir, 'assembled.mp4');
    const ws = fs.createWriteStream(tempVideo);
    // eslint-disable-next-line no-restricted-syntax
    for (const pf of partFiles) {
      // eslint-disable-next-line no-await-in-loop
      const buf = await fs.readFile(path.join(dir, pf));
      ws.write(buf);
    }
    ws.end();
    await new Promise((r) => ws.on('finish', r));

    // Upload to MinIO
    const s3 = getS3Client();
    const bucket = getBucketName();
    const objectKey = `uploads/chunks/${uploadId}`;
    const fileBuffer = await fs.readFile(tempVideo);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: fileBuffer, ContentType: meta.contentType }));

    // Log data before creating content
    console.log('[Upload] Creating content with data:', {
      type: 'video',
      authorId: meta.userId,
      title: meta.title,
      description: meta.description || null,
      category: meta.category,
      tags: meta.tags,
      status: meta.status,
      visibility: meta.visibility,
      uploadStatus: 'uploaded',
      processingStatus: 'queued',
      metadata: {
        sourceObjectKey: objectKey,
        originalName: meta.filename,
        useAdaptiveStorage: meta.useAdaptiveStorage
      }
    });
    
    // Create Content
    const content = await prisma.content.create({
      data: {
        type: 'video',
        authorId: meta.userId,
        title: meta.title,
        description: meta.description || null,
        category: meta.category,
        tags: meta.tags,
        status: meta.status,
        visibility: meta.visibility,
        uploadStatus: 'uploaded',
        processingStatus: 'queued',
        metadata: {
          sourceObjectKey: objectKey,
          originalName: meta.filename,
          useAdaptiveStorage: meta.useAdaptiveStorage
        }
      }
    });

    // Enqueue processing job
    console.log('[Upload] Enqueuing processing job for contentId:', content.id);
    const queue = createVideoQueue();
    const { jobId } = await enqueueProcessVideo(queue, { contentId: content.id, sourceObjectKey: objectKey, userId: meta.userId });
    console.log('[Upload] Job enqueued with jobId:', jobId);

    // Cleanup temp
    await fs.remove(dir);

    return res.json({ success: true, data: { contentId: content.id, jobId } });
  } catch (e) {
    return res.status(500).json({ error: e.message, code: 'INTERNAL_ERROR' });
  }
}

module.exports = {
  initUpload,
  uploadPart,
  status,
  abort,
  complete
};


