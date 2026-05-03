require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { errorHandler, AppError } = require('../shared/utils/errorHandler');
const mq = require('../shared/utils/messageQueue');
const { setupConsumers } = require('./services/eventConsumer');

const promMid = require('express-prometheus-middleware');
const app = express();

app.use(promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5]
}));

// Fast health check for Kubernetes probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", service: "analytics-service", timestamp: Date.now() });
});

app.get('/api/analytics/crash', (req, res) => {
  console.log('Crashing pod...');
  res.send('Pod crashing now');
  process.exit(1);
});
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/analytics', analyticsRoutes);

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

    // Connect to message queue first
    await mq.connect();

    // Then set up consumers (only after MQ is connected)
    await setupConsumers();

    server = app.listen(PORT, () => {
      console.log(`🚀 Analytics Service running on port ${PORT}`);
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
