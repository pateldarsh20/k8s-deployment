const mongoose = require('mongoose');

/**
 * Habit Record Schema
 * Stores individual habit completion records
 */
const habitRecordSchema = new mongoose.Schema({
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
  // The date this record is for
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Completion status
  completed: {
    type: Boolean,
    required: true,
    default: false
  },
  // Actual value logged (for count/time types)
  value: {
    type: Number,
    default: 0
  },
  // Whether the target was met
  targetMet: {
    type: Boolean,
    default: false
  },
  // Optional note from user
  note: {
    type: String,
    trim: true,
    maxlength: 500
  },
  // Timestamps
  loggedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient date range queries
habitRecordSchema.index({ userId: 1, habitId: 1, date: -1 });
habitRecordSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('HabitRecord', habitRecordSchema);
