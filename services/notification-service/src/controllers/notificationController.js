const Notification = require('../models/Notification');
const { AppError, asyncHandler } = require('../../shared/utils/errorHandler');
const { body, validationResult } = require('express-validator');

/**
 * Notification Controller
 * Manages user notifications
 */

const createNotificationValidation = [
  body('type').isIn(['reminder', 'custom']).withMessage('Invalid notification type'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('scheduledAt').optional().isISO8601().withMessage('Invalid date format'),
  body('channel').optional().isIn(['push', 'email', 'sms', 'in_app']).withMessage('Invalid channel'),
];

/**
 * POST /api/notifications
 * Create a notification (internal use)
 */
const createNotification = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { userId, habitId, type, title, message, scheduledAt, channel, metadata } = req.body;

  const notification = await Notification.create({
    userId,
    habitId,
    type,
    title,
    message,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
    channel: channel || 'in_app',
    metadata: metadata || {}
  });

  res.status(201).json({
    success: true,
    message: 'Notification created',
    data: notification
  });
});

/**
 * GET /api/notifications
 * Get user's notifications
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { status, limit = 20, unreadOnly } = req.query;

  const filter = { userId: req.user.userId };

  if (status) {
    filter.status = status;
  }

  if (unreadOnly === 'true') {
    filter.isRead = false;
  }

  const notifications = await Notification.find(filter)
    .sort({ scheduledAt: -1 })
    .limit(parseInt(limit));

  const unreadCount = await Notification.countDocuments({
    userId: req.user.userId,
    isRead: false
  });

  res.json({
    success: true,
    count: notifications.length,
    unreadCount,
    data: notifications
  });
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.userId, isRead: false },
    { isRead: true }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.userId
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.json({
    success: true,
    message: 'Notification deleted'
  });
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
const getNotificationStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const stats = await Notification.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        sent: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        unread: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        }
      }
    }
  ]);

  res.json({
    success: true,
    data: stats[0] || { total: 0, pending: 0, sent: 0, failed: 0, unread: 0 }
  });
});

module.exports = {
  createNotification: [createNotificationValidation, createNotification],
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
};
