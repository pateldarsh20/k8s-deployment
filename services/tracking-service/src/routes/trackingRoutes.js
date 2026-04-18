const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { authenticateToken } = require('../../shared/middleware/auth');

router.use(authenticateToken);

// Log completion
router.post('/log', trackingController.logCompletion);

// Get today's tracking
router.get('/today', trackingController.getTodayTracking);

// Get overall stats
router.get('/stats', trackingController.getTrackingStats);

// Habit-specific routes
router.get('/:habitId', trackingController.getHabitRecords);
router.get('/:habitId/streak', trackingController.getStreak);
router.post('/:habitId/unlog', trackingController.unlogCompletion);

module.exports = router;
