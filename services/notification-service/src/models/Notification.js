const mongoose = require('mongoose');

/**
 * Notification Schema
 * Stores notification records with retry logic
 */
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    index: true
  },
  // Notification type
  type: {
    type: String,
    enum: ['reminder', 'welcome', 'streak_milestone', 'weekly_report', 'motivational', 'custom'],
    required: true
  },
  // Notification content
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  // Delivery status
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Scheduling
  scheduledAt: {
    type: Date,
    required: true,
    index: true
  },
  sentAt: {
    type: Date,
    default: null
  },
  // Retry mechanism
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  lastRetryAt: {
    type: Date,
    default: null
  },
  // Error tracking
  error: {
    type: String,
    default: null
  },
  // Delivery channel
  channel: {
    type: String,
    enum: ['push', 'email', 'sms', 'in_app'],
    default: 'in_app'
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Read status (for in-app notifications)
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, status: 1, scheduledAt: -1 });
notificationSchema.index({ status: 1, scheduledAt: 1 }); // For scheduled job

// Virtual for checking if notification is overdue
notificationSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && this.scheduledAt < new Date();
});

module.exports = mongoose.model('Notification', notificationSchema);
