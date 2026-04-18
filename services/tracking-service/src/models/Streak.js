const mongoose = require('mongoose');

/**
 * Streak Schema
 * Tracks current and longest streaks per habit
 */
const streakSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  streakStartDate: {
    type: Date,
    default: null
  },
  lastCompletionDate: {
    type: Date,
    default: null
  },
  // Consistency score (0-100)
  consistencyScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Total completions
  totalCompletions: {
    type: Number,
    default: 0
  },
  // Total days habit has been active
  totalActiveDays: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

streakSchema.index({ userId: 1, habitId: 1 }, { unique: true });

module.exports = mongoose.model('Streak', streakSchema);
