const Habit = require('../models/Habit');
const { AppError, asyncHandler } = require('../../shared/utils/errorHandler');
const { body, validationResult } = require('express-validator');
const mq = require('../../shared/utils/messageQueue');

/**
 * Habit Controller
 * CRUD operations for habits
 */

// Validation rules
const createHabitValidation = [
  body('name').trim().notEmpty().withMessage('Habit name is required')
    .isLength({ max: 100 }).withMessage('Habit name cannot exceed 100 characters'),
  body('type').isIn(['binary', 'count', 'time', 'negative']).withMessage('Invalid habit type'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('schedule.type').optional().isIn(['daily', 'weekly', 'custom']).withMessage('Invalid schedule type'),
  body('schedule.daysOfWeek').optional().isArray().withMessage('Days of week must be an array'),
  body('color').optional().isHexColor().withMessage('Invalid hex color'),
];

const updateHabitValidation = [
  body('name').optional().trim().notEmpty().withMessage('Habit name cannot be empty')
    .isLength({ max: 100 }).withMessage('Habit name cannot exceed 100 characters'),
  body('type').optional().isIn(['binary', 'count', 'time', 'negative']).withMessage('Invalid habit type'),
  body('status').optional().isIn(['active', 'paused', 'archived']).withMessage('Invalid status'),
  body('color').optional().isHexColor().withMessage('Invalid hex color'),
];

/**
 * POST /api/habits
 * Create a new habit
 */
const createHabit = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { name, description, type, target, schedule, reminders, color, icon, tracking } = req.body;

  const habitData = {
    userId: req.user.userId,
    name,
    description: description || '',
    type,
    target: target || { value: 1, unit: 'none' },
    schedule: schedule || { type: 'daily', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    reminders: reminders || [],
    color: color || '#4CAF50',
    icon: icon || 'check',
    tracking: tracking || { allowBackdate: false, requireNote: false, currentStreak: 0, longestStreak: 0, totalCompletions: 0 }
  };

  const habit = await Habit.create(habitData);

  // Publish event for notification service to set up reminders
  if (reminders && reminders.length > 0) {
    await mq.publish('notifications', {
      type: 'schedule_reminder',
      habitId: habit._id.toString(),
      userId: habit.userId.toString(),
      reminders: reminders,
      timestamp: new Date().toISOString()
    });
  }

  // Publish analytics event
  await mq.publish('analytics', {
    type: 'habit_created',
    habitId: habit._id.toString(),
    userId: habit.userId.toString(),
    habitType: type,
    schedule: habit.schedule.type,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    message: 'Habit created successfully',
    data: habit
  });
});

/**
 * GET /api/habits
 * Get all habits for authenticated user with filtering
 */
const getHabits = asyncHandler(async (req, res) => {
  const { status, type, schedule, includeArchived } = req.query;

  const filter = { userId: req.user.userId };

  // Status filter
  if (status) {
    filter.status = status;
  } else if (!includeArchived) {
    filter.status = { $in: ['active', 'paused'] };
  }

  // Type filter
  if (type) {
    filter.type = type;
  }

  // Schedule filter
  if (schedule) {
    filter['schedule.type'] = schedule;
  }

  const habits = await Habit.find(filter).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: habits.length,
    data: habits
  });
});

/**
 * GET /api/habits/today
 * Get habits that are due today
 */
const getTodayHabits = asyncHandler(async (req, res) => {
  const today = new Date().getDay();

  const habits = await Habit.find({
    userId: req.user.userId,
    status: 'active',
    $or: [
      { 'schedule.type': 'daily' },
      { 'schedule.type': 'weekly', 'schedule.daysOfWeek': today },
      { 'schedule.type': 'custom' }
    ]
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: habits.length,
    data: habits
  });
});

/**
 * GET /api/habits/:id
 * Get a single habit by ID
 */
const getHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findById(req.params.id);

  if (!habit) {
    throw new AppError('Habit not found', 404);
  }

  // Verify ownership
  if (habit.userId.toString() !== req.user.userId) {
    throw new AppError('Not authorized to access this habit', 403);
  }

  res.json({
    success: true,
    data: habit
  });
});

/**
 * PUT /api/habits/:id
 * Update a habit
 */
