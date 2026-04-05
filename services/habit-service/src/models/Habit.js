const mongoose = require('mongoose');

/**
 * Habit Schema
 * Supports multiple habit types and scheduling options
 */
const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Habit name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  // Habit Types
  type: {
    type: String,
    enum: ['binary', 'count', 'time', 'negative'],
    required: true,
    default: 'binary'
  },
  // Target configuration based on type
  target: {
    // For binary: 1 (complete/incomplete)
    // For count: number of times (e.g., 8 glasses of water)
    // For time: minutes (e.g., 30 minutes of exercise)
    // For negative: 0 means success (avoided the habit)
    value: { type: Number, default: 1 },
    unit: {
      type: String,
      enum: ['times', 'minutes', 'hours', 'glasses', 'pages', 'custom', 'none'],
      default: 'none'
    }
  },
  // Scheduling
  schedule: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'daily'
    },
    // For weekly: array of days (0=Sunday, 6=Saturday)
    daysOfWeek: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6], // All days by default
      validate: {
        validator: function(days) {
          return days.every(d => d >= 0 && d <= 6);
        },
        message: 'Days must be between 0 (Sunday) and 6 (Saturday)'
      }
    },
    // Custom schedule (for future use - can store RRULE or custom patterns)
    customRule: { type: String, default: null }
  },
  // Reminder settings
  reminders: [{
    time: {
      type: String, // Format: "HH:MM"
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    message: {
      type: String,
      default: ''
    }
  }],
  // Metadata
  color: {
    type: String,
    default: '#4CAF50',
    match: [/^#[0-9A-Fa-f]{6}$/, 'Please provide a valid hex color']
  },
  icon: {
    type: String,
    default: 'check'
  },
  // Tracking configuration
  tracking: {
    allowBackdate: {
      type: Boolean,
      default: false
    },
    requireNote: {
      type: Boolean,
      default: false
    },
    // Streak tracking
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    totalCompletions: {
      type: Number,
      default: 0
    }
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'archived', 'deleted'],
    default: 'active'
  },
  // Dates
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
habitSchema.index({ userId: 1, status: 1 });
habitSchema.index({ userId: 1, 'schedule.type': 1 });
habitSchema.index({ createdAt: -1 });

// Virtual for checking if habit is due today
habitSchema.virtual('isDueToday').get(function() {
  if (this.status !== 'active') return false;
  
  const today = new Date().getDay(); // 0-6
  
  if (this.schedule.type === 'daily') return true;
  if (this.schedule.type === 'weekly') {
    return this.schedule.daysOfWeek.includes(today);
  }
  // Custom - evaluate custom rule (simplified for now)
  return true;
});

// Pre-save hook to set defaults based on type
habitSchema.pre('save', function(next) {
  if (this.type === 'binary') {
    this.target.value = 1;
    this.target.unit = 'none';
  }
  next();
});

module.exports = mongoose.model('Habit', habitSchema);
