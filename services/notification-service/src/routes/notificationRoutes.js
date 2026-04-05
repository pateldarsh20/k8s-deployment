const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../../shared/middleware/auth');

// Protected routes
router.use(authenticateToken);

router.post('/', notificationController.createNotification);
router.get('/', notificationController.getNotifications);
router.get('/stats', notificationController.getNotificationStats);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
