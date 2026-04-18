const HabitRecord = require('../models/HabitRecord');
const Streak = require('../models/Streak');
const { AppError, asyncHandler } = require('../../shared/utils/errorHandler');
const { body, validationResult } = require('express-validator');
const mq = require('../../shared/utils/messageQueue');
const mongoose = require('mongoose');

/**
 * Tracking Controller
 * Handles habit completion logging, streaks, and consistency
 */

const logCompletionValidation = [
  body('habitId').notEmpty().withMessage('Habit ID is required'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('value').optional().isNumeric().withMessage('Value must be a number'),
  body('note').optional().isLength({ max: 500 }).withMessage('Note too long'),
];

/**
 * POST /api/tracking/log
 * Log a habit completion
 */
const logCompletion = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { habitId, date, value, note, completed } = req.body;
  const userId = req.user.userId;

  // Determine the date (default to today)
  const recordDate = date ? new Date(date) : new Date();
  recordDate.setHours(0, 0, 0, 0); // Normalize to start of day

  // Check if record already exists for this date
  const existingRecord = await HabitRecord.findOne({
    userId,
    habitId,
    date: recordDate
  });

  if (existingRecord) {
    // Update existing record
    existingRecord.completed = completed !== undefined ? completed : true;
    existingRecord.value = value !== undefined ? value : existingRecord.value;
    existingRecord.note = note || existingRecord.note;
    existingRecord.targetMet = existingRecord.value >= 1;
    existingRecord.loggedAt = new Date();
    await existingRecord.save();

    // Update streaks
    await updateStreak(userId, habitId, recordDate, existingRecord.completed);

    // Publish analytics event
    await mq.publish('analytics', {
      type: 'habit_logged',
      habitId,
      userId,
      date: recordDate,
      completed: existingRecord.completed,
      value: existingRecord.value,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Habit record updated',
      data: existingRecord
    });
  }

  // Create new record
  const record = await HabitRecord.create({
    userId,
    habitId,
    date: recordDate,
    completed: completed !== undefined ? completed : true,
    value: value || 1,
    targetMet: (value || 1) >= 1,
    note: note || ''
  });

  // Update streaks
  if (record.completed) {
    await updateStreak(userId, habitId, recordDate, true);
  }

  // Publish analytics event
  await mq.publish('analytics', {
    type: 'habit_logged',
    habitId,
    userId,
    date: recordDate,
    completed: record.completed,
    value: record.value,
    timestamp: new Date().toISOString()
  });

  // Publish streak milestone notifications
  const streak = await Streak.findOne({ userId, habitId });
  if (streak && [7, 30, 100, 365].includes(streak.currentStreak)) {
    await mq.publish('notifications', {
      type: 'streak_milestone',
      userId,
      habitId,
      streak: streak.currentStreak,
      timestamp: new Date().toISOString()
    });
  }

  res.status(201).json({
    success: true,
    message: 'Habit logged successfully',
    data: record
  });
});

/**
 * GET /api/tracking/:habitId
 * Get tracking records for a specific habit
 */
const getHabitRecords = asyncHandler(async (req, res) => {
  const { habitId } = req.params;
  const { startDate, endDate, limit = 30 } = req.query;

  const filter = {
    userId: req.user.userId,
    habitId
  };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const records = await HabitRecord.find(filter)
    .sort({ date: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    count: records.length,
    data: records
  });
});

/**
 * GET /api/tracking/today
 * Get today's tracking status for all habits
 */
const getTodayTracking = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await HabitRecord.find({
    userId,
    date: { $gte: today, $lt: tomorrow }
  });

  // Convert to map for easy lookup
  const recordsMap = {};
  records.forEach(r => {
    recordsMap[r.habitId.toString()] = r;
  });

  res.json({
    success: true,
    data: recordsMap
  });
});

/**
 * GET /api/tracking/:habitId/streak
 * Get streak information for a habit
 */
const getStreak = asyncHandler(async (req, res) => {
  const { habitId } = req.params;

  const streak = await Streak.findOne({
    userId: req.user.userId,
    habitId
  });

  if (!streak) {
    return res.json({
      success: true,
      data: {
        currentStreak: 0,
        longestStreak: 0,
        consistencyScore: 0,
        totalCompletions: 0
      }
    });
  }

  res.json({
    success: true,
    data: streak
  });
});

/**
 * GET /api/tracking/stats
 * Get overall tracking statistics
 */
const getTrackingStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { habitId } = req.query;

  const filter = { userId };
  if (habitId) filter.habitId = habitId;

  const stats = await HabitRecord.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        completedCount: {
          $sum: { $cond: ['$completed', 1, 0] }
        },
        targetMetCount: {
          $sum: { $cond: ['$targetMet', 1, 0] }
        },
        averageValue: { $avg: '$value' },
        lastLogged: { $max: '$loggedAt' }
      }
    }
  ]);

  const result = stats[0] || {
    totalRecords: 0,
    completedCount: 0,
    targetMetCount: 0,
    averageValue: 0,
    lastLogged: null
  };

  // Calculate completion rate
  result.completionRate = result.totalRecords > 0
    ? (result.completedCount / result.totalRecords * 100).toFixed(1)
    : 0;

  res.json({
    success: true,
    data: result
  });
});

/**
 * POST /api/tracking/:habitId/unlog
 * Remove a log entry for a specific date
 */
const unlogCompletion = asyncHandler(async (req, res) => {
  const { habitId } = req.params;
  const { date } = req.body;

  if (!date) {
    throw new AppError('Date is required', 400);
  }

  const recordDate = new Date(date);
  recordDate.setHours(0, 0, 0, 0);

  const record = await HabitRecord.findOneAndDelete({
    userId: req.user.userId,
    habitId,
    date: recordDate
  });

  if (!record) {
    throw new AppError('Record not found for the specified date', 404);
  }

  // Recalculate streak
  await recalculateStreak(req.user.userId, habitId);

  res.json({
    success: true,
    message: 'Log entry removed successfully'
  });
});

/**
 * Helper: Update streak after a completion
 */
async function updateStreak(userId, habitId, completionDate, completed) {
  let streak = await Streak.findOne({ userId, habitId });

  if (!streak) {
    // Create new streak
    streak = await Streak.create({
      userId,
      habitId,
      currentStreak: completed ? 1 : 0,
      longestStreak: completed ? 1 : 0,
      streakStartDate: completed ? completionDate : null,
      lastCompletionDate: completed ? completionDate : null,
      totalCompletions: completed ? 1 : 0,
      totalActiveDays: 1,
      consistencyScore: completed ? 100 : 0
    });
    return streak;
  }

  streak.totalActiveDays += 1;

  if (completed) {
    // Check if this extends the current streak
    const lastDate = streak.lastCompletionDate;
    
    if (!lastDate) {
      // First completion
      streak.currentStreak = 1;
      streak.streakStartDate = completionDate;
    } else {
      const daysDiff = Math.floor(
        (completionDate - lastDate) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day - extend streak
        streak.currentStreak += 1;
      } else if (daysDiff > 1) {
        // Streak broken - reset
        streak.currentStreak = 1;
        streak.streakStartDate = completionDate;
      }
      // If daysDiff === 0, it's the same day, don't change streak
    }

    // Update longest streak
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastCompletionDate = completionDate;
    streak.totalCompletions += 1;
  } else {
    // Marked as not completed - check if it breaks streak
    const lastDate = streak.lastCompletionDate;
    if (lastDate) {
      const daysDiff = Math.floor(
        (completionDate - lastDate) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 1) {
        streak.currentStreak = 0;
      }
    }
  }

  // Calculate consistency score
  streak.consistencyScore = streak.totalActiveDays > 0
    ? Math.round((streak.totalCompletions / streak.totalActiveDays) * 100)
    : 0;

  await streak.save();
  return streak;
}

/**
 * Helper: Recalculate streak from scratch (after deletion)
 */
async function recalculateStreak(userId, habitId) {
  const records = await HabitRecord.find({
    userId,
    habitId,
    completed: true
  }).sort({ date: -1 });

  if (records.length === 0) {
    await Streak.findOneAndUpdate(
      { userId, habitId },
      {
        currentStreak: 0,
        lastCompletionDate: null,
        $inc: { totalCompletions: -1 }
      }
    );
    return;
  }

  // Calculate current streak from most recent
  let currentStreak = 1;
  for (let i = 1; i < records.length; i++) {
    const daysDiff = Math.floor(
      (records[i - 1].date - records[i].date) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  await Streak.findOneAndUpdate(
    { userId, habitId },
    {
      currentStreak,
      $inc: { totalCompletions: -1 }
    },
    { upsert: false }
  );
}

module.exports = {
  logCompletion: [logCompletionValidation, logCompletion],
  getHabitRecords,
  getTodayTracking,
  getStreak,
  getTrackingStats,
  unlogCompletion
};
