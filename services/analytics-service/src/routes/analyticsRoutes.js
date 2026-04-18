const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../../shared/middleware/auth');

router.use(authenticateToken);

// Analytics endpoints
router.get('/completion-rate', analyticsController.getCompletionRate);
router.get('/trends', analyticsController.getTrends);
router.get('/heatmap', analyticsController.getHeatmap);
router.get('/best-days', analyticsController.getBestDays);
router.get('/insights', analyticsController.getInsights);
router.get('/weekly-report', analyticsController.getWeeklyReport);

module.exports = router;
