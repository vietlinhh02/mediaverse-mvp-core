// Quick service check script
require('dotenv').config();
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const Redis = require('redis');

async function checkMinIO() {
  try {
    console.log('🔍 Checking MinIO...');
    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: 'http://localhost:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin123'
      }
    });

    const result = await s3Client.send(new ListBucketsCommand());
    console.log('✅ MinIO connected successfully');
    console.log('📦 Available buckets:', result.Buckets.map(b => b.Name));
    
    // Check if videos bucket exists
    const videosBucket = result.Buckets.find(b => b.Name === 'videos');
    if (videosBucket) {
      console.log('✅ Videos bucket exists');
    } else {
      console.log('❌ Videos bucket not found - creating...');
      // Note: You'll need to create bucket manually or add createBucket logic
    }
    
  } catch (error) {
    console.log('❌ MinIO connection failed:', error.message);
  }
}

async function checkRedis() {
  try {
    console.log('🔍 Checking Redis...');
    const redis = Redis.createClient({
      url: 'redis://localhost:6379'
    });
    
    await redis.connect();
    const pong = await redis.ping();
    console.log('✅ Redis connected:', pong);
    
    await redis.disconnect();
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
  }
}

async function checkEnvVars() {
  console.log('🔍 Checking Environment Variables...');
  const required = [
    'JWT_SECRET',
    'MINIO_ENDPOINT',
    'MINIO_ACCESS_KEY', 
    'MINIO_SECRET_KEY',
    'MINIO_BUCKET',
    'REDIS_URL'
  ];
  
  required.forEach(key => {
    if (process.env[key]) {
      console.log(`✅ ${key}: ${process.env[key]}`);
    } else {
      console.log(`❌ ${key}: Not set`);
    }
  });
}

async function main() {
  console.log('🚀 Starting service checks...\n');
  
  await checkEnvVars();
  console.log('');
  
  await checkMinIO();
  console.log('');
  
  await checkRedis();
  console.log('');
  
  console.log('✅ Service check completed');
}

main().catch(console.error);
