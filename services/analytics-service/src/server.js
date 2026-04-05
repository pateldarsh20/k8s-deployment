require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const analyticsRoutes = require('./routes/analyticsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { errorHandler, AppError } = require('../shared/utils/errorHandler');
const mq = require('../shared/utils/messageQueue');
const { setupConsumers } = require('./services/eventConsumer');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/analytics', analyticsRoutes);
app.use('/health', healthRoutes);

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
