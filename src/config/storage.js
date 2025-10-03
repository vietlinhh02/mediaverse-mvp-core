// File storage configuration
const multer = require('multer');
const path = require('path');
const { v7: uuidv7 } = require('uuid');

const storageConfig = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },

  local: {
    uploadsDir: process.env.UPLOADS_DIR || './uploads',
    tempDir: process.env.TEMP_DIR || './temp'
  },

  limits: {
    fileSize: {
      video: 100 * 1024 * 1024, // 100MB
      image: 10 * 1024 * 1024, // 10MB
      document: 50 * 1024 * 1024 // 50MB
    }
  },

  allowedTypes: {
    video: ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime'],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }
};

// Multer configuration for different file types
const createMulterConfig = (fileType) => multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, storageConfig.local.tempDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv7()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: storageConfig.limits.fileSize[fileType] || storageConfig.limits.fileSize.document
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = storageConfig.allowedTypes[fileType] || [];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  }
});

// File upload configurations
const uploadConfigs = {
  video: createMulterConfig('video'),
  image: createMulterConfig('image'),
  document: createMulterConfig('document'),
  avatar: multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, storageConfig.local.tempDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `avatar_${uuidv7()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB for avatars
    },
    fileFilter: (req, file, cb) => {
      if (storageConfig.allowedTypes.image.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image type for avatar'), false);
      }
    }
  })
};

module.exports = { storageConfig, uploadConfigs };
