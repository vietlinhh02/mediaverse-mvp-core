// Content module validation schemas
const Joi = require('joi');

// Article creation validation schema
const articleCreateSchema = Joi.object({
  title: Joi.string().min(5).max(200).trim()
    .required()
    .messages({
      'string.min': 'Article title must be at least 5 characters long',
      'string.max': 'Article title cannot exceed 200 characters',
      'string.empty': 'Article title is required',
      'any.required': 'Article title is required'
    }),
  content: Joi.string().min(100).max(50000).trim()
    .required()
    .messages({
      'string.min': 'Article content must be at least 100 characters long',
      'string.max': 'Article content cannot exceed 50,000 characters',
      'string.empty': 'Article content is required',
      'any.required': 'Article content is required'
    }),
  description: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Article description cannot exceed 500 characters'
    }),
  category: Joi.string().valid(
    'technology',
    'tech',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).required().messages({
    'any.only': 'Category must be one of: technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other',
    'any.required': 'Category is required'
  }),
  tags: Joi.alternatives().try(
    Joi.string().max(500).trim().custom((value, helpers) => {
      // Split string by comma and trim each tag
      const tags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
      // Validate each tag
      for (const tag of tags) {
        if (tag.length > 50) {
          return helpers.error('string.max');
        }
      }
      if (tags.length > 10) {
        return helpers.error('array.max');
      }
      return tags;
    })
      .messages({
        'string.max': 'Each tag cannot exceed 50 characters',
        'array.max': 'Maximum 10 tags allowed'
      }),
    Joi.array().items(
      Joi.string().max(50).trim()
    ).max(10).messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.max': 'Each tag cannot exceed 50 characters'
    })
  ).default([]),
  status: Joi.string().valid('draft', 'published').default('draft')
    .messages({
      'any.only': 'Status must be either draft or published'
    }),
  visibility: Joi.string().valid('public', 'private', 'unlisted').default('public')
    .messages({
      'any.only': 'Visibility must be one of: public, private, unlisted'
    }),
  channelId: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Channel ID must be a string'
  }),
  summary: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Summary cannot exceed 500 characters'
    }),
  allowComments: Joi.boolean().default(true)
    .messages({
      'boolean.base': 'Allow comments must be a boolean value'
    })
});

// Article update validation schema
const articleUpdateSchema = Joi.object({
  title: Joi.string().min(5).max(200).trim()
    .messages({
      'string.min': 'Article title must be at least 5 characters long',
      'string.max': 'Article title cannot exceed 200 characters'
    }),
  content: Joi.string().min(100).max(50000).trim()
    .messages({
      'string.min': 'Article content must be at least 100 characters long',
      'string.max': 'Article content cannot exceed 50,000 characters'
    }),
  description: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Article description cannot exceed 500 characters'
    }),
  category: Joi.string().valid(
    'technology',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).messages({
    'any.only': 'Category must be one of: technology, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other'
  }),
  tags: Joi.array().items(
    Joi.string().max(50).trim()
  ).max(10).messages({
    'array.max': 'Maximum 10 tags allowed',
    'string.max': 'Each tag cannot exceed 50 characters'
  }),
  status: Joi.string().valid('draft', 'published', 'archived')
    .messages({
      'any.only': 'Status must be one of: draft, published, archived'
    }),
  visibility: Joi.string().valid('public', 'private', 'unlisted')
    .messages({
      'any.only': 'Visibility must be one of: public, private, unlisted'
    }),
  channelId: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Channel ID must be a string'
  }),
  summary: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Summary cannot exceed 500 characters'
    }),
  allowComments: Joi.boolean()
    .messages({
      'boolean.base': 'Allow comments must be a boolean value'
    })
});

