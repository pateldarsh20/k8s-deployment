# Habit Tracker - Microservices Architecture

A production-ready Habit Tracker application built with a microservices architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Gateway (3000)                         │
│                      Single Entry Point + Auth Middleware               │
└────┬──────────┬──────────────┬──────────────┬───────────────┬───────────┘
     │          │              │              │               │
     ▼          ▼              ▼              ▼               ▼
┌─────────┐┌──────────┐┌───────────┐┌────────────┐┌──────────────┐
│  User   ││  Habit   ││ Tracking  ││ Analytics  ││ Notification │
│ Service ││ Service  ││  Service  ││  Service   ││   Service    │
│  (3001) ││  (3002)  ││  (3003)   ││  (3004)    ││   (3005)     │
└────┬────┘└────┬─────┘└─────┬─────┘└─────┬──────┘└──────┬───────┘
     │          │             │             │              │
     ▼          ▼             ▼             ▼              ▼
┌─────────┐┌──────────┐┌───────────┐┌────────────┐┌──────────────┐
│ MongoDB ││ MongoDB  ││  MongoDB  ││  MongoDB   ││   MongoDB    │
│   :27017││  :27018  ││  :27019   ││  :27020    ││   :27021     │
└─────────┘└──────────┘└───────────┘└────────────┘└──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Message Queue   │
                    │  (RabbitMQ:5672)  │
                    │  Notifications +  │
                    │  Analytics Events │
                    └───────────────────┘
```

## Services & Responsibilities

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway** | 3000 | Request routing, authentication middleware, rate limiting |
| **User Service** | 3001 | Authentication (JWT), user profiles, login/signup |
| **Habit Service** | 3002 | CRUD operations for habits, scheduling, habit types |
| **Tracking Service** | 3003 | Log completions, streaks, consistency scoring |
| **Analytics Service** | 3004 | Insights, trends, heatmaps, completion rates |
| **Notification Service** | 3005 | Reminders, scheduling, retry mechanism |

## Habit Types

- **binary**: Yes/No completion (e.g., "Did you meditate?")
- **count**: Numeric count (e.g., "Drank 8 glasses of water")
- **time**: Time-based (e.g., "Ran for 30 minutes")
- **negative**: Avoiding behavior (e.g., "No social media")

## Schedule Types

- **daily**: Every day
- **weekly**: Specific days of the week
- **custom**: Custom recurrence pattern

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB (per service)
- **Message Queue**: RabbitMQ
- **Authentication**: JWT
- **Containerization**: Docker + Docker Compose
- **Frontend**: React

## Quick Start

```bash
# Build and start all services
docker-compose up --build

# Or run individual services
cd services/user-service && npm install && npm run dev
```

## API Endpoints

See individual service documentation for detailed API specs.

## Design Principles

- **Loose Coupling**: Services communicate via REST APIs and message queues
- **High Cohesion**: Each service owns its data and logic
- **Independent Deployability**: Each service can be deployed separately
- **Scalability**: Services can be scaled independently based on load
