// Request validation middleware using Joi
const Joi = require('joi');

// Generic validation middleware
const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true
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

// Common validation schemas
const schemas = {
  // User registration schema
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    username: Joi.string().alphanum().min(3).max(30)
      .required()
      .messages({
        'string.alphanum': 'Username must contain only letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
      }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/).required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    displayName: Joi.string().min(2).max(50).optional()
  }),

  // User login schema
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Profile update schema
  profileUpdate: Joi.object({
    displayName: Joi.string().min(2).max(50).optional(),
    bio: Joi.string().max(500).optional().allow(''),
    location: Joi.string().max(100).optional().allow(''),
    website: Joi.string().uri().optional().allow('')
  }),

  // Content creation schema
  content: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    category: Joi.string().valid('technology', 'education', 'entertainment', 'business', 'health', 'lifestyle', 'other').required(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    visibility: Joi.string().valid('public', 'private', 'unlisted').default('public')
  }),

  // Article content schema
  article: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    content: Joi.string().min(100).required(),
    description: Joi.string().max(1000).optional().allow(''),
    category: Joi.string().valid('technology', 'education', 'entertainment', 'business', 'health', 'lifestyle', 'other').required(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    visibility: Joi.string().valid('public', 'private', 'unlisted').default('public')
  }),

  // Comment schema
  comment: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    parentId: Joi.string().uuid().optional()
  }),

  

  // Report schema
  report: Joi.object({
    reason: Joi.string().valid('spam', 'harassment', 'inappropriate', 'copyright', 'other').required(),
    description: Joi.string().max(500).optional().allow('')
  }),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100)
      .default(20),
    sort: Joi.string().valid('createdAt', 'updatedAt', 'title', 'views', 'likes').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Search schema
  search: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    category: Joi.string().valid('technology', 'education', 'entertainment', 'business', 'health', 'lifestyle', 'other').optional(),
    type: Joi.string().valid('article', 'video', 'document', 'all').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50)
      .default(20)
  })
};

// Validation middleware functions
const validateRegistration = validate(schemas.register);
const validateLogin = validate(schemas.login);
const validateProfileUpdate = validate(schemas.profileUpdate);
const validateContent = validate(schemas.content);
const validateArticle = validate(schemas.article);
const validateComment = validate(schemas.comment);
const validateReport = validate(schemas.report);
const validatePagination = validate(schemas.pagination, 'query');
const validateSearch = validate(schemas.search, 'query');

module.exports = {
  validate,
  schemas,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateContent,
  validateArticle,
  validateComment,
  validateReport,
  validatePagination,
  validateSearch
};
