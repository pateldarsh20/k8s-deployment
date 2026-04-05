import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
  getProfile: () => api.get('/api/auth/me'),
  updateProfile: (data) => api.put('/api/auth/profile', data),
  changePassword: (data) => api.post('/api/auth/change-password', data)
};

// Habits API
export const habitsAPI = {
  getAll: (params) => api.get('/api/habits', { params }),
  getToday: () => api.get('/api/habits/today'),
  getById: (id) => api.get(`/api/habits/${id}`),
  create: (data) => api.post('/api/habits', data),
  update: (id, data) => api.put(`/api/habits/${id}`, data),
  delete: (id) => api.delete(`/api/habits/${id}`),
  pause: (id) => api.post(`/api/habits/${id}/pause`),
  resume: (id) => api.post(`/api/habits/${id}/resume`),
  getStats: () => api.get('/api/habits/stats/summary')
};

// Tracking API
export const trackingAPI = {
  log: (data) => api.post('/api/tracking/log', data),
  getToday: () => api.get('/api/tracking/today'),
  getStats: (params) => api.get('/api/tracking/stats', { params }),
  getRecords: (habitId, params) => api.get(`/api/tracking/${habitId}`, { params }),
  getStreak: (habitId) => api.get(`/api/tracking/${habitId}/streak`),
  unlog: (habitId, data) => api.post(`/api/tracking/${habitId}/unlog`, data)
};

// Analytics API
export const analyticsAPI = {
  getCompletionRate: (params) => api.get('/api/analytics/completion-rate', { params }),
  getTrends: (params) => api.get('/api/analytics/trends', { params }),
  getHeatmap: (params) => api.get('/api/analytics/heatmap', { params }),
  getBestDays: () => api.get('/api/analytics/best-days'),
  getInsights: (params) => api.get('/api/analytics/insights', { params }),
  getWeeklyReport: () => api.get('/api/analytics/weekly-report')
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/api/notifications', { params }),
  getStats: () => api.get('/api/notifications/stats'),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/read-all'),
  delete: (id) => api.delete(`/api/notifications/${id}`)
};

export default api;
