const { body, param } = require('express-validator');

// Registration validation
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters'),

  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom((value) => {
      // Reserved usernames
      const reserved = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'root', 'support', 'help', 'about', 'contact'];
      if (reserved.includes(value.toLowerCase())) {
        throw new Error('This username is reserved');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Login validation
const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required')
    .isLength({ max: 255 })
    .withMessage('Identifier must be less than 255 characters'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password must be less than 128 characters')
];

// Refresh token validation
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid refresh token format')
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
];

// Reset password validation
const resetPasswordValidation = [
  body('resetToken')
    .notEmpty()
    .withMessage('Reset token is required')
    .isUUID()
    .withMessage('Invalid reset token format'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .isLength({ max: 128 })
    .withMessage('Current password must be less than 128 characters'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// Validate reset token param
const validateResetTokenParam = [
  param('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isUUID()
    .withMessage('Invalid reset token format')
];

// Token validation
const tokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isJWT()
    .withMessage('Invalid token format')
];

// Send OTP validation
const sendOtpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
];

// Verify OTP validation
const verifyOtpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters'),

  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
];

module.exports = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  validateResetTokenParam,
  tokenValidation,
  sendOtpValidation,
  verifyOtpValidation
};
