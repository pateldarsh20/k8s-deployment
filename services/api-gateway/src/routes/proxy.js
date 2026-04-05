const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Readable } = require('stream');

const router = express.Router();

/**
 * Service proxy configurations
 */
const serviceProxies = [
  {
    path: '/api/auth',
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    name: 'User Service',
    pathRewrite: { '^/api/auth': '/api' }
  },
  {
    path: '/api/users',
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    name: 'User Service',
    pathRewrite: { '^/api/users': '/api/users' }
  },
  {
    path: '/api/habits',
    target: process.env.HABIT_SERVICE_URL || 'http://localhost:3002',
    name: 'Habit Service',
    pathRewrite: { '^/api/habits': '/api/habits' }
  },
  {
    path: '/api/tracking',
    target: process.env.TRACKING_SERVICE_URL || 'http://localhost:3003',
    name: 'Tracking Service',
    pathRewrite: { '^/api/tracking': '/api/tracking' }
  },
  {
    path: '/api/analytics',
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004',
    name: 'Analytics Service',
    pathRewrite: { '^/api/analytics': '/api/analytics' }
  },
  {
    path: '/api/notifications',
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    name: 'Notification Service',
    pathRewrite: { '^/api/notifications': '/api/notifications' }
  }
];

/**
 * Set up proxy middleware for each service
 */
serviceProxies.forEach(({ path, target, name, pathRewrite }) => {
  router.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite,
      proxyTimeout: 10000,
      onProxyReq: (proxyReq, req, res) => {
        console.log(`🔄 Proxying ${req.method} ${req.originalUrl} → ${target}${proxyReq.path}`);

        // Forward user info if available
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.userId);
          proxyReq.setHeader('x-user-email', req.user.email);
        }

        // Re-send body if it exists (needed for POST/PUT requests)
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
      onError: (err, req, res) => {
        console.error(`❌ Proxy error for ${name}:`, err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: `${name} is currently unavailable`
          });
        }
      }
    })
  );
});

module.exports = router;
