// User module validation schemas
const Joi = require('joi');

// Profile update validation schema
const profileUpdateSchema = Joi.object({
  displayName: Joi.string().min(2).max(50).trim()
    .messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name cannot exceed 50 characters',
      'string.empty': 'Display name cannot be empty'
    }),
  bio: Joi.string().max(500).allow('').trim()
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),
  location: Joi.string().max(100).allow('').trim()
    .messages({
      'string.max': 'Location cannot exceed 100 characters'
    }),
  website: Joi.string().uri().allow('').messages({
    'string.uri': 'Website must be a valid URL'
  }),
  avatarUrl: Joi.string().uri().allow('').messages({
    'string.uri': 'Avatar URL must be a valid URL'
  }),
  isPublic: Joi.boolean().default(true)
});


// Search validation schema
const searchSchema = Joi.object({
  q: Joi.string().min(1).max(100).trim()
    .required()
    .messages({
      'string.min': 'Search query cannot be empty',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
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

// Pagination validation schema
const paginationSchema = Joi.object({
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


// User ID parameter validation
const userIdSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required'
  })
});


// Provider parameter validation
const providerSchema = Joi.object({
  provider: Joi.string().valid('google', 'github', 'facebook').required().messages({
    'any.only': 'Provider must be one of: google, github, facebook',
    'string.empty': 'Provider is required',
    'any.required': 'Provider is required'
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
const validateProfileUpdate = validate(profileUpdateSchema);
  const validateSearch = validate(searchSchema, 'query');
  const validatePagination = validate(paginationSchema, 'query');
  const validateUserId = validate(userIdSchema, 'params');
  const validateProvider = validate(providerSchema, 'params');

module.exports = {
  // Schemas
  profileUpdateSchema,
  searchSchema,
  paginationSchema,
  userIdSchema,
  providerSchema,

  // Middleware functions
  validate,
  validateProfileUpdate,
  validateSearch,
  validatePagination,
  validateUserId,
  validateProvider
};
