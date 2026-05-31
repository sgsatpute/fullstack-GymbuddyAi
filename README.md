# GymBuddy AI

[![Live Demo](https://img.shields.io/badge/Live%20Demo-online-brightgreen)](https://fullstack-gymbuddyai-production.up.railway.app)
[![Railway](https://img.shields.io/badge/Backend-Railway-6f42c1)](https://railway.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933)](https://nodejs.org)
[![CI](https://github.com/sgsatpute/fullstack-GymbuddyAi/actions/workflows/ci.yml/badge.svg)](https://github.com/sgsatpute/fullstack-GymbuddyAi/actions/workflows/ci.yml)

> AI-powered gym partner matching platform built as a full-stack placement portfolio project.

GymBuddy AI helps gym-goers find compatible workout partners based on goal, experience, schedule, location, and activity. It combines real-time chat, AI coaching, nutrition support, groups, XP, streaks, badges, and leaderboard competition so the app feels social instead of just another solo tracker.

## What It Does

- Finds gym partners with compatibility scores and explainable match reasons.
- Supports real-time chat with typing indicators, read receipts, and inbox conversations.
- Provides AI coaching with user memory, workout planning, and daily check-ins.
- Tracks workouts, nutrition, body progress, streaks, XP, levels, and badges.
- Adds social accountability through groups, challenges, notifications, and leaderboards.

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, framer-motion, Socket.io-client, lucide-react |
| Backend | Node.js 20, Express 4, ES modules, JWT, bcryptjs, better-sqlite3, Socket.io, Nodemailer, multer, express-rate-limit |
| AI and ML | Anthropic Claude, Google Gemini fallback, Python, scikit-learn, pandas, numpy, joblib |
| DevOps | Docker, Docker Compose, GitHub Actions, Railway, Vercel-ready frontend build, Husky, Pino logging |

## Core Features

- Smart matching algorithm with weighted scoring across goals, experience, schedule, age, location, and activity.
- Match cards with score, label, reasons, distance insight, and AI-generated intro messages.
- Real-time chat with inbox, typing indicators, delivery and seen state, reactions, and block/report safety.
- AI coach with streaming responses, workout-plan generation, user context, and graceful fallback when keys are missing.
- Nutrition search with Indian food data, OpenFoodFacts integration, AI meal analysis, daily totals, and weekly insights.
- Gamification with XP rewards, level thresholds, achievements, badges, streaks, and streak freeze support.
- Groups with invite codes, member feeds, challenges, group leaderboards, and Socket.io group events.
- Body progress tracking with 90-day history, measurements, mood, sleep, hydration, and AI progress summaries.
- Deployment support with Docker, Railway health checks, GitHub Actions CI, request logging, and production build scripts.

## Running Locally

```bash
git clone https://github.com/sgsatpute/fullstack-GymbuddyAi.git
cd fullstack-GymbuddyAi
cp .env.example .env
npm install
npm run dev
```

Set `JWT_SECRET` in `.env` before sharing or deploying. Development can boot with a fallback secret, but production requires a real value.

## Useful Commands

```bash
npm run dev        # Express API + Vite frontend
npm run build      # Build client and bundled server into dist/
npm start          # Run production bundle
npm run check      # Type-check the React app
npm test           # Run Vitest API tests
npm run ml:train   # Retrain the Python coach model
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment |
| `PORT` | Express server port |
| `JWT_SECRET` | JWT signing secret, required in production |
| `DB_PATH` | SQLite database path |
| `ACCESS_TOKEN_TTL` | Access token lifetime |
| `REFRESH_TOKEN_DAYS` | Refresh-token lifetime in days |
| `AI_PROVIDER` | `gemini` or `anthropic` |
| `GEMINI_API_KEY` | Google AI Studio key for free-tier AI features |
| `ANTHROPIC_API_KEY` | Claude key for coach and nutrition analysis |
| `GOOGLE_MAPS_API_KEY` | Optional location matching and geocoding |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Email delivery for password reset and notifications |
| `CORS_ORIGIN` | Allowed frontend origins in production |

## Architecture

```text
client/
  src/
    components/      React screens and UI components
    hooks/           Socket and gamification hooks
    utils/           API, auth, formatting, shared frontend models
server/
  middleware/        Auth, rate limits, request logging, error handling
  routes/            Express feature routes
  utils/             AI, matching, XP, badges, nutrition, realtime helpers
  ml/                Python model, training data, prediction script
shared/
  schema.ts          Drizzle schema reference
script/
  build.ts           Vite and server bundle build
tests/
  *.test.ts          Vitest API coverage
```

Key design decisions:

- Authentication uses short-lived JWT access tokens plus refresh cookies.
- Feature code is split into Express route modules and shared utility modules.
- SQLite is initialized centrally in `server/db.js`; routes never create their own database connections.
- AI calls are wrapped with fallbacks so the app remains usable without paid keys.
- Socket.io presence and notification helpers are centralized in `server/utils/realtime.js`.

## API Highlights

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login and issue session |
| `POST /api/auth/refresh` | Refresh access token |
| `GET /api/users/me` | Current user profile |
| `POST /api/users/profile` | Complete or update profile |
| `GET /api/matches` | Ranked smart matches |
| `GET /api/matches/compatibility/:userId` | Match score breakdown |
| `POST /api/matches/:id/intro` | Generate AI opener |
| `GET /api/chat` | Conversation list |
| `POST /api/chat/:userId` | Send message |
| `POST /api/coach/message` | Streaming AI coach reply |
| `POST /api/checkin` | Daily streak check-in |
| `GET /api/gamification/profile` | XP, level, streak, badges |
| `GET /api/notifications` | In-app notifications |

## Interview Talking Points

- Explainable compatibility scoring: weighted categories make match quality easy to reason about and debug.
- Real-time system design: Socket.io handles online presence, typing, message delivery, read receipts, notifications, and group events.
- Secure auth flow: bcrypt password hashing, JWT access tokens, refresh tokens, rate-limited auth endpoints, and production-only secret enforcement.
- AI reliability: coach and nutrition features use real model APIs when configured and deterministic fallback responses when unavailable.
- Database ownership: one SQLite connection, centralized schema initialization, indexes for common queries, and defensive migrations for older local databases.
- Product thinking: GymBuddy's social accountability angle differentiates it from normal fitness trackers.

## Screenshots

Add screenshots before portfolio submission:

| Dashboard | Matches | Coach |
| --- | --- | --- |
| Add screenshot | Add screenshot | Add screenshot |

| Nutrition | Groups | Profile |
| --- | --- | --- |
| Add screenshot | Add screenshot | Add screenshot |

## What I Would Add Next

- Playwright end-to-end tests for auth, matching, chat, coach, nutrition, and check-ins.
- PostgreSQL migration path for production scale.
- Admin moderation dashboard for reports and blocked users.
- Push notifications for partner activity and streak reminders.
- Wearable import support for workouts, sleep, calories, and heart rate.

## Author

Built by [sgsatpute](https://github.com/sgsatpute).
