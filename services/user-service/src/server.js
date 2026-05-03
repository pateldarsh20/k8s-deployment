require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const { errorHandler, AppError } = require('../shared/utils/errorHandler');
const mq = require('../shared/utils/messageQueue');

const promMid = require('express-prometheus-middleware');
const app = express();

app.use(promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5]
}));

// Fast health check for Kubernetes probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", service: "user-service", timestamp: Date.now() });
});

app.get('/api/crash', (req, res) => {
  console.log('Crashing pod...');
  res.send('Pod crashing now');
  process.exit(1);
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', authRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
let server;

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mq.close();
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Connect to message queue (non-blocking - don't delay server startup)
    mq.connect().catch(err => console.warn('MQ connection deferred:', err.message));

    // Start listening
    server = app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Export for testing
module.exports = { app, startServer };

// Start if running directly
if (require.main === module) {
  startServer();
}
