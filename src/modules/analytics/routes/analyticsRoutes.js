const express = require('express');
const trackingController = require('../controllers/trackingController');
const creatorController = require('../controllers/creatorController');
const exportController = require('../controllers/exportController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Endpoints for tracking user and content analytics.
 */

/**
 * @swagger
 * /api/analytics/view:
 *   post:
 *     summary: Track a content view event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentId:
 *                 type: string
 *               userId:
 *                 type: string
 *               duration:
 *                 type: number
 *               source:
 *                 type: string
 *     responses:
 *       202:
 *         description: View event accepted for processing.
 *       400:
 *         description: Bad request, missing required fields.
 */
router.post('/view', trackingController.trackView);

/**
 * @swagger
 * /api/analytics/heartbeat:
 *   post:
 *     summary: Track content view duration heartbeat
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentId:
 *                 type: string
 *               userId:
 *                 type: string
 *               duration:
 *                 type: number
 *               referrer:
 *                 type: string
 *               userAgent:
 *                 type: string
 *     responses:
 *       202:
 *         description: Heartbeat event accepted for processing.
 *       400:
 *         description: Bad request, missing required fields.
 */
router.post('/heartbeat', trackingController.trackHeartbeat);

/**
 * @swagger
 * /api/analytics/engagement:
 *   post:
 *     summary: Track a user engagement event (like, comment, share)
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentId:
 *                 type: string
 *               userId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [likes, comments, shares]
 *     responses:
 *       200:
 *         description: Engagement event tracked successfully.
 *       400:
 *         description: Bad request, missing or invalid fields.
 */
router.post('/engagement', trackingController.trackEngagement);

/**
 * @swagger
 * /api/analytics/content/{id}/stats:
 *   get:
 *     summary: Get aggregated statistics for a piece of content
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the content.
 *     responses:
 *       200:
 *         description: Aggregated content statistics.
 *       404:
 *         description: Content not found.
 */
router.get('/content/:id/stats', trackingController.getContentStats);

/**
 * @swagger
 * tags:
 *   name: Analytics - Creator
 *   description: Analytics endpoints for content creators.
 */

/**
 * @swagger
 * /api/analytics/creator/dashboard:
 *   get:
 *     summary: Get dashboard analytics for the logged-in creator
 *     tags: [Analytics - Creator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Creator's dashboard data.
 *       401:
 *         description: Unauthorized.
 */
router.get('/creator/dashboard', /* protect, */ creatorController.getDashboard);

/**
 * @swagger
 * /api/analytics/creator/content:
 *   get:
 *     summary: Get content performance analytics for the logged-in creator
 *     tags: [Analytics - Creator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Creator's content performance data.
 *       401:
 *         description: Unauthorized.
 */
router.get('/creator/content', /* protect, */ creatorController.getContentPerformance);

/**
 * @swagger
 * /api/analytics/creator/audience:
 *   get:
 *     summary: Get audience statistics for the logged-in creator
 *     tags: [Analytics - Creator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Creator's audience demographic and geographic data.
 *       401:
 *         description: Unauthorized.
 */
router.get('/creator/audience', /* protect, */ creatorController.getAudienceStats);

/**
 * @swagger
 * /api/analytics/creator/content/{id}/retention:
 *   get:
 *     summary: Get audience retention data for a specific piece of content
 *     tags: [Analytics - Creator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the content.
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: The time period in days to retrieve data for.
 *     responses:
 *       200:
 *         description: Audience retention data formatted for charts.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Content not found.
 */
router.get('/creator/content/:id/retention', /* protect, */ creatorController.getRetentionData);

/**
 * @swagger
 * /api/analytics/creator/content/{id}/traffic-sources:
 *   get:
 *     summary: Get traffic source data for a specific piece of content
 *     tags: [Analytics - Creator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the content.
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: The time period in days to retrieve data for.
 *     responses:
 *       200:
 *         description: Traffic source data formatted for charts.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Content not found.
 */
router.get('/creator/content/:id/traffic-sources', /* protect, */ creatorController.getTrafficSources);

/**
 * @swagger
 * /api/analytics/creator/content/{id}/demographics:
 *   get:
 *     summary: Get demographic data for a specific piece of content
 *     tags: [Analytics - Creator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the content.
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: The time period in days to retrieve data for.
 *     responses:
 *       200:
 *         description: Demographic data formatted for charts.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Content not found.
 */
router.get('/creator/content/:id/demographics', /* protect, */ creatorController.getDemographics);

/**
 * @swagger
 * tags:
 *   name: Analytics - Export
 *   description: Endpoints for exporting analytics data.
 */

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data as CSV or JSON
 *     tags: [Analytics - Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *         default: json
 *       - in: query
 *         name: aggregationLevel
 *         schema:
 *           type: string
 *           enum: [raw, hourly, daily]
 *         default: daily
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics data file.
 *         content:
 *           text/csv: {}
 *           application/json: {}
 *       401:
 *         description: Unauthorized.
 */
router.get('/export', /* protect, */ exportController.exportData);

/**
 * @swagger
 * /api/analytics/export/schedule:
 *   post:
 *     summary: Schedule a recurring analytics report
 *     tags: [Analytics - Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               cronPattern:
 *                 type: string
 *               reportParams:
 *                 type: object
 *     responses:
 *       202:
 *         description: Report scheduled successfully.
 *       400:
 *         description: Bad request, missing fields.
 *       401:
 *         description: Unauthorized.
 */
router.post('/export/schedule', /* protect, */ exportController.scheduleReport);

module.exports = router;
