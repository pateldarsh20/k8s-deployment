const jwt = require('jsonwebtoken');

/**
 * Shared JWT Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'habit-tracker-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET || 'habit-tracker-secret-key',
    { expiresIn: '7d' }
  );
};

/**
 * Verify token without middleware (for inter-service calls)
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'habit-tracker-secret-key');
};

module.exports = {
  authenticateToken,
  generateToken,
  verifyToken
};
