const Joi = require('joi');

const createPlaylistSchema = Joi.object({
  title: Joi.string().min(3).max(150).required()
    .messages({
      'string.base': 'Title must be a string.',
      'string.empty': 'Title is required.',
      'string.min': 'Title must be at least 3 characters long.',
      'string.max': 'Title cannot be more than 150 characters long.',
      'any.required': 'Title is required.'
    }),
  description: Joi.string().max(5000).optional().allow('')
    .messages({
      'string.base': 'Description must be a string.',
      'string.max': 'Description cannot be more than 5000 characters long.'
    }),
  visibility: Joi.string().valid('PUBLIC', 'PRIVATE', 'UNLISTED').optional()
    .messages({
      'any.only': 'Visibility must be one of [PUBLIC, PRIVATE, UNLISTED].'
    }),
  type: Joi.string().valid('PLAYLIST', 'SERIES').optional()
    .messages({
      'any.only': 'Type must be one of [PLAYLIST, SERIES].'
    })
});

const updatePlaylistSchema = Joi.object({
  title: Joi.string().min(3).max(150).optional()
    .messages({
      'string.base': 'Title must be a string.',
      'string.min': 'Title must be at least 3 characters long.',
      'string.max': 'Title cannot be more than 150 characters long.'
    }),
  description: Joi.string().max(5000).optional().allow('')
    .messages({
      'string.base': 'Description must be a string.',
      'string.max': 'Description cannot be more than 5000 characters long.'
    }),
  visibility: Joi.string().valid('PUBLIC', 'PRIVATE', 'UNLISTED').optional()
    .messages({
      'any.only': 'Visibility must be one of [PUBLIC, PRIVATE, UNLISTED].'
    }),
  type: Joi.string().valid('PLAYLIST', 'SERIES').optional()
    .messages({
      'any.only': 'Type must be one of [PLAYLIST, SERIES].'
    })
});

const addItemSchema = Joi.object({
  contentId: Joi.string().uuid().required()
    .messages({
      'string.base': 'Content ID must be a string.',
      'string.empty': 'Content ID is required.',
      'string.guid': 'Content ID must be a valid UUID.',
      'any.required': 'Content ID is required.'
    })
});

const reorderItemsSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      itemId: Joi.string().uuid().required(),
      order: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
    .messages({
      'array.base': 'Items must be an array.',
      'array.min': 'At least one item is required for reordering.',
      'any.required': 'Items array is required.'
    })
});

module.exports = {
  createPlaylistSchema,
  updatePlaylistSchema,
  addItemSchema,
  reorderItemsSchema
};
