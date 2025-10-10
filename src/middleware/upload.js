// File upload middleware using Multer
const multer = require('multer');
const path = require('path');
const { v7: uuidv7 } = require('uuid');
const { logger } = require('./logger');

// File type configurations
const fileTypes = {
  images: {
    mimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    maxSize: 10 * 1024 * 1024, // 10MB
    destination: 'uploads/images/'
  },
  videos: {
    mimeTypes: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-flv',
      'video/3gpp',
      'video/x-ms-wmv'
    ],
    extensions: ['.mp4', '.mpeg', '.mov', '.avi', '.webm', '.flv', '.3gp', '.wmv'],
    maxSize: 500 * 1024 * 1024, // 500MB
    destination: 'uploads/videos/'
  },
  documents: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      // Add image mimetypes
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    extensions: [
      '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt',
      // Add image extensions
      '.jpg', '.jpeg', '.png', '.gif', '.webp'
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    destination: 'uploads/documents/'
  },
  audio: {
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
      'audio/webm'
    ],
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'],
    maxSize: 25 * 1024 * 1024, // 25MB
    destination: 'uploads/audio/'
  }
};

// Helper function to determine file type
const getFileType = (file) => {
  const entries = Object.entries(fileTypes);
  for (let i = 0; i < entries.length; i += 1) {
    const [type, config] = entries[i];
    if (config.mimeTypes.includes(file.mimetype)) {
      return type;
    }
  }
  return null;
};

// Helper function to check for dangerous filenames
const isDangerousFilename = (filename) => {
  const dangerousPatterns = [
    /\.\./, // Directory traversal
    /[<>:"|?*]/, // Invalid filename characters
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows reserved names
    /^\./, // Hidden files
    /\.(exe|bat|cmd|scr|pif|vbs|js|jar|com|pif)$/i // Executable extensions
  ];

  return dangerousPatterns.some((pattern) => pattern.test(filename));
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = getFileType(file);
    if (!fileType) {
      return cb(new Error('Unsupported file type'));
    }

    const { destination } = fileTypes[fileType];

    // Ensure the destination directory exists
    const fs = require('fs').promises;
    const path = require('path');

    fs.mkdir(destination, { recursive: true })
      .then(() => cb(null, destination))
      .catch((err) => {
        logger.error({
          message: 'Failed to create upload directory',
          destination,
          error: err.message
        });
        cb(new Error('Failed to create upload directory'));
      });
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv7();
    const extension = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const filename = `${timestamp}-${uniqueId}${extension}`;
    cb(null, filename);
  }
});

// Memory storage for temporary processing
const memoryStorage = multer.memoryStorage();

// File filter function
const fileFilter = (allowedTypes = ['images', 'videos', 'documents', 'audio']) => (req, file, cb) => {
  try {
    const fileType = getFileType(file);

    if (!fileType) {
      logger.warn({
        message: 'Unsupported file type upload attempt',
        filename: file.originalname,
        mimetype: file.mimetype,
        userId: req.user?.userId,
        ip: req.ip
      });
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }

    if (!allowedTypes.includes(fileType)) {
      logger.warn({
        message: 'File type not allowed for this endpoint',
        filename: file.originalname,
        mimetype: file.mimetype,
        fileType,
        allowedTypes,
        userId: req.user?.userId,
        ip: req.ip
      });
      return cb(new Error(`File type ${fileType} not allowed for this upload`));
    }

    // Additional security checks
    const extension = path.extname(file.originalname).toLowerCase();
    const config = fileTypes[fileType];

    if (!config.extensions.includes(extension)) {
      return cb(new Error(`File extension ${extension} not allowed`));
    }

    // Check for potentially dangerous filenames
    if (isDangerousFilename(file.originalname)) {
      logger.warn({
        message: 'Dangerous filename detected',
        filename: file.originalname,
        userId: req.user?.userId,
        ip: req.ip
      });
      return cb(new Error('Filename contains potentially dangerous characters'));
    }

    cb(null, true);
  } catch (error) {
    cb(error);
  }
};

// Helper function to determine file type (already defined above)

