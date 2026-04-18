# Development Guide

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (or use Docker)
- RabbitMQ (or use Docker)

### Quick Start with Docker

```bash
# Build and start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost
# API Gateway: http://localhost:3000
# RabbitMQ Dashboard: http://localhost:15672 (guest/guest)
```

### Local Development

1. **Install dependencies for all services:**

```bash
cd services/user-service && npm install
cd ../habit-service && npm install
cd ../tracking-service && npm install
cd ../analytics-service && npm install
cd ../notification-service && npm install
cd ../api-gateway && npm install
cd ../../frontend && npm install
```

2. **Start MongoDB instances** (use different ports):

```bash
# MongoDB for Users (port 27017)
mongod --port 27017 --dbpath /data/db-users

# MongoDB for Habits (port 27018)
mongod --port 27018 --dbpath /data/db-habits

# MongoDB for Tracking (port 27019)
mongod --port 27019 --dbpath /data/db-tracking

# MongoDB for Analytics (port 27020)
mongod --port 27020 --dbpath /data/db-analytics

# MongoDB for Notifications (port 27021)
mongod --port 27021 --dbpath /data/db-notifications
```

3. **Start RabbitMQ:**

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

4. **Configure environment variables:**

Copy `.env.example` to `.env` in each service directory and adjust as needed.

5. **Start services (in separate terminals):**

```bash
# Terminal 1
cd services/user-service && npm run dev

# Terminal 2
cd services/habit-service && npm run dev

# Terminal 3
cd services/tracking-service && npm run dev

# Terminal 4
cd services/analytics-service && npm run dev

# Terminal 5
cd services/notification-service && npm run dev

# Terminal 6
cd services/api-gateway && npm run dev

# Terminal 7
cd frontend && npm start
```

---

## Example Flow: Complete User Journey

### 1. User Signs Up

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
      "name": "John Doe",
      "email": "john@example.com",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**What happens behind the scenes:**
- User Service creates user in MongoDB
- JWT token is generated
- Welcome notification is published to RabbitMQ
- Notification Service consumes and stores the notification

---

### 2. User Creates a Habit

```bash
curl -X POST http://localhost:3000/api/habits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Morning Meditation",
    "description": "10 minutes of mindfulness",
    "type": "binary",
    "schedule": { "type": "daily" },
    "reminders": [{ "time": "07:00", "enabled": true }],
    "color": "#4CAF50"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Habit created successfully",
  "data": {
    "_id": "habit123",
    "name": "Morning Meditation",
    "type": "binary",
    ...
  }
}
```

**Behind the scenes:**
- Habit Service saves to MongoDB
- Reminder event published to RabbitMQ
- Notification Service schedules the 7:00 AM daily reminder
- Analytics event published for tracking

---

### 3. User Logs Habit Completion

```bash
curl -X POST http://localhost:3000/api/tracking/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "habitId": "habit123",
    "note": "Felt really focused today"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Habit logged successfully",
  "data": {
    "_id": "record456",
    "habitId": "habit123",
    "completed": true,
    "value": 1,
    ...
  }
}
```

**Behind the scenes:**
- Tracking Service creates record in MongoDB
- Streak is updated (current streak = 1)
- Analytics event published to RabbitMQ
- Analytics Service consumes and updates daily summary

---

### 4. User Views Analytics

```bash
curl http://localhost:3000/api/analytics/insights?days=7 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "days": 7 },
    "totalDays": 7,
    "overallCompletionRate": 85.7,
    "currentConsistencyStreak": 7,
    "bestDay": {
      "name": "Monday",
      "avgRate": "100.0"
    },
    "insights": [
      "Amazing! You're completing 85.7% of your habits. Keep it up!",
      "Monday is your most productive day..."
    ]
  }
}
```

---

## Service Communication Diagram

```
User Request
     │
     ▼
┌─────────────┐
│ API Gateway │ ← Validates JWT, routes request
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Target Service   │ ← Processes request, updates own DB
└──────┬───────────┘
       │
       ▼
┌──────────────────┐     ┌────────────────────┐
│   RabbitMQ       │────▶│ Consumer Services  │
│   (Events)       │     │ (Async Processing) │
└──────────────────┘     └────────────────────┘
```

---

## Scaling Services

Each service can be scaled independently:

```bash
# Scale habit service to 3 instances
docker-compose up --scale habit-service=3
```

In production, use:
- **Kubernetes** for orchestration
- **Horizontal Pod Autoscaler** for automatic scaling
- **Load balancer** for distributing traffic

---

## Monitoring & Observability

### Health Checks

```bash
# Check gateway and all services
curl http://localhost:3000/health

# Check individual service
curl http://localhost:3001/health
```

### RabbitMQ Dashboard

Access at `http://localhost:15672` (guest/guest) to monitor:
- Queue depths
- Message rates
- Consumer connections

---

## Testing

```bash
# Run tests for a service
cd services/user-service && npm test

# Run all tests
npm test --workspaces
```

---

## Project Structure

```
habit-tracker/
├── shared/                       # Shared utilities
│   ├── middleware/
│   │   └── auth.js              # JWT authentication
│   └── utils/
│       ├── errorHandler.js       # Error handling
│       └── messageQueue.js       # RabbitMQ client
│
├── services/
│   ├── user-service/             # Port 3001
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── database.js
│   │   │   ├── models/
│   │   │   │   └── User.js
│   │   │   ├── controllers/
│   │   │   │   └── authController.js
│   │   │   ├── routes/
│   │   │   │   └── authRoutes.js
│   │   │   └── server.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── habit-service/            # Port 3002
│   ├── tracking-service/         # Port 3003
│   ├── analytics-service/        # Port 3004
│   ├── notification-service/     # Port 3005
│   └── api-gateway/              # Port 3000
│
├── frontend/                     # React App
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Signup.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Habits.js
│   │   │   ├── Analytics.js
│   │   │   └── Notifications.js
│   │   ├── App.js
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── README.md
└── API.md
```

---

## Environment Variables

### Common Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Service port | Varies |
| `JWT_SECRET` | JWT signing key | `habit-tracker-secret-key` |
| `MONGODB_URI` | MongoDB connection | Varies |
| `RABBITMQ_URL` | RabbitMQ connection | `amqp://localhost:5672` |

---

## Troubleshooting

### Service won't start

1. Check if MongoDB is running on the correct port
2. Verify `.env` file exists with correct values
3. Check logs: `docker-compose logs <service-name>`

### Database connection issues

```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017
```

### RabbitMQ issues

```bash
# Check RabbitMQ status
docker exec habit-tracker-rabbitmq rabbitmq-diagnostics ping
```

---

## Production Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use environment-specific MongoDB credentials
- [ ] Set up SSL/TLS for API Gateway
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure log aggregation (ELK Stack)
- [ ] Set up CI/CD pipeline
- [ ] Configure backups for all databases
- [ ] Set up alerting for service failures
