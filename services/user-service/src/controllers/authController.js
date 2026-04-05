const User = require('../models/User');
const { generateToken } = require('../../shared/middleware/auth');
const { AppError, asyncHandler } = require('../../shared/utils/errorHandler');
const { body, validationResult } = require('express-validator');
const mq = require('../../shared/utils/messageQueue');

/**
 * Authentication Controller
 * Handles signup, login, token refresh, and profile management
 */

// Validation rules
const signupValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * POST /api/auth/signup
 * Create a new user account
 */
const signup = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  // Create user
  const user = await User.create({ name, email, password });

  // Generate JWT token
  const token = generateToken(user);

  // Send welcome notification event (non-blocking - don't delay signup response)
  mq.publish('notifications', {
    type: 'welcome',
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    timestamp: new Date().toISOString()
  }).catch(err => console.error('Failed to send welcome notification:', err.message));

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: user.toSafeJSON(),
      token
    }
  });
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { email, password } = req.body;

  // Find user and include password field
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 403);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate token
  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toSafeJSON(),
      token
    }
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: user.toSafeJSON()
  });
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar, preferences } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (avatar !== undefined) updateFields.avatar = avatar;
  if (preferences) updateFields.preferences = { ...preferences };

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    updateFields,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user.toSafeJSON()
  });
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }

  const user = await User.findById(req.user.userId).select('+password');
  
  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * GET /api/users/:id
 * Get user by ID (public profile info)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Return limited public info
  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      avatar: user.avatar,
      memberSince: user.stats.memberSince
    }
  });
});

module.exports = {
  signup: [signupValidation, signup],
  login: [loginValidation, login],
  getProfile,
  updateProfile,
  changePassword,
  getUserById
};
