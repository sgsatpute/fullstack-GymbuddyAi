# GymBuddy AI

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-22c55e?style=for-the-badge)](https://fullstack-gymbuddyai-production.up.railway.app)
[![Railway](https://img.shields.io/badge/Railway-Backend-0f172a?style=for-the-badge&logo=railway)](https://railway.app/)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2563eb?style=for-the-badge&logo=githubactions&logoColor=white)](./.github/workflows/ci.yml)

GymBuddy AI is a social fitness platform that matches gym-goers with compatible workout partners.
Unlike solo tracking apps, GymBuddy focuses on motivation through community and consistency loops.
The platform combines real-time chat, small-group challenges, AI coaching, nutrition support, and compatibility scoring.
It is designed as a premium fitness product with a strong social edge that standalone trackers usually miss.

## Features

- 🤝 Smart compatibility matching with weighted goal, schedule, age, experience, and activity scoring
- 💬 Real-time one-to-one chat with typing indicators, presence, and read receipts
- 🧠 Anthropic-powered coach with context memory, history, daily check-ins, and SSE streaming support
- 🏋️ Workout logging with XP rewards, streak progression, and partner activity notifications
- 🍛 AI nutrition analysis with Indian food shortcuts and OpenFoodFacts search
- 📈 Body progress tracking with 90-day charts and AI-generated summaries
- 🏆 XP, levels, badges, streak freezes, and gamified leaderboard progression
- 👥 Invite-code gym groups with shared feeds and group challenges
- 🥗 Structured meal plans and weekly nutrition insights
- 📍 Location-aware matching using city and training-location metadata
- 🛡️ JWT auth, refresh tokens, bcrypt password hashing, and rate-limited AI routes
- 🖼️ Avatar upload and media-backed nutrition image analysis
- 🔔 In-app notifications for badges, levels, partner activity, and group events
- 📦 Docker, Compose, health checks, and CI/CD workflow scaffolding
- 📊 Shared Drizzle schema mirror plus SQLite runtime bootstrap for fast local setup

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | React 18, TypeScript, Tailwind CSS, framer-motion, TanStack Query, Recharts, Socket.io client |
| Backend | Node.js 20, Express 4, ES Modules, JWT, bcryptjs, Socket.io 4, Nodemailer, express-rate-limit |
| AI + ML | Anthropic Claude, Python, scikit-learn, pandas, numpy, joblib |
| Data | SQLite runtime bootstrap, Drizzle schema mirror, PostgreSQL-ready Docker/compose config |
| DevOps | Vite, esbuild, Docker, GitHub Actions, Railway, Vercel, Husky |

## Screenshots

| Dashboard | Matches | Coach |
| --- | --- | --- |
| `docs/screenshots/dashboard.png` | `docs/screenshots/matches.png` | `docs/screenshots/coach.png` |

| Nutrition | Groups | Body Progress |
| --- | --- | --- |
| `docs/screenshots/nutrition.png` | `docs/screenshots/groups.png` | `docs/screenshots/body-progress.png` |

## Local Setup

```bash
git clone https://github.com/sgsatpute/fullstack-GymbuddyAi.git
cd fullstack-GymbuddyAi
cp .env.example .env
npm install
npm run db:push
npm run dev
```

The app will start on `http://localhost:5001` for the backend and serve the Vite client through the existing build/dev flow.

## Docker Quick Start

```bash
docker-compose up --build
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs and verifies access tokens |
| `PORT` | Backend port, defaults to `5001` |
| `DB_PATH` | SQLite database location for local runtime |
| `DATABASE_URL` | PostgreSQL connection string for future/hosted environments |
| `ACCESS_TOKEN_TTL` | Access token expiration window |
| `REFRESH_TOKEN_DAYS` | Refresh token lifetime |
| `RATE_LIMIT_WINDOW_MS` | Shared API limiter window |
| `RATE_LIMIT_MAX_REQUESTS` | Shared API limiter ceiling |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Auth-specific brute-force protection |
| `PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS` | Password reset limiter |
| `ANTHROPIC_API_KEY` | Claude API access for coach and nutrition AI routes |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Email delivery configuration |
| `SMTP_FROM` | Outbound sender label |
| `GOOGLE_MAPS_API_KEY` | Optional geocoding for location-aware matching |
| `GOOGLE_MAPS_REGION` | Regional bias for geocoding lookups |

## Project Structure

```text
client/
  public/
  src/
server/
  middleware/
  ml/
  routes/
  uploads/
  utils/
shared/
  schema.ts
script/
  build.ts
.github/
  workflows/
```

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/users/me` | Load the signed-in user profile, stats, badges, and XP progress |
| `POST` | `/api/users/profile` | Complete or update the profile used for matching |
| `GET` | `/api/matches` | Return ranked compatibility matches |
| `GET` | `/api/matches/compatibility/:userId` | Detailed compatibility breakdown for a specific user |
| `GET` | `/api/chat/:userId` | Load a direct conversation |
| `POST` | `/api/chat/:userId` | Send a direct message |
| `POST` | `/api/coach/message` | Send a coach message, optionally as SSE streaming |
| `POST` | `/api/coach/workout-plan` | Generate and persist a personalized workout plan |
| `POST` | `/api/nutrition/analyze-text` | Analyze a natural-language meal description |
| `GET` | `/api/nutrition/search?q=` | Search Indian staples first, then OpenFoodFacts |
| `GET` | `/api/gamification/profile` | XP, levels, streak status, and earned badges |
| `POST` | `/api/groups/create` | Create a small gym group with invite code |

## AI Features

### Anthropic Claude

- Coach messaging can stream chunks over Server-Sent Events.
- User context includes profile data, recent workouts, streaks, and leaderboard position.
- Daily check-ins and progress summaries use graceful AI fallbacks if the API is unavailable.

### Python Workout Model

- `server/ml/train_coach.py` generates 1,000 realistic samples and trains a `RandomForestClassifier`.
- The model uses a `ColumnTransformer` with `StandardScaler` and `OneHotEncoder`.
- Prediction output is structured JSON with confidence, alternatives, schedule, and reasoning.

### AI Nutrition

- Natural-language meal analysis returns structured macros and coaching suggestions.
- Weekly pattern analysis highlights likely deficiencies and practical next steps.
- Meal-plan generation can target the user’s preferred calories and training style.

### MCP / Tooling Ready

- Shared schema and Docker setup keep the app ready for future automation and richer deployment pipelines.

## GymBuddy vs SparkyFitness

| Capability | GymBuddy AI | SparkyFitness-style Solo Tracker |
| --- | --- | --- |
| Compatibility-based partner discovery | ✅ Core differentiator | ⚪ Usually absent |
| Real-time social chat | ✅ Built in | ⚪ Rare |
| Small private fitness groups | ✅ Invite-code squads | ⚪ Usually absent |
| AI coach with user memory | ✅ Context-aware | ⚪ Often generic |
| Indian food shortcuts + AI nutrition | ✅ Included | ⚪ Often western-food biased |
| XP, badges, streaks, and leaderboard loops | ✅ Full social gamification | ⚪ Often limited |

## What I Would Add Next

1. Push notifications for streak reminders and partner activity outside the app.
2. Real Postgres-backed Drizzle runtime instead of the current SQLite-first bootstrap.
3. Group challenge progress visualizations and challenge-specific badges.
4. Coach-generated deload weeks and long-term periodization planning.
5. Image-rich screenshot documentation and seeded demo data for onboarding.

## Author

Built by Saurav Satpute.