const updateHabit = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const habit = await Habit.findById(req.params.id);

  if (!habit) {
    throw new AppError('Habit not found', 404);
  }

  // Verify ownership
  if (habit.userId.toString() !== req.user.userId) {
    throw new AppError('Not authorized to update this habit', 403);
  }

  // Update allowed fields
  const allowedFields = ['name', 'description', 'type', 'target', 'schedule', 'reminders', 'color', 'icon', 'tracking', 'status', 'endDate'];
  const updates = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Handle nested updates
  if (req.body.schedule) {
    updates.schedule = { ...habit.schedule, ...req.body.schedule };
  }

  if (req.body.target) {
    updates.target = { ...habit.target, ...req.body.target };
  }

  if (req.body.tracking) {
    updates.tracking = { ...habit.tracking, ...req.body.tracking };
  }

  // Handle reminders update - publish to notification service
  if (req.body.reminders !== undefined) {
    await mq.publish('notifications', {
      type: 'update_reminder',
      habitId: habit._id.toString(),
      userId: habit.userId.toString(),
      reminders: req.body.reminders,
      timestamp: new Date().toISOString()
    });
  }

  const updatedHabit = await Habit.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Habit updated successfully',
    data: updatedHabit
  });
});

/**
 * DELETE /api/habits/:id
 * Soft delete (archive) a habit
 */
const deleteHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findById(req.params.id);

  if (!habit) {
    throw new AppError('Habit not found', 404);
  }

  // Verify ownership
  if (habit.userId.toString() !== req.user.userId) {
    throw new AppError('Not authorized to delete this habit', 403);
  }

  // Soft delete - archive instead of hard delete
  habit.status = 'deleted';
  await habit.save();

  // Publish analytics event
  await mq.publish('analytics', {
    type: 'habit_deleted',
    habitId: habit._id.toString(),
    userId: habit.userId.toString(),
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Habit deleted successfully'
  });
});

/**
 * POST /api/habits/:id/pause
 * Pause a habit
 */
const pauseHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findById(req.params.id);

  if (!habit) {
    throw new AppError('Habit not found', 404);
  }

  if (habit.userId.toString() !== req.user.userId) {
    throw new AppError('Not authorized', 403);
  }

  habit.status = 'paused';
  await habit.save();

  res.json({
    success: true,
    message: 'Habit paused successfully',
    data: habit
  });
});

/**
 * POST /api/habits/:id/resume
 * Resume a paused habit
 */
const resumeHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findById(req.params.id);

  if (!habit) {
    throw new AppError('Habit not found', 404);
  }

  if (habit.userId.toString() !== req.user.userId) {
    throw new AppError('Not authorized', 403);
  }

  if (habit.status !== 'paused') {
    throw new AppError('Can only resume paused habits', 400);
  }

  habit.status = 'active';
  await habit.save();

  res.json({
    success: true,
    message: 'Habit resumed successfully',
    data: habit
  });
});

/**
 * GET /api/habits/stats/summary
 * Get habit statistics summary for user
 */
const getHabitStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const stats = await Habit.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalHabits: { $sum: 1 },
        activeHabits: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        pausedHabits: {
          $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] }
        },
        archivedHabits: {
          $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
        },
        totalCompletions: { $sum: '$tracking.totalCompletions' },
        longestStreak: { $max: '$tracking.longestStreak' },
        habitsByType: {
          $push: '$type'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalHabits: 1,
        activeHabits: 1,
        pausedHabits: 1,
        archivedHabits: 1,
        totalCompletions: 1,
        longestStreak: 1,
        habitsByType: 1
      }
    }
  ]);

  res.json({
    success: true,
    data: stats[0] || {
      totalHabits: 0,
      activeHabits: 0,
      pausedHabits: 0,
      archivedHabits: 0,
      totalCompletions: 0,
      longestStreak: 0,
      habitsByType: []
    }
  });
});

module.exports = {
  createHabit: [createHabitValidation, createHabit],
  getHabits,
  getTodayHabits,
  getHabit,
  updateHabit: [updateHabitValidation, updateHabit],
  deleteHabit,
  pauseHabit,
  resumeHabit,
  getHabitStats
};
