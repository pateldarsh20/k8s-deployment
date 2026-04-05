# HabitFlow — Habit Tracker

A production-ready habit tracker built with a microservices architecture, featuring a dark-themed React frontend, real-time analytics, and event-driven data processing.

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

| Type | Description | Example |
|------|-------------|---------|
| **binary** | Yes/No completion | "Did you meditate?" |
| **count** | Numeric count | "Drank 8 glasses of water" |
| **time** | Time-based | "Ran for 30 minutes" |
| **negative** | Avoiding behavior | "No social media today" |

## Schedule Types

- **daily** — Every day
- **weekly** — Specific days of the week (e.g., Mon–Fri)
- **custom** — Custom recurrence pattern

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB (one per service)
- **Message Queue**: RabbitMQ
- **Authentication**: JWT
- **Containerization**: Docker + Docker Compose
- **Frontend**: React (dark theme, Syne + DM Sans fonts)

## Quick Start

```bash
# Build and start all services
docker-compose up -d --build

# Check service health
curl http://localhost:3000/health

# Frontend is available at
# http://localhost:80
```

## Demo Account

A pre-seeded demo account is available with **20 days of tracking data** across 5 habits:

| Field | Value |
|-------|-------|
| **URL** | `http://localhost:80` |
| **Email** | `demo@habittracker.com` |
| **Password** | `demo123456` |

### Pre-loaded Habits

| Habit | Type | Schedule |
|-------|------|----------|
| Morning Meditation | time (10 min) | Daily |
| Read 30 Pages | count (30 pages) | Daily |
| Exercise | time (30 min) | Weekdays only |
| Drink 8 Glasses of Water | count (8 glasses) | Daily |
| Journal Writing | binary | Daily |

## Features

### Dashboard
- Today's habit checklist with one-click toggle
- Completion rate %, day streak, weekly stats
- Personalized insights ("Sunday is your most productive day")

### Habits
- Create habits with type selector (Yes/No, Count, Duration, Avoid)
- Color picker with presets + custom color
- Pause/resume and delete habits
- Schedule habits for specific days

### Analytics
- **Trend Overview** — Improving / Declining / Stable badge
- **Activity Heatmap** — GitHub-style calendar (last 3 months, 5 intensity levels)
- **Best Days** — Ranked days of the week with completion percentages
- **Weekly Report** — Week-over-week comparison

### Notifications
- Unread badge with pulsing dot
- Mark individual or all as read
- Delete notifications

## API Endpoints

### Auth (no token required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Authenticate |

### Habits (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/habits` | Create habit |
| GET | `/api/habits` | List all habits |
| GET | `/api/habits/today` | Today's habits |
| GET | `/api/habits/:id` | Get habit by ID |
| PUT | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit |
| POST | `/api/habits/:id/pause` | Pause habit |
| POST | `/api/habits/:id/resume` | Resume habit |

### Tracking (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tracking/log` | Log habit completion |
| GET | `/api/tracking/today` | Today's records |
| GET | `/api/tracking/stats` | Tracking statistics |
| GET | `/api/tracking/:habitId` | Habit records |
| GET | `/api/tracking/:habitId/streak` | Habit streak |

### Analytics (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/insights` | Comprehensive insights |
| GET | `/api/analytics/trends` | Trend direction + data points |
| GET | `/api/analytics/heatmap` | Calendar heatmap |
| GET | `/api/analytics/best-days` | Best/worst days of week |
| GET | `/api/analytics/weekly-report` | Weekly summary |

### Notifications (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/stats` | Notification stats |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

## Project Structure

```
habit-tracker/
├── frontend/src/
│   ├── App.js                  # Router, header, layout
│   ├── App.css                 # All styles (dark theme)
│   ├── context/AuthContext.js  # Auth state & logic
│   ├── services/api.js         # API client
│   └── pages/                  # Page components
├── services/
│   ├── api-gateway/            # Gateway (routing, auth, rate limit)
│   ├── user-service/           # Auth & profiles
│   ├── habit-service/          # Habit CRUD
│   ├── tracking-service/       # Completions & streaks
│   ├── analytics-service/      # Insights & trends
│   └── notification-service/   # Reminders
├── shared/                     # Shared middleware & utils
├── docker-compose.yml          # Full stack orchestration
└── seed_data.py                # Demo data generator
```

## Design Principles

- **Loose Coupling** — Services communicate via REST APIs and message queues
- **High Cohesion** — Each service owns its data and logic
- **Independent Deployability** — Each service can be deployed separately
- **Scalability** — Services scale independently based on load
- **Event-Driven Analytics** — Tracking service publishes events; analytics service consumes asynchronously
