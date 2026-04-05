# API Documentation

Complete API reference for the Habit Tracker microservices system.

**Base URL:** `http://localhost:3000` (via API Gateway)

## Authentication

All endpoints (except signup/login) require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## 1. User Service (`/api/auth`)

### POST /api/auth/signup
Create a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
      "name": "John Doe",
      "email": "john@example.com",
      "preferences": { ... },
      "stats": { ... }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /api/auth/login
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### GET /api/auth/me
Get current user profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": null,
    "preferences": {
      "timezone": "UTC",
      "notificationEnabled": true
    },
    "stats": {
      "totalHabitsCreated": 5,
      "totalCompletions": 120,
      "longestStreak": 30
    }
  }
}
```

### PUT /api/auth/profile
Update user profile.

**Request:**
```json
{
  "name": "John Updated",
  "preferences": {
    "timezone": "America/New_York"
  }
}
```

### POST /api/auth/change-password
Change password.

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

---

## 2. Habit Service (`/api/habits`)

### POST /api/habits
Create a new habit.

**Request:**
```json
{
  "name": "Morning Meditation",
  "description": "10 minutes of mindfulness",
  "type": "binary",
  "color": "#4CAF50",
  "icon": "meditation",
  "schedule": {
    "type": "daily",
    "daysOfWeek": [0, 1, 2, 3, 4, 5, 6]
  },
  "reminders": [
    {
      "time": "07:00",
      "enabled": true,
      "message": "Time for morning meditation!"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Habit created successfully",
  "data": {
    "_id": "...",
    "userId": "...",
    "name": "Morning Meditation",
    "type": "binary",
    "schedule": { ... },
    "tracking": {
      "currentStreak": 0,
      "longestStreak": 0,
      "totalCompletions": 0
    },
    "status": "active"
  }
}
```

### GET /api/habits
Get all habits (with optional filters).

**Query Params:**
- `status`: `active`, `paused`, `archived`
- `type`: `binary`, `count`, `time`, `negative`
- `schedule`: `daily`, `weekly`, `custom`

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [ ... ]
}
```

### GET /api/habits/today
Get habits due today.

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [ ... ]
}
```

### GET /api/habits/:id
Get single habit.

### PUT /api/habits/:id
Update habit.

### DELETE /api/habits/:id
Soft delete (archive) habit.

### POST /api/habits/:id/pause
Pause a habit.

### POST /api/habits/:id/resume
Resume a paused habit.

### GET /api/habits/stats/summary
Get habit statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalHabits": 10,
    "activeHabits": 7,
    "pausedHabits": 2,
    "archivedHabits": 1,
    "totalCompletions": 250,
    "longestStreak": 45,
    "habitsByType": ["binary", "count", "time"]
  }
}
```

---

## 3. Tracking Service (`/api/tracking`)

### POST /api/tracking/log
Log habit completion.

**Request:**
```json
{
  "habitId": "64f5a1b2c3d4e5f6a7b8c9d0",
  "date": "2026-04-04",
  "value": 1,
  "note": "Felt really focused today"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Habit logged successfully",
  "data": {
    "_id": "...",
    "habitId": "...",
    "userId": "...",
    "date": "2026-04-04T00:00:00.000Z",
    "completed": true,
    "value": 1,
    "targetMet": true,
    "note": "Felt really focused today"
  }
}
```

### GET /api/tracking/today
Get today's tracking status.

### GET /api/tracking/stats
Get tracking statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRecords": 150,
    "completedCount": 120,
    "targetMetCount": 115,
    "averageValue": 1.2,
    "completionRate": "80.0"
  }
}
```

### GET /api/tracking/:habitId
Get records for a habit.

**Query Params:**
- `startDate`: ISO date
- `endDate`: ISO date
- `limit`: number (default 30)

### GET /api/tracking/:habitId/streak
Get streak information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "currentStreak": 14,
    "longestStreak": 45,
    "consistencyScore": 85,
    "totalCompletions": 120
  }
}
```