// Video initialization validation schema (for async upload)
const videoInitSchema = Joi.object({
  title: Joi.string().min(5).max(200).trim()
    .required()
    .messages({
      'string.min': 'Video title must be at least 5 characters long',
      'string.max': 'Video title cannot exceed 200 characters',
      'string.empty': 'Video title is required',
      'any.required': 'Video title is required'
    }),
  description: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Video description cannot exceed 500 characters'
    }),
  category: Joi.string().valid(
    'technology',
    'tech',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).required().messages({
    'any.only': 'Category must be one of: technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other',
    'any.required': 'Category is required'
  }),
  tags: Joi.alternatives().try(
    Joi.string().max(500).trim().custom((value, helpers) => {
      // Split string by comma and trim each tag
      const tags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
      // Validate each tag
      for (const tag of tags) {
        if (tag.length > 50) {
          return helpers.error('string.max');
        }
      }
      if (tags.length > 10) {
        return helpers.error('array.max');
      }
      return tags;
    })
      .messages({
        'string.max': 'Each tag cannot exceed 50 characters',
        'array.max': 'Maximum 10 tags allowed'
      }),
    Joi.array().items(
      Joi.string().max(50).trim()
    ).max(10).messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.max': 'Each tag cannot exceed 50 characters'
    })
  ).default([]),
  status: Joi.string().valid('draft', 'published').default('draft')
    .messages({
      'any.only': 'Status must be either draft or published'
    }),
  visibility: Joi.string().valid('public', 'private', 'unlisted').default('public')
    .messages({
      'any.only': 'Visibility must be one of: public, private, unlisted'
    }),
  channelId: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Channel ID must be a string'
  }),
  useAdaptiveStorage: Joi.boolean().default(true)
    .messages({
      'boolean.base': 'Use adaptive storage must be a boolean value'
    })
});

// Legacy video upload validation schema (deprecated)
const videoUploadSchema = Joi.object({
  title: Joi.string().min(5).max(200).trim()
    .required()
    .messages({
      'string.min': 'Video title must be at least 5 characters long',
      'string.max': 'Video title cannot exceed 200 characters',
      'string.empty': 'Video title is required',
      'any.required': 'Video title is required'
    }),
  description: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Video description cannot exceed 500 characters'
    }),
  category: Joi.string().valid(
    'technology',
    'tech',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).required().messages({
    'any.only': 'Category must be one of: technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other',
    'any.required': 'Category is required'
  }),
  tags: Joi.alternatives().try(
    Joi.string().max(500).trim().custom((value, helpers) => {
      // Split string by comma and trim each tag
      const tags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
      // Validate each tag
      for (const tag of tags) {
        if (tag.length > 50) {
          return helpers.error('string.max');
        }
      }
      if (tags.length > 10) {
        return helpers.error('array.max');
      }
      return tags;
    })
      .messages({
        'string.max': 'Each tag cannot exceed 50 characters',
        'array.max': 'Maximum 10 tags allowed'
      }),
    Joi.array().items(
      Joi.string().max(50).trim()
    ).max(10).messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.max': 'Each tag cannot exceed 50 characters'
    })
  ).default([]),
  status: Joi.string().valid('draft', 'published').default('draft')
    .messages({
      'any.only': 'Status must be either draft or published'
    }),
  visibility: Joi.string().valid('public', 'private', 'unlisted').default('public')
    .messages({
      'any.only': 'Visibility must be one of: public, private, unlisted'
    }),
  channelId: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Channel ID must be a string'
  }),
  summary: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Summary cannot exceed 500 characters'
    }),
  allowComments: Joi.boolean().default(true)
    .messages({
      'boolean.base': 'Allow comments must be a boolean value'
    })
});

