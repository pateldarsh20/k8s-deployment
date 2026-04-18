const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'analytics-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

router.get('/ready', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'Database not connected' });
  }
});

module.exports = router;
