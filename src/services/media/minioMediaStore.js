const { GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getS3Client, getBucketName } = require('../../config/minio');

async function getObjectStream(key) {
  const s3 = getS3Client();
  const bucket = getBucketName();
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return result.Body; // Readable stream
}

async function getObjectBuffer(key) {
  const stream = await getObjectStream(key);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function putObjectBuffer(key, buffer, contentType) {
  const s3 = getS3Client();
  const bucket = getBucketName();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
  return `s3://${bucket}/${key}`;
}

async function putObjectStream(key, stream, contentType) {
  const s3 = getS3Client();
  const bucket = getBucketName();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: stream, ContentType: contentType }));
  return `s3://${bucket}/${key}`;
}

async function listKeysWithPrefix(prefix) {
  const s3 = getS3Client();
  const bucket = getBucketName();
  const keys = [];
  let ContinuationToken;
  do {
    // eslint-disable-next-line no-await-in-loop
    const resp = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken }));
    (resp.Contents || []).forEach((o) => keys.push(o.Key));
    ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

async function deletePrefix(prefix) {
  const s3 = getS3Client();
  const bucket = getBucketName();
  const keys = await listKeysWithPrefix(prefix);
  if (keys.length === 0) return 0;
  const chunks = [];
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000));
  }
  let deleted = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: chunk.map((Key) => ({ Key })) }
    }));
    deleted += resp.Deleted?.length || 0;
  }
  return deleted;
}

module.exports = {
  getObjectStream,
  getObjectBuffer,
  putObjectBuffer,
  putObjectStream,
  deletePrefix
};


