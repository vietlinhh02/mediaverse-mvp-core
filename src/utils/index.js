// Utility functions
const crypto = require('crypto');
const path = require('path');

// Generate random string
const generateRandomString = (length = 32) => crypto.randomBytes(length).toString('hex');

// Generate slug from string
const generateSlug = (text) => text
  .toLowerCase()
  .replace(/[^\w\s-]/g, '') // Remove special characters
  .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
  .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

// Calculate reading time for articles
const calculateReadingTime = (text) => {
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime;
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize filename
const sanitizeFilename = (filename) => filename
  .replace(/[^a-zA-Z0-9.-]/g, '_')
  .replace(/_{2,}/g, '_')
  .replace(/^_+|_+$/g, '');

// Get file extension
const getFileExtension = (filename) => path.extname(filename).toLowerCase();

// Pagination helper
const getPaginationData = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

// Delay function for rate limiting
const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

// Deep clone object
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// Remove sensitive fields from user object
const sanitizeUser = (user) => {
  const sanitized = { ...user };
  delete sanitized.passwordHash;
  delete sanitized.password;
  return sanitized;
};

module.exports = {
  generateRandomString,
  generateSlug,
  calculateReadingTime,
  formatFileSize,
  isValidEmail,
  sanitizeFilename,
  getFileExtension,
  getPaginationData,
  delay,
  deepClone,
  sanitizeUser
};