// Content share validation schema
const shareContentSchema = Joi.object({
  platform: Joi.string().valid('facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'copy')
    .required()
    .messages({
      'any.only': 'Platform must be one of: facebook, twitter, linkedin, whatsapp, telegram, copy',
      'any.required': 'Platform is required'
    }),
  message: Joi.string().max(280).allow('').optional()
    .messages({
      'string.max': 'Share message cannot exceed 280 characters'
    })
});

// Community post validation schema
const communityPostCreateSchema = Joi.object({
  title: Joi.string().min(5).max(200).trim()
    .required()
    .messages({
      'string.min': 'Post title must be at least 5 characters long',
      'string.max': 'Post title cannot exceed 200 characters',
      'string.empty': 'Post title is required',
      'any.required': 'Post title is required'
    }),
  content: Joi.string().min(10).max(10000).trim()
    .required()
    .messages({
      'string.min': 'Post content must be at least 10 characters long',
      'string.max': 'Post content cannot exceed 10,000 characters',
      'string.empty': 'Post content is required',
      'any.required': 'Post content is required'
    }),
  hashtags: Joi.alternatives().try(
    Joi.string().max(500).trim().custom((value, helpers) => {
      const hashtags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
      for (const tag of hashtags) {
        if (tag.length > 50) {
          return helpers.error('string.max');
        }
      }
      if (hashtags.length > 10) {
        return helpers.error('array.max');
      }
      return hashtags;
    })
      .messages({
        'string.max': 'Each hashtag cannot exceed 50 characters',
        'array.max': 'Maximum 10 hashtags allowed'
      }),
    Joi.array().items(
      Joi.string().max(50).trim()
    ).max(10).messages({
      'array.max': 'Maximum 10 hashtags allowed',
      'string.max': 'Each hashtag cannot exceed 50 characters'
    })
  ).default([]),
  visibility: Joi.string().valid('public', 'community', 'private').default('public')
    .messages({
      'any.only': 'Visibility must be one of: public, community, private'
    })
});

// Community post query validation schema
const communityPostQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50)
    .default(20),
  hashtag: Joi.string().optional(),
  sortBy: Joi.string().valid('createdAt', 'likes', 'comments').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Comment query validation schema
const commentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100)
    .default(20),
  sortBy: Joi.string().valid('createdAt', 'likes', 'replies').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  includeReplies: Joi.boolean().default(false)
});

// Export validation middleware functions

// Document upload validation schema
const documentUploadSchema = Joi.object({
  title: Joi.string().min(5).max(200).trim()
    .required()
    .messages({
      'string.min': 'Document title must be at least 5 characters long',
      'string.max': 'Document title cannot exceed 200 characters',
      'string.empty': 'Document title is required',
      'any.required': 'Document title is required'
    }),
  description: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Document description cannot exceed 500 characters'
    }),
  category: Joi.string().valid(
    'technology',
    'tech',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).required().messages({
    'any.only': 'Category must be one of: technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other',
    'any.required': 'Category is required'
  }),
  tags: Joi.alternatives().try(
    Joi.string().max(500).trim().custom((value, helpers) => {
      // Split string by comma and trim each tag
      const tags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
      // Validate each tag
      for (const tag of tags) {
        if (tag.length > 50) {
          return helpers.error('string.max');
        }
      }
      if (tags.length > 10) {
        return helpers.error('array.max');
      }
      return tags;
    })
      .messages({
        'string.max': 'Each tag cannot exceed 50 characters',
        'array.max': 'Maximum 10 tags allowed'
      }),
    Joi.array().items(
      Joi.string().max(50).trim()
    ).max(10).messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.max': 'Each tag cannot exceed 50 characters'
    })
  ).default([]),
  status: Joi.string().valid('draft', 'published').default('draft')
    .messages({
      'any.only': 'Status must be either draft or published'
    }),
  visibility: Joi.string().valid('public', 'private', 'unlisted').default('public')
    .messages({
      'any.only': 'Visibility must be one of: public, private, unlisted'
    }),
  channelId: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Channel ID must be a string'
  }),
  summary: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Summary cannot exceed 500 characters'
    }),
  allowComments: Joi.boolean().default(true)
    .messages({
      'boolean.base': 'Allow comments must be a boolean value'
    })
});

// Comment validation schema
const commentCreateSchema = Joi.object({
  text: Joi.string().min(1).max(2000).trim()
    .required()
    .messages({
      'string.min': 'Comment cannot be empty',
      'string.max': 'Comment cannot exceed 2000 characters',
      'string.empty': 'Comment text is required',
      'any.required': 'Comment text is required'
    }),
  parentId: Joi.string().optional().messages({
    'string.base': 'Parent ID must be a string'
  })
});

// Comment update validation schema
const commentUpdateSchema = Joi.object({
  text: Joi.string().min(1).max(2000).trim()
    .required()
    .messages({
      'string.min': 'Comment cannot be empty',
      'string.max': 'Comment cannot exceed 2000 characters',
      'string.empty': 'Comment text is required',
      'any.required': 'Comment text is required'
    })
});

