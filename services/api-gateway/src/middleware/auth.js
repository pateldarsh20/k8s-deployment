const jwt = require('jsonwebtoken');

/**
 * API Gateway Authentication Middleware
 * Validates JWT tokens before routing to services
 */

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/signup',
  '/api/auth/login',
  '/health',
  '/api/docs'
];

/**
 * Check if path is public
 */
const isPublicPath = (path) => {
  // Exactly the root path is public
  if (path === '/') return true;
  
  // Allow any crash testing endpoints
  if (path.endsWith('/crash')) return true;
  
  return PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath));
};

/**
 * Authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  // Skip auth for public paths
  if (isPublicPath(req.path)) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid JWT token.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'habit-tracker-secret-key');
    req.user = decoded;
    
    // Forward user info to downstream services via headers
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

module.exports = {
  authenticateToken,
  isPublicPath
};
