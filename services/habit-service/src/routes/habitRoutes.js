const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');
const { authenticateToken } = require('../../shared/middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// CRUD routes
router.post('/', habitController.createHabit);
router.get('/', habitController.getHabits);
router.get('/today', habitController.getTodayHabits);
router.get('/stats/summary', habitController.getHabitStats);
router.get('/:id', habitController.getHabit);
router.put('/:id', habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);

// Status actions
router.post('/:id/pause', habitController.pauseHabit);
router.post('/:id/resume', habitController.resumeHabit);

module.exports = router;
