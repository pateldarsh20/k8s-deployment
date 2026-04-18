const mongoose = require('mongoose');

/**
 * Daily Summary Schema
 * Pre-computed daily analytics per user
 */
const dailySummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Habits due and completed
  habitsDue: {
    type: Number,
    default: 0
  },
  habitsCompleted: {
    type: Number,
    default: 0
  },
  completionRate: {
    type: Number, // percentage 0-100
    default: 0
  },
  // Streak information
  streaksContinued: {
    type: Number,
    default: 0
  },
  streaksBroken: {
    type: Number,
    default: 0
  },
  // Best performing day of week (0-6)
  dayOfWeek: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

dailySummarySchema.index({ userId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('DailySummary', dailySummarySchema);
