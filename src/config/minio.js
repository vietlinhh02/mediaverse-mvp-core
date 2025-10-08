// MinIO S3-compatible client configuration
const { S3Client } = require('@aws-sdk/client-s3');

let s3Client;

const getEndpoint = () => {
  // Support full URL in env (priority order)
  const endpointEnv = process.env.MINIO_ENDPOINT_URL || process.env.S3_ENDPOINT_URL || process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT;
  if (endpointEnv && endpointEnv.startsWith('http')) {
    return endpointEnv;
  }
  
  // Fallback to host:port construction
  const host = process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || process.env.S3_PORT || '9000';
  const useSSL = (process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true';
  const protocol = useSSL ? 'https' : 'http';
  
  return `${protocol}://${host}:${port}`;
};

function getS3Client() {
  if (!s3Client) {
    const endpoint = getEndpoint();
    console.log('🔧 MinIO endpoint:', endpoint);
    
    s3Client = new S3Client({
      region: process.env.MINIO_REGION || process.env.AWS_REGION || 'us-east-1',
      endpoint: endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
      }
    });
  }
  return s3Client;
}

function getBucketName() {
  return process.env.MINIO_BUCKET || process.env.S3_BUCKET || 'videos';
}

module.exports = {
  getS3Client,
  getBucketName
};
