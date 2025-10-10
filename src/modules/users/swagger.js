// Swagger documentation for User Management module

/**
 * @swagger
 * components:
 *   schemas:
 *     Profile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Profile ID
 *         userId:
 *           type: string
 *           description: User ID
 *         displayName:
 *           type: string
 *           description: Display name
 *         bio:
 *           type: string
 *           description: User biography
 *         avatarUrl:
 *           type: string
 *           description: Avatar image URL
 *         location:
 *           type: string
 *           description: User location
 *         website:
 *           type: string
 *           description: User website URL
 *         isPublic:
 *           type: boolean
 *           description: Profile visibility
 *         stats:
 *           type: object
 *           properties:
 *             followersCount:
 *               type: integer
 *             followingCount:
 *               type: integer
 *             contentCount:
 *               type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *
 *     UserPreferences:
 *       type: object
 *       properties:
 *         notifications:
 *           type: object
 *           properties:
 *             email:
 *               type: object
 *               properties:
 *                 newFollower:
 *                   type: boolean
 *                 newComment:
 *                   type: boolean
 *                 newLike:
 *                   type: boolean
 *                 contentPublished:
 *                   type: boolean
 *                 weeklyDigest:
 *                   type: boolean
 *             push:
 *               type: object
 *               properties:
 *                 newFollower:
 *                   type: boolean
 *                 newComment:
 *                   type: boolean
 *                 newLike:
 *                   type: boolean
 *                 contentPublished:
 *                   type: boolean
 *             inApp:
 *               type: object
 *               properties:
 *                 newFollower:
 *                   type: boolean
 *                 newComment:
 *                   type: boolean
 *                 newLike:
 *                   type: boolean
 *                 contentPublished:
 *                   type: boolean
 *                 systemUpdates:
 *                   type: boolean
 *         privacy:
 *           type: object
 *           properties:
 *             profileVisibility:
 *               type: string
 *               enum: [public, private, followers]
 *             showEmail:
 *               type: boolean
 *             showFollowers:
 *               type: boolean
 *             showFollowing:
 *               type: boolean
 *             allowDirectMessages:
 *               type: string
 *               enum: [everyone, followers, none]
 *             searchable:
 *               type: boolean
 *         content:
 *           type: object
 *           properties:
 *             defaultVisibility:
 *               type: string
 *               enum: [public, private, unlisted]
 *             allowComments:
 *               type: boolean
 *             allowLikes:
 *               type: boolean
 *             moderateComments:
 *               type: boolean
 *             categories:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [technology, education, entertainment, business, health, lifestyle, other]
 *             language:
 *               type: string
 *         display:
 *           type: object
 *           properties:
 *             theme:
 *               type: string
 *               enum: [light, dark, auto]
 *             language:
 *               type: string
 *             timezone:
 *               type: string
 *             dateFormat:
 *               type: string
 *               enum: [MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD]
 *             compactMode:
 *               type: boolean
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User profile management
 *   - name: Follow
 *     description: User follow/unfollow operations
 *   
 *   - name: Preferences
 *     description: User preferences management
 */

/**
 * @swagger
 * /api/users/profile/{id}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Profile'
 *       404:
 *         description: Profile not found
 *       403:
 *         description: Profile is private
 */

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *               location:
 *                 type: string
 *                 maxLength: 100
 *               website:
 *                 type: string
 *                 format: uri
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Profile'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/users/upload-avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (max 5MB, JPEG/PNG/WebP)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       $ref: '#/components/schemas/Profile'
 *                     avatarUrls:
 *                       type: object
 *                       properties:
 *                         200x200:
 *                           type: string
 *                         400x400:
 *                           type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid file or validation error
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Users found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           bio:
 *                             type: string
 *                           avatarUrl:
 *                             type: string
 *                           stats:
 *                             type: object
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/users/{id}/follow:
 *   post:
 *     summary: Follow a user
 *     tags: [Follow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to follow
 *     responses:
 *       200:
 *         description: User followed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       400:
 *         description: Cannot follow yourself or validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       409:
 *         description: Already following this user
 */

/**
 * @swagger
 * /api/users/{id}/unfollow:
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Follow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to unfollow
 *     responses:
 *       200:
 *         description: User unfollowed successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Not following this user
 */

/**
 * @swagger
 * /api/users/{id}/followers:
 *   get:
 *     summary: Get user followers
 *     tags: [Follow]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: Followers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     followers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           bio:
 *                             type: string
 *                           avatarUrl:
 *                             type: string
 *                           stats:
 *                             type: object
 *                           followedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */

/**
 * @swagger
 * /api/users/{id}/following:
 *   get:
 *     summary: Get users that user is following
 *     tags: [Follow]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: Following list retrieved successfully
 */

/**
 * @swagger
 * /api/users/{id}/follow-status:
 *   get:
 *     summary: Check follow status
 *     tags: [Follow]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to check
 *     responses:
 *       200:
 *         description: Follow status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isFollowing:
 *                       type: boolean
 *                     canFollow:
 *                       type: boolean
 *                     followedAt:
 *                       type: string
 *                       format: date-time
 *                     reason:
 *                       type: string
 */

// Channel endpoints removed

/**
 * @swagger
 * /api/users/preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserPreferences'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Profile not found
 *
 *   put:
 *     summary: Update user preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserPreferences'
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserPreferences'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Profile not found
 *
 *   delete:
 *     summary: Reset preferences to default
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences reset successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Profile not found
 */

/**
 * @swagger
 * /api/users/preferences/{section}:
 *   patch:
 *     summary: Update specific preference section
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [notifications, privacy, content, display]
 *         description: Preference section to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Section-specific preference updates
 *     responses:
 *       200:
 *         description: Preference section updated successfully
 *       400:
 *         description: Invalid section or validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Profile not found
 */

module.exports = {};
