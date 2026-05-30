# GymBuddy AI

[![Live Demo](https://img.shields.io/badge/Live%20Demo-online-brightgreen)](https://fullstack-gymbuddyai-production.up.railway.app)
[![Railway](https://img.shields.io/badge/Backend-Railway-6f42c1)](https://railway.app)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933)](https://nodejs.org)
[![CI](https://github.com/sgsatpute/fullstack-GymbuddyAi/actions/workflows/ci.yml/badge.svg)](https://github.com/sgsatpute/fullstack-GymbuddyAi/actions/workflows/ci.yml)

GymBuddy AI is a social fitness platform that matches gym-goers with compatible workout partners.
Unlike solo tracking apps, GymBuddy focuses on motivation through community.
It combines real-time chat, group challenges, AI-powered compatibility matching, nutrition insights, and gamified progress.
The result is a fitness app designed around accountability, not just logging.

## Features

- 🔐 JWT + bcrypt authentication with refresh-token support
- 💬 Real-time Socket.io chat with typing, delivery, and read receipts
- 🧠 ML-powered compatibility matching with scores and reasons
- 🤖 Streaming AI coach powered by Gemini or Anthropic Claude
- 🏋️ Personalized workout plans from a scikit-learn model
- 🍎 AI nutrition logging with Indian food database and OpenFoodFacts
- 📊 Recharts dashboards for training, nutrition, and body progress
- 🏆 XP, levels, badges, streaks, and leaderboard competition
- 👥 Gym groups, invite codes, group challenges, and group activity feeds
- 📍 Location-aware matching by city and gym landmark
- 🔔 In-app notifications with Socket.io fanout
- 🖼️ Profile pages with avatar upload and achievement display
- 🚫 User blocking and safety reporting
- 📧 Email notifications with Nodemailer
- 🐳 Docker, CI, Railway deploy workflow, health check, and structured logs

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | React 18, TypeScript, Tailwind CSS, TanStack Query, react-hook-form, Zod, Recharts, framer-motion, Socket.io-client, lucide-react |
| Backend | Node.js 20, Express 4, ES Modules, Passport.js, JWT, bcryptjs, Socket.io 4, Drizzle ORM, Nodemailer, multer, express-rate-limit |
| AI + ML | Google Gemini, Anthropic Claude, Python, scikit-learn, pandas, numpy, joblib |
| DevOps | Docker, Docker Compose, GitHub Actions, Railway, Vercel, Husky, Pino |

## Screenshots

| Dashboard | Matches | Coach |
| --- | --- | --- |
| Add screenshot | Add screenshot | Add screenshot |

| Nutrition | Groups | Profile |
| --- | --- | --- |
| Add screenshot | Add screenshot | Add screenshot |

## Local Setup

```bash
git clone https://github.com/sgsatpute/fullstack-GymbuddyAi.git
cd fullstack-GymbuddyAi
cp .env.example .env
npm install
npm run db:push
npm run dev
```

## Docker Quick Start

```bash
docker-compose up --build
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment |
| `PORT` | Express server port |
| `JWT_SECRET` | Token signing secret |
| `DB_PATH` | Local SQLite database path |
| `DATABASE_URL` | PostgreSQL connection URL for production |
| `ACCESS_TOKEN_TTL` | Access token lifetime |
| `REFRESH_TOKEN_DAYS` | Refresh-token lifetime in days |
| `SMTP_HOST` | Email server host |
| `SMTP_PORT` | Email server port |
| `SMTP_SECURE` | Whether SMTP uses TLS |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender address |
| `AI_PROVIDER` | AI provider to use: `gemini` or `anthropic` |
| `GEMINI_API_KEY` | Google AI Studio key for free-tier Gemini coach and food analysis |
| `GEMINI_MODEL` | Gemini model name, defaults to `gemini-2.5-flash` |
| `ANTHROPIC_API_KEY` | Optional Claude API key for coach and food analysis |
| `ANTHROPIC_MODEL` | Anthropic model name |
| `GOOGLE_MAPS_API_KEY` | Google Maps key for location matching |
| `GOOGLE_MAPS_REGION` | Maps region hint |

## Project Structure

```text
client/
  src/
    components/
    hooks/
    utils/
server/
  middleware/
  ml/
  routes/
  utils/
shared/
  schema.ts
  routes.ts
```

## API Highlights

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/register` | Register user |
| `POST /api/auth/login` | Login user |
| `GET /api/users/me` | Current profile |
| `GET /api/matches` | Ranked smart matches |
| `GET /api/matches/compatibility/:userId` | Compatibility breakdown |
| `GET /api/chat` | Conversation list |
| `POST /api/coach/message` | Streaming AI coach reply |
| `POST /api/coach/workout-plan` | Generate workout plan |
| `GET /api/nutrition/search` | Indian foods + OpenFoodFacts search |
| `POST /api/nutrition/analyze-text` | AI meal analysis |
| `GET /api/gamification/profile` | XP, level, streak, badges |
| `GET /api/notifications` | Latest in-app notifications |

## AI Features

Gemini or Anthropic Claude powers the streaming coach, daily advice, workout-plan generation, body-progress summaries, nutrition analysis, and meal plans. Use `AI_PROVIDER=gemini` with a Google AI Studio key for the easiest free-tier setup, or switch to `AI_PROVIDER=anthropic` with Claude credits later. The Python ML model recommends workout plans from age, goal, experience, availability, BMI, schedule, and training history. The food logger combines a curated Indian food catalog with OpenFoodFacts and AI analysis. The project is ready for MCP-style integrations around external coaching, nutrition, and deployment workflows.

## GymBuddy AI vs SparkyFitness

| Capability | GymBuddy AI | SparkyFitness |
| --- | --- | --- |
| Social matching | Compatibility engine, reasons, chat | Limited or solo-first |
| Group challenges | Invite groups, leaderboards, feed | Not core |
| AI coach | Streaming Claude with user memory | Coach-style guidance |
| Nutrition | Indian foods, OpenFoodFacts, AI analysis | General tracking |
| Gamification | XP, badges, levels, streak freeze | Habit tracking |
| Real-time | Presence, typing, read receipts, notifications | Limited |

## What I Would Add Next

- PostgreSQL Drizzle migration hardening for Railway production
- End-to-end Playwright coverage for auth, matches, chat, nutrition, and coach
- Native mobile shell with push notifications
- Admin dashboard for reports, moderation, and metrics
- Wearable import support for workouts, calories, heart rate, and sleep

## Remove Bad Files From Git Tracking

Run these once if database files are already tracked in GitHub:

```bash
git rm --cached gymbuddy.db
git rm --cached "*.db"
git commit -m "fix: remove database files from tracking"
git push origin main
```

## Author

Built by [sgsatpute](https://github.com/sgsatpute).