// Create multer instances for different use cases
const createUploadMiddleware = (options = {}) => {
  const {
    allowedTypes = ['images', 'videos', 'documents', 'audio'],
    maxFiles = 1,
    useMemoryStorage = false,
    maxFileSize = null
  } = options;

  // Determine max file size
  const limits = { files: maxFiles };
  if (maxFileSize) {
    limits.fileSize = maxFileSize;
  } else {
    // Use the largest allowed file size from the allowed types
    const maxSize = Math.max(...allowedTypes.map((type) => fileTypes[type].maxSize));
    limits.fileSize = maxSize;
  }

  const multerConfig = {
    storage: useMemoryStorage ? memoryStorage : storage,
    fileFilter: fileFilter(allowedTypes),
    limits
  };

  return multer(multerConfig);
};

// Predefined upload middleware instances
const uploadMiddleware = {
  // Single file uploads
  singleImage: createUploadMiddleware({
    allowedTypes: ['images'],
    maxFiles: 1
  }).single('image'),

  singleVideo: createUploadMiddleware({
    allowedTypes: ['videos'],
    maxFiles: 1,
    maxFileSize: 500 * 1024 * 1024 // 500MB
  }).single('video'),

  singleDocument: createUploadMiddleware({
    allowedTypes: ['documents'],
    maxFiles: 1
  }).single('document'),

  singleAudio: createUploadMiddleware({
    allowedTypes: ['audio'],
    maxFiles: 1
  }).single('audio'),

  // Multiple file uploads
  multipleImages: createUploadMiddleware({
    allowedTypes: ['images'],
    maxFiles: 10
  }).array('images', 10),

  multipleFiles: createUploadMiddleware({
    allowedTypes: ['images', 'documents'],
    maxFiles: 5
  }).array('files', 5),

  // Mixed file uploads
  contentFiles: createUploadMiddleware({
    allowedTypes: ['images', 'videos', 'documents', 'audio'],
    maxFiles: 1
  }).single('file'),

  // Mixed file uploads with memory storage (no disk)
  contentFilesMemory: createUploadMiddleware({
    allowedTypes: ['images', 'videos', 'documents', 'audio'],
    maxFiles: 1,
    useMemoryStorage: true
  }).single('file'),

  // Memory storage for processing
  imageMemory: createUploadMiddleware({
    allowedTypes: ['images'],
    maxFiles: 1,
    useMemoryStorage: true
  }).single('image'),

  documentMemory: createUploadMiddleware({
    allowedTypes: ['documents'],
    maxFiles: 1,
    useMemoryStorage: true
  }).single('document'),

  videoMemory: createUploadMiddleware({
    allowedTypes: ['videos'],
    maxFiles: 1,
    useMemoryStorage: true
  }).single('video'),

  // Avatar upload (smaller size limit)
  avatar: createUploadMiddleware({
    allowedTypes: ['images'],
    maxFiles: 1,
    maxFileSize: 5 * 1024 * 1024 // 5MB
  }).single('avatar'),

  // Avatar upload with memory storage for processing
  avatarMemory: createUploadMiddleware({
    allowedTypes: ['images'],
    maxFiles: 1,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    useMemoryStorage: true
  }).single('avatar'),

  // Thumbnail upload
  thumbnail: createUploadMiddleware({
    allowedTypes: ['images'],
    maxFiles: 1,
    maxFileSize: 2 * 1024 * 1024 // 2MB
  }).single('thumbnail'),

  // Cover image upload with memory storage for processing
  coverImageMemory: createUploadMiddleware({
    allowedTypes: ['images'],
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    useMemoryStorage: true
  }).single('coverImage')
};

// File validation middleware (additional validation after upload)
const validateUploadedFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];

  files.forEach((file) => {
    // Log successful upload
    logger.info({
      message: 'File uploaded successfully',
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      userId: req.user?.userId,
      ip: req.ip
    });

    // Additional validation can be added here
    // e.g., virus scanning, content analysis, etc.
  });

  next();
};

// Error handling middleware for upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        code = 'UNEXPECTED_FILE';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts';
        code = 'TOO_MANY_PARTS';
        break;
      default:
        message = error.message;
    }

    logger.warn({
      message: 'Upload error',
      error: error.message,
      code: error.code,
      userId: req.user?.userId,
      ip: req.ip
    });

    return res.status(400).json({
      error: message,
      code,
      details: error.field ? { field: error.field } : undefined
    });
  }

  if (error.message.includes('Unsupported file type')
      || error.message.includes('not allowed')
      || error.message.includes('dangerous')) {
    return res.status(400).json({
      error: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

  next(error);
};

module.exports = {
  uploadMiddleware,
  createUploadMiddleware,
  validateUploadedFile,
  handleUploadError,
  fileTypes,
  getFileType,
  isDangerousFilename
};
