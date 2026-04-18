const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../../shared/middleware/auth');

/**
 * Public routes (no authentication required)
 */
// POST /api/auth/signup - Create new user
router.post('/signup', authController.signup);

// POST /api/auth/login - Authenticate user
router.post('/login', authController.login);

/**
 * Protected routes (authentication required)
 */
// GET /api/auth/me - Get current user profile
router.get('/me', authenticateToken, authController.getProfile);

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, authController.updateProfile);

// POST /api/auth/change-password - Change password
router.post('/change-password', authenticateToken, authController.changePassword);

/**
 * Public user lookup
 */
// GET /api/users/:id - Get user by ID
router.get('/users/:id', authenticateToken, authController.getUserById);

module.exports = router;
