require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler, AppError } = require('../shared/utils/errorHandler');
const mq = require('../shared/utils/messageQueue');
const { setupConsumers, processPendingNotifications } = require('./services/eventConsumer');

const promMid = require('express-prometheus-middleware');
const app = express();

// Fast health check for Kubernetes probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", service: "notification-service", timestamp: Date.now() });
});

app.get('/crash', (req, res) => {
  console.log('Crashing pod...');
  res.send('Pod crashing now');
  process.exit(1);
});

app.use(promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5]
}));
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/notifications', notificationRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

app.use(errorHandler);

let server;

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mq.close();
  });
});

const startServer = async () => {
  try {
    await connectDB();
    mq.connect().catch(err => console.warn('MQ connection deferred:', err.message));

    // Set up message queue consumers (non-blocking)
    setupConsumers().catch(err => console.warn('MQ consumer setup deferred:', err.message));

    // Process pending notifications every 30 seconds
    setInterval(processPendingNotifications, 30000);
    console.log('⏰ Notification scheduler started (30s interval)');

    server = app.listen(PORT, () => {
      console.log(`🚀 Notification Service running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

module.exports = { app, startServer };

if (require.main === module) {
  startServer();
}
