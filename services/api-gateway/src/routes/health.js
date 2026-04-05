const express = require('express');
const router = express.Router();

const services = [
  { name: 'User Service', url: process.env.USER_SERVICE_URL || 'http://localhost:3001' },
  { name: 'Habit Service', url: process.env.HABIT_SERVICE_URL || 'http://localhost:3002' },
  { name: 'Tracking Service', url: process.env.TRACKING_SERVICE_URL || 'http://localhost:3003' },
  { name: 'Analytics Service', url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004' },
  { name: 'Notification Service', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005' }
];

/**
 * GET /health
 * Check gateway and all services health
 */
router.get('/', async (req, res) => {
  const serviceHealth = [];

  // Check each service
  for (const service of services) {
    try {
      const response = await fetch(`${service.url}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000) 
      });
      const data = await response.json();
      serviceHealth.push({
        name: service.name,
        status: data.status || 'unknown',
        database: data.database || 'unknown'
      });
    } catch (err) {
      serviceHealth.push({
        name: service.name,
        status: 'unreachable',
        database: 'unknown'
      });
    }
  }

  const allHealthy = serviceHealth.every(s => s.status === 'healthy');

  res.json({
    success: true,
    service: 'api-gateway',
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: serviceHealth
  });
});

/**
 * GET /health/ready
 * Gateway readiness probe
 */
router.get('/ready', (req, res) => {
  res.status(200).json({ ready: true });
});

module.exports = router;