// Content search validation schema
const contentSearchSchema = Joi.object({
  q: Joi.string().min(1).max(100).trim()
    .required()
    .messages({
      'string.min': 'Search query cannot be empty',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  type: Joi.string().valid('article', 'video', 'document', 'all').default('all')
    .messages({
      'any.only': 'Type must be one of: article, video, document, all'
    }),
  category: Joi.string().valid(
    'technology',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).messages({
    'any.only': 'Category must be one of: technology, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other'
  }),
  tags: Joi.array().items(
    Joi.string().max(50).trim()
  ).max(10).messages({
    'array.max': 'Maximum 10 tags allowed',
    'string.max': 'Each tag cannot exceed 50 characters'
  }),
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number().integer().min(1).max(50)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    }),
  sortBy: Joi.string().valid('relevance', 'recent', 'popular').default('relevance')
    .messages({
      'any.only': 'Sort must be one of: relevance, recent, popular'
    }),
  offset: Joi.number().integer().min(0).default(0)
    .messages({
      'number.base': 'Offset must be a number',
      'number.integer': 'Offset must be an integer',
      'number.min': 'Offset must be at least 0'
    })
});

// Content feed validation schema
const feedSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number().integer().min(1).max(50)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    }),
  type: Joi.string().valid('article', 'video', 'document').optional()
    .messages({
      'string.base': 'Type must be a string',
      'any.only': 'Type must be one of: article, video, document'
    }),
  category: Joi.string().valid(
    'technology',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).optional()
    .messages({
      'string.base': 'Category must be a string',
      'any.only': 'Category must be a valid category'
    }),
  useSmartAlgorithm: Joi.boolean().default(true).optional()
    .messages({
      'boolean.base': 'useSmartAlgorithm must be a boolean'
    })
});

// Category content validation schema
const categoryContentSchema = Joi.object({
  category: Joi.string().valid(
    'technology',
    'tech',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).required().messages({
    'any.only': 'Category must be one of: technology, tech, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other',
    'any.required': 'Category is required'
  }),
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number().integer().min(1).max(50)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

// Content ID parameter validation
const contentIdSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'Content ID is required',
    'any.required': 'Content ID is required'
  })
});

// Category parameter validation
const categoryParamSchema = Joi.object({
  category: Joi.string().valid(
    'technology',
    'education',
    'entertainment',
    'business',
    'health',
    'lifestyle',
    'science',
    'sports',
    'politics',
    'travel',
    'other'
  ).required().messages({
    'any.only': 'Category must be one of: technology, education, entertainment, business, health, lifestyle, science, sports, politics, travel, other',
    'any.required': 'Category is required'
  })
});

// Extract text validation schema
const extractTextSchema = Joi.object({
  format: Joi.string().valid('plain', 'html', 'markdown').default('plain')
    .messages({
      'any.only': 'Format must be one of: plain, html, markdown'
    }),
  includeMetadata: Joi.boolean().default(false)
    .messages({
      'boolean.base': 'includeMetadata must be a boolean'
    })
});

// Generate download link validation schema
const generateDownloadLinkSchema = Joi.object({
  expiresIn: Joi.number().integer().min(60).max(86400)
    .default(3600)
    .messages({
      'number.base': 'expiresIn must be a number',
      'number.integer': 'expiresIn must be an integer',
      'number.min': 'expiresIn must be at least 60 seconds',
      'number.max': 'expiresIn cannot exceed 86400 seconds (24 hours)'
    }),
  maxDownloads: Joi.number().integer().min(1).max(100)
    .default(5)
    .messages({
      'number.base': 'maxDownloads must be a number',
      'number.integer': 'maxDownloads must be an integer',
      'number.min': 'maxDownloads must be at least 1',
      'number.max': 'maxDownloads cannot exceed 100'
    }),
  password: Joi.string().min(6).max(50).optional()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password cannot exceed 50 characters'
    })
});

// Bulk move documents validation schema
const bulkMoveDocumentsSchema = Joi.object({
  documentIds: Joi.array().items(Joi.string()).min(1).max(50)
    .required()
    .messages({
      'array.base': 'documentIds must be an array',
      'array.min': 'At least one document ID is required',
      'array.max': 'Cannot move more than 50 documents at once',
      'any.required': 'documentIds is required'
    }),
  targetFolderId: Joi.string().allow(null).optional()
    .messages({
      'string.base': 'targetFolderId must be a string'
    })
});

