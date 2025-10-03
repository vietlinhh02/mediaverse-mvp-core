const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./authController');
const passwordController = require('./passwordController');
const oauthController = require('./oauthController');
const { authenticateToken } = require('../../middleware/auth');
const {
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
} = require('./validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - username
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *           example: user@example.com
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           pattern: '^[a-zA-Z0-9_]+$'
 *           description: Username (alphanumeric and underscore only)
 *           example: john_doe
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Password (minimum 8 characters, must contain uppercase, lowercase, number)
 *           example: MyPassword123
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - identifier
 *         - password
 *       properties:
 *         identifier:
 *           type: string
 *           description: Email or username
 *           example: user@example.com
 *         password:
 *           type: string
 *           description: User password
 *           example: MyPassword123
 *
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Valid refresh token
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Login successful
 *         user:
 *           allOf:
 *             - $ref: '#/components/schemas/User'
 *             - type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/Profile'
 *         accessToken:
 *           type: string
 *           description: JWT access token
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         expiresIn:
 *           type: number
 *           description: Token expiration time in seconds
 *           example: 900
 *         tokenType:
 *           type: string
 *           example: Bearer
 *
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *           example: user@example.com
 *
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - resetToken
 *         - newPassword
 *       properties:
 *         resetToken:
 *           type: string
 *           description: Password reset token from email
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (minimum 8 characters, must contain uppercase, lowercase, number)
 *           example: NewPassword123
 *
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Current password
 *           example: OldPassword123
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (minimum 8 characters, must contain uppercase, lowercase, number)
 *           example: NewPassword123
 *
 *     ValidateTokenRequest:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: JWT token to validate
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     TokenValidationResponse:
 *       type: object
 *       properties:
 *         valid:
 *           type: boolean
 *           example: true
 *         user:
 *           $ref: '#/components/schemas/User'
 *         decoded:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *               example: user-123
 *             email:
 *               type: string
 *               example: user@example.com
 *             username:
 *               type: string
 *               example: john_doe
 *             role:
 *               type: string
 *               example: user
 *             status:
 *               type: string
 *               example: active
 */

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => (req.path === '/refresh' || req.path === '/validate')

});

// More restrictive rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60 * 60 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to auth routes
router.use('/register', authLimiter);
router.use('/login', authLimiter);
router.use('/forgot-password', passwordResetLimiter);
router.use('/reset-password', passwordResetLimiter);

// Authentication routes

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email, username, and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email already registered
 *                 code:
 *                   type: string
 *                   example: EMAIL_EXISTS
 *       429:
 *         description: Too many registration attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many authentication attempts, please try again later
 *                 code:
 *                   type: string
 *                   example: RATE_LIMIT_EXCEEDED
 *                 retryAfter:
 *                   type: number
 *                   example: 900
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/register', registerValidation, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email/username and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid email/username or password
 *                 code:
 *                   type: string
 *                   example: INVALID_CREDENTIALS
 *       403:
 *         description: Account inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Account is suspended
 *                 code:
 *                   type: string
 *                   example: ACCOUNT_INACTIVE
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many authentication attempts, please try again later
 *                 code:
 *                   type: string
 *                   example: RATE_LIMIT_EXCEEDED
 *                 retryAfter:
 *                   type: number
 *                   example: 900
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/login', loginValidation, authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Generate new access token using refresh token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid or expired refresh token
 *                 code:
 *                   type: string
 *                   example: INVALID_REFRESH_TOKEN
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/refresh', refreshTokenValidation, authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate user tokens and logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to invalidate
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         profile:
 *                           $ref: '#/components/schemas/Profile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *                 code:
 *                   type: string
 *                   example: USER_NOT_FOUND
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * @swagger
 * /api/auth/validate:
 *   post:
 *     summary: Validate JWT token
 *     description: Validate a JWT token and return user information
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidateTokenRequest'
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenValidationResponse'
 *       400:
 *         description: Token is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Token is required
 *                 code:
 *                   type: string
 *                   example: TOKEN_REQUIRED
 *       401:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Token has been revoked
 *                 code:
 *                   type: string
 *                   example: INVALID_TOKEN
 */
