const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password in queries by default
  },
  avatar: {
    type: String,
    default: null
  },
  preferences: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    notificationEnabled: {
      type: Boolean,
      default: true
    },
    weeklyReportDay: {
      type: String,
      enum: ['monday', 'sunday', 'saturday'],
      default: 'sunday'
    }
  },
  stats: {
    totalHabitsCreated: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    memberSince: { type: Date, default: Date.now }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update password method
userSchema.methods.updatePassword = async function(newPassword) {
  this.password = newPassword;
  return await this.save();
};

// Remove sensitive fields from JSON output
userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