// Folder creation validation schema
const createFolderSchema = Joi.object({
  name: Joi.string().min(1).max(100).trim()
    .required()
    .messages({
      'string.empty': 'Folder name is required',
      'string.min': 'Folder name must be at least 1 character',
      'string.max': 'Folder name cannot exceed 100 characters',
      'any.required': 'Folder name is required'
    }),
  description: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  parentId: Joi.string().allow(null).optional()
    .messages({
      'string.base': 'parentId must be a string'
    }),
  visibility: Joi.string().valid('private', 'shared').default('private')
    .messages({
      'any.only': 'Visibility must be either private or shared'
    })
});

// Get folders validation schema
const getFoldersSchema = Joi.object({
  parentId: Joi.string().allow(null).optional()
    .messages({
      'string.base': 'parentId must be a string'
    }),
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number().integer().min(1).max(50)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

// Folder documents validation schema
const folderDocumentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number().integer().min(1).max(50)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    }),
  sortBy: Joi.string().valid('name', 'recent', 'size').default('name')
    .messages({
      'any.only': 'sortBy must be one of: name, recent, size'
    })
});

// Validation middleware factory
const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  // Replace request property with validated and sanitized value
  req[property] = value;
  next();
};

// Export validation middleware functions
const validateArticleCreate = validate(articleCreateSchema);
const validateArticleUpdate = validate(articleUpdateSchema);
const validateVideoInit = validate(videoInitSchema);
const validateVideoUpload = validate(videoUploadSchema);
const validateDocumentUpload = validate(documentUploadSchema);
const validateCommentCreate = validate(commentCreateSchema);
const validateCommentUpdate = validate(commentUpdateSchema);
const validateCommentQuery = validate(commentQuerySchema, 'query');
const validateContentSearch = validate(contentSearchSchema, 'query');
const validateFeed = validate(feedSchema, 'query');
const validateCategoryContent = validate(categoryContentSchema, 'query');
const validateContentId = validate(contentIdSchema, 'params');
const validateCategory = validate(categoryParamSchema, 'params');
const validateShareContent = validate(shareContentSchema);
const validateCommunityPostCreate = validate(communityPostCreateSchema);
const validateCommunityPostQuery = validate(communityPostQuerySchema, 'query');

// New document validation middleware
const validateExtractText = validate(extractTextSchema, 'query');
const validateGenerateDownloadLink = validate(generateDownloadLinkSchema);
const validateBulkMoveDocuments = validate(bulkMoveDocumentsSchema);
const validateCreateFolder = validate(createFolderSchema);
const validateGetFolders = validate(getFoldersSchema, 'query');
const validateFolderDocuments = validate(folderDocumentsSchema, 'query');

module.exports = {
  // Schemas
  articleCreateSchema,
  articleUpdateSchema,
  videoInitSchema,
  videoUploadSchema,
  documentUploadSchema,
  commentCreateSchema,
  commentUpdateSchema,
  commentQuerySchema,
  contentSearchSchema,
  feedSchema,
  categoryContentSchema,
  contentIdSchema,
  categoryParamSchema,
  shareContentSchema,
  communityPostCreateSchema,
  communityPostQuerySchema,
  extractTextSchema,
  generateDownloadLinkSchema,
  bulkMoveDocumentsSchema,
  createFolderSchema,
  getFoldersSchema,
  folderDocumentsSchema,

  // Middleware functions
  validate,
  validateArticleCreate,
  validateArticleUpdate,
  validateVideoInit,
  validateVideoUpload,
  validateDocumentUpload,
  validateCommentCreate,
  validateCommentUpdate,
  validateCommentQuery,
  validateContentSearch,
  validateFeed,
  validateCategoryContent,
  validateContentId,
  validateCategory,
  validateShareContent,
  validateCommunityPostCreate,
  validateCommunityPostQuery,
  validateExtractText,
  validateGenerateDownloadLink,
  validateBulkMoveDocuments,
  validateCreateFolder,
  validateGetFolders,
  validateFolderDocuments
};