router.post('/validate', tokenValidation, authController.validateToken);

// Password management routes

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset email sent (always returns success for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: If an account with that email exists, a password reset link has been sent
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         description: Too many password reset attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many password reset attempts, please try again later
 *                 code:
 *                   type: string
 *                   example: RATE_LIMIT_EXCEEDED
 *                 retryAfter:
 *                   type: number
 *                   example: 3600
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/forgot-password', forgotPasswordValidation, passwordController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset user password using reset token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid or expired reset token
 *                 code:
 *                   type: string
 *                   example: INVALID_RESET_TOKEN
 *       429:
 *         description: Too many password reset attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many password reset attempts, please try again later
 *                 code:
 *                   type: string
 *                   example: RATE_LIMIT_EXCEEDED
 *                 retryAfter:
 *                   type: number
 *                   example: 3600
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/reset-password', resetPasswordValidation, passwordController.resetPassword);

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send a login OTP to the user's email
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *     responses:
 *       200:
 *         description: If an account with that email exists, an OTP has been sent.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/send-otp', authLimiter, sendOtpValidation, authController.sendLoginOtp);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and log in
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code sent to email
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verify-otp', authLimiter, verifyOtpValidation, authController.verifyLoginOtp);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password
 *     description: Change user password (requires authentication)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Current password is incorrect
 *                 code:
 *                   type: string
 *                   example: INVALID_CURRENT_PASSWORD
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/change-password', authenticateToken, changePasswordValidation, passwordController.changePassword);

/**
 * @swagger
 * /api/auth/validate-reset-token/{token}:
 *   get:
 *     summary: Validate password reset token
 *     description: Check if a password reset token is valid and not expired
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Reset token is valid
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Invalid or expired reset token
 *                 code:
 *                   type: string
 *                   example: INVALID_RESET_TOKEN
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/validate-reset-token/:token', validateResetTokenParam, passwordController.validateResetToken);

// OAuth routes

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     description: Redirect to Google for OAuth authentication
 *     tags: [Authentication]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google', oauthController.googleAuth);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     description: Handle Google OAuth callback and complete authentication
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *     responses:
 *       200:
 *         description: Google OAuth authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: OAuth authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: OAuth authentication failed
 *                 code:
 *                   type: string
 *                   example: OAUTH_FAILED
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google/callback', oauthController.googleCallback);

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth authentication
 *     description: Redirect to GitHub for OAuth authentication
 *     tags: [Authentication]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/github', oauthController.githubAuth);

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: Handle GitHub OAuth callback
 *     description: Handle GitHub OAuth callback and complete authentication
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from GitHub
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *     responses:
 *       200:
 *         description: GitHub OAuth authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: OAuth authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: OAuth authentication failed
 *                 code:
 *                   type: string
 *                   example: OAUTH_FAILED
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/github/callback', oauthController.githubCallback);

/**
 * @swagger
 * /api/auth/facebook:
 *   get:
 *     summary: Initiate Facebook OAuth authentication
 *     description: Redirect to Facebook for OAuth authentication
 *     tags: [Authentication]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to Facebook OAuth
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/facebook', oauthController.facebookAuth);

/**
 * @swagger
 * /api/auth/facebook/callback:
 *   get:
 *     summary: Handle Facebook OAuth callback
 *     description: Handle Facebook OAuth callback and complete authentication
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Facebook
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *     responses:
 *       200:
 *         description: Facebook OAuth authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: OAuth authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: OAuth authentication failed
 *                 code:
 *                   type: string
 *                   example: OAUTH_FAILED
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/facebook/callback', oauthController.facebookCallback);

module.exports = router;
