// src/modules/moderation/routes/moderationRoutes.js
const { Router } = require('express');
const { authenticateToken, requireAdmin } = require('../../../middleware/auth.js');

// Import Controllers
const reportController = require('../controllers/reportController.js');
const adminController = require('../controllers/adminController.js');
const userModerationController = require('../controllers/userModerationController.js');

const router = Router();

// --- Public/User-Facing Routes ---

/**
 * @swagger
 * /api/moderation/reports:
 *   post:
 *     summary: Create a new content report
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentId
 *               - reason
 *             properties:
 *               contentId:
 *                 type: string
 *                 description: The ID of the content being reported.
 *               userId:
 *                 type: string
 *                 description: The ID of the user reporting the content (if different from authenticated user).
 *               reason:
 *                 type: string
 *                 description: The reason for the report.
 *                 enum: [SPAM, HARASSMENT, INAPPROPRIATE, COPYRIGHT, OTHER]
 *     responses:
 *       201:
 *         description: Report created successfully.
 *       400:
 *         description: Bad request, invalid input.
 *       401:
 *         description: Unauthorized.
 */
router.post('/reports', authenticateToken, reportController.createReport);

// --- Admin-Only Routes ---

// Middleware to protect all subsequent admin routes
router.use('/admin', authenticateToken, requireAdmin);

/**
 * @swagger
 * /api/moderation/admin/dashboard:
 *   get:
 *     summary: Get moderation dashboard statistics
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved dashboard stats.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReports:
 *                   type: integer
 *                 pendingReports:
 *                   type: integer
 *                 resolvedReports:
 *                   type: integer
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get('/admin/dashboard', adminController.getDashboard);

/**
 * @swagger
 * /api/moderation/admin/reports:
 *   get:
 *     summary: Get all reports with filtering, sorting, and pagination
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, UNDER_REVIEW, RESOLVED]
 *         description: Filter reports by status.
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *         description: Filter reports by priority.
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [SPAM, HARASSMENT, INAPPROPRIATE, COPYRIGHT, OTHER]
 *         description: Filter reports by reason.
 *     responses:
 *       200:
 *         description: A paginated list of reports.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get('/admin/reports', adminController.getReports);

/**
 * @swagger
 * /api/moderation/admin/reports/{id}/action:
 *   post:
 *     summary: Take moderation action on a report
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The report ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 description: The action to take on the report.
 *                 enum: [approve, remove, warn, ban]
 *               reason:
 *                 type: string
 *                 description: A reason for the action (required for warn/ban).
 *               details:
 *                 type: string
 *                 description: Additional details for the moderation log.
 *     responses:
 *       200:
 *         description: Action was successful.
 *       400:
 *         description: Bad request, invalid action or missing parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Report not found.
 */
router.post('/admin/reports/:id/action', adminController.takeAction);

/**
 * @swagger
 * /api/moderation/admin/users/banned:
 *   get:
 *     summary: Get a list of banned users
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of banned users.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get('/admin/users/banned', userModerationController.getBannedUsers);

/**
 * @swagger
 * /api/moderation/admin/users/{id}/ban:
 *   post:
 *     summary: Ban a user
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to ban.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The reason for the ban.
 *               duration:
 *                 type: string
 *                 description: The duration of the ban (e.g., '7d', '30d', 'permanent').
 *     responses:
 *       200:
 *         description: User banned successfully.
 *       400:
 *         description: Bad request, reason is required.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: User not found.
 */
router.post('/admin/users/:id/ban', userModerationController.banUser);

/**
 * @swagger
 * /api/moderation/admin/users/{id}/warn:
 *   post:
 *     summary: Warn a user
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to warn.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The reason for the warning.
 *     responses:
 *       200:
 *         description: User warned successfully.
 *       400:
 *         description: Bad request, reason is required.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: User not found.
 */
router.post('/admin/users/:id/warn', userModerationController.warnUser);

/**
 * @swagger
 * /api/moderation/admin/users/{id}/unban:
 *   post:
 *     summary: Unban a user
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to unban.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: An optional reason for unbanning the user.
 *     responses:
 *       200:
 *         description: User unbanned successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: User not found.
 */
router.post('/admin/users/:id/unban', userModerationController.unbanUser);

module.exports = router;