### POST /api/tracking/:habitId/unlog
Remove a log entry.

**Request:**
```json
{
  "date": "2026-04-04"
}
```

---

## 4. Analytics Service (`/api/analytics`)

### GET /api/analytics/completion-rate
Get completion rate for date range.

**Query Params:**
- `startDate`: ISO date
- `endDate`: ISO date
- `habitId`: habit ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": { "start": "...", "end": "..." },
    "totalDays": 30,
    "habitsDue": 150,
    "habitsCompleted": 120,
    "completionRate": 80.0,
    "dailyBreakdown": [ ... ]
  }
}
```

### GET /api/analytics/trends
Get trend data.

**Query Params:**
- `days`: number (default 30)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trendDirection": "improving",
    "period": { "days": 30 },
    "dataPoints": [ ... ]
  }
}
```

### GET /api/analytics/heatmap
Get heatmap data for calendar view.

**Query Params:**
- `months`: number (default 3)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "startDate": "...",
    "endDate": "...",
    "entries": [
      {
        "date": "2026-04-01",
        "count": 5,
        "total": 7,
        "rate": 71.4,
        "intensity": 3
      }
    ]
  }
}
```

### GET /api/analytics/best-days
Get best performing days.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bestDay": {
      "day": "Monday",
      "dayOfWeek": 1,
      "avgCompletionRate": "92.5"
    },
    "worstDay": {
      "day": "Saturday",
      "dayOfWeek": 6,
      "avgCompletionRate": "65.0"
    },
    "allDays": [ ... ]
  }
}
```

### GET /api/analytics/insights
Get comprehensive insights.

**Query Params:**
- `days`: number (default 30)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": { "days": 30 },
    "totalDays": 28,
    "overallCompletionRate": 78.5,
    "currentConsistencyStreak": 14,
    "bestDay": {
      "name": "Monday",
      "avgRate": "92.5"
    },
    "insights": [
      "Good progress at 78.5% completion. Try to push for 80%!",
      "Monday is your most productive day..."
    ]
  }
}
```

### GET /api/analytics/weekly-report
Get weekly summary report.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "week": {
      "start": "...",
      "end": "...",
      "totalDue": 35,
      "totalCompleted": 28,
      "completionRate": 80.0
    },
    "previousWeek": {
      "completionRate": 75.0
    },
    "weekOverWeek": {
      "change": 5.0,
      "direction": "improved"
    }
  }
}
```

---

## 5. Notification Service (`/api/notifications`)

### GET /api/notifications
Get user notifications.

**Query Params:**
- `status`: `pending`, `sent`, `failed`
- `unreadOnly`: `true`
- `limit`: number (default 20)

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "unreadCount": 2,
  "data": [
    {
      "_id": "...",
      "type": "reminder",
      "title": "Habit Reminder",
      "message": "Time to complete your habit!",
      "status": "sent",
      "isRead": false,
      "scheduledAt": "..."
    }
  ]
}
```

### PUT /api/notifications/:id/read
Mark notification as read.

### PUT /api/notifications/read-all
Mark all as read.

### DELETE /api/notifications/:id
Delete notification.

### GET /api/notifications/stats
Get notification statistics.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common Status Codes:**
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing token)
- `403`: Forbidden (invalid token)
- `404`: Not Found
- `409`: Conflict (duplicate email)
- `500`: Internal Server Error

---

## Health Checks

Each service exposes a health endpoint:

```
GET /health           - Service health status
GET /health/ready     - Readiness probe
```

**Response:**
```json
{
  "success": true,
  "service": "user-service",
  "status": "healthy",
  "timestamp": "2026-04-04T12:00:00.000Z",
  "uptime": 12345.67,
  "database": "connected"
}
```

Gateway aggregates all service health:

```
GET /health
```
