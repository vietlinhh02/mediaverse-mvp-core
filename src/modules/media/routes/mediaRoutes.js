const express = require('express');

const router = express.Router();
const mediaController = require('../controllers/mediaController');

// POST /api/media/process-video
router.post('/process-video', mediaController.processVideo);

// POST /api/media/generate-thumbnails
router.post('/generate-thumbnails', mediaController.generateThumbnails);

// GET /api/media/jobs/:id
router.get('/jobs/:id', mediaController.getJobStatus);

// POST /api/media/adaptive-streaming
router.post('/adaptive-streaming', mediaController.adaptiveStreaming);

module.exports = router;
