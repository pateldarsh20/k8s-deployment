require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('./middleware/auth');
const proxyRoutes = require('./routes/proxy');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  // Disable contentSecurityPolicy for API gateway as it can interfere with proxy
  contentSecurityPolicy: false,
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased from 100 for seeding
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan('combined'));

// Health check (no auth required)
app.use('/health', healthRoutes);

// Welcome route (no auth required)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Habit Tracker API Gateway',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/health'
  });
});

// Authentication middleware (applied before proxy)
app.use(authenticateToken);

// API Documentation route
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Habit Tracker API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/signup': 'Create a new user account',
        'POST /api/auth/login': 'Authenticate and get token',
        'GET /api/auth/me': 'Get current user profile',
        'PUT /api/auth/profile': 'Update user profile',
        'POST /api/auth/change-password': 'Change password'
      },
      habits: {
        'POST /api/habits': 'Create a new habit',
        'GET /api/habits': 'Get all habits',
        'GET /api/habits/today': 'Get today\'s habits',
        'GET /api/habits/stats/summary': 'Get habit statistics',
        'GET /api/habits/:id': 'Get habit by ID',
        'PUT /api/habits/:id': 'Update habit',
        'DELETE /api/habits/:id': 'Delete habit',
        'POST /api/habits/:id/pause': 'Pause habit',
        'POST /api/habits/:id/resume': 'Resume habit'
      },
      tracking: {
        'POST /api/tracking/log': 'Log habit completion',
        'GET /api/tracking/today': 'Get today\'s tracking',
        'GET /api/tracking/stats': 'Get tracking statistics',
        'GET /api/tracking/:habitId': 'Get habit records',
        'GET /api/tracking/:habitId/streak': 'Get habit streak',
        'POST /api/tracking/:habitId/unlog': 'Remove log entry'
      },
      analytics: {
        'GET /api/analytics/completion-rate': 'Get completion rate',
        'GET /api/analytics/trends': 'Get trend data',
        'GET /api/analytics/heatmap': 'Get heatmap data',
        'GET /api/analytics/best-days': 'Get best performing days',
        'GET /api/analytics/insights': 'Get comprehensive insights',
        'GET /api/analytics/weekly-report': 'Get weekly report'
      },
      notifications: {
        'GET /api/notifications': 'Get user notifications',
        'GET /api/notifications/stats': 'Get notification stats',
        'PUT /api/notifications/:id/read': 'Mark as read',
        'PUT /api/notifications/read-all': 'Mark all as read',
        'DELETE /api/notifications/:id': 'Delete notification'
      }
    }
  });
});

// Proxy routes to microservices
app.use(proxyRoutes);

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start server
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║           🎯 Habit Tracker API Gateway                  ║');
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log(`║  🚀 Running on: http://localhost:${PORT}                   ║`);
      console.log(`║  📍 Environment: ${process.env.NODE_ENV || 'development'}                          ║`);
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log('║  Services:                                               ║');
      console.log('║  • User Service:         http://localhost:3001           ║');
      console.log('║  • Habit Service:        http://localhost:3002           ║');
      console.log('║  • Tracking Service:     http://localhost:3003           ║');
      console.log('║  • Analytics Service:    http://localhost:3004           ║');
      console.log('║  • Notification Service: http://localhost:3005           ║');
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log('║  API Docs: http://localhost:3000/api/docs                ║');
      console.log('║  Health:   http://localhost:3000/health                  ║');
      console.log('╚══════════════════════════════════════════════════════════╝');
    });

    return server;
  } catch (err) {
    console.error('Failed to start gateway:', err);
    process.exit(1);
  }
};

module.exports = { app, startServer };

if (require.main === module) {
  startServer();
}
