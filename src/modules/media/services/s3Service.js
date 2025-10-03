const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT, // For MinIO or other S3-compatible services
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  },
  forcePathStyle: true // Necessary for MinIO
});

/**
 * Uploads a file to an S3 bucket, using multipart upload for large files.
 * @param {string} localPath - The local path to the file.
 * @param {string} bucket - The S3 bucket name.
 * @param {string} key - The key (path) for the file in the bucket.
 * @returns {Promise<object>} The result from the upload.
 */
const uploadFile = async (localPath, bucket, key) => {
  const fileStream = fs.createReadStream(localPath);
  try {
    const parallelUploads3 = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileStream
      },
      queueSize: 4, // optional concurrency configuration
      partSize: 1024 * 1024 * 5, // optional size of each part, 5MB
      leavePartsOnError: false // optional manually handle dropped parts
    });

    parallelUploads3.on('httpUploadProgress', (progress) => {
      console.log(progress);
    });

    return await parallelUploads3.done();
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/**
 * Downloads a file from an S3 bucket.
 * @param {string} bucket - The S3 bucket name.
 * @param {string} key - The key of the file to download.
 * @returns {Promise<ReadableStream>} The file stream.
 */
const downloadFile = async (bucket, key) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  const { Body } = await s3Client.send(command);
  return Body;
};

/**
 * Deletes a file from an S3 bucket.
 * @param {string} bucket - The S3 bucket name.
 * @param {string} key - The key of the file to delete.
 * @returns {Promise<object>} The result from the delete operation.
 */
const deleteFile = (bucket, key) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });
  return s3Client.send(command);
};

/**
 * Generates a presigned URL for accessing a file.
 * @param {string} bucket - The S3 bucket name.
 * @param {string} key - The key of the file.
 * @param {number} expiry - The URL expiry time in seconds.
 * @returns {Promise<string>} The presigned URL.
 */
const generatePresignedUrl = (bucket, key, expiry = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiry });
};

module.exports = {
  s3Client,
  uploadFile,
  downloadFile,
  deleteFile,
  generatePresignedUrl
};
