# 🎯 GymBuddy AI

An AI-powered social fitness matchmaking and real-time coaching platform designed to connect gym partners, track workouts and nutrition, and offer smart recommendations.

---

## 🚀 Live Demo & Status

* **Frontend App**: [https://fullstack-gymbuddy-ai.vercel.app](https://fullstack-gymbuddy-ai.vercel.app)
* **Backend API**: [https://fullstack-gymbuddy-ai-production.up.railway.app](https://fullstack-gymbuddy-ai-production.up.railway.app)
* **API Documentation**: [https://fullstack-gymbuddy-ai-production.up.railway.app/api-docs](https://fullstack-gymbuddy-ai-production.up.railway.app/api-docs)

[![Build Status](https://github.com/sgsatpute/fullstack-GymbuddyAi/actions/workflows/ci.yml/badge.svg)](https://github.com/sgsatpute/fullstack-GymbuddyAi/actions/workflows/ci.yml)
[![Vercel Deployment](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel&logoColor=white)](https://fullstack-gymbuddy-ai.vercel.app)
[![Railway Deployment](https://img.shields.io/badge/Deployed_on-Railway-0B0D19?logo=railway&logoColor=white)](https://fullstack-gymbuddy-ai-production.up.railway.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

### Backend & Database
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

### AI / Machine Learning
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)

---

## ✨ Features

- 🔐 **Secure Authentication**: JWT-based auth with access and refresh tokens, plus password reset using email-based OTPs.
- 🤝 **Gym Partner Matchmaking**: Intelligent geolocation-based and preference-based pairing of workout partners.
- 💬 **Real-Time Interactive Chat**: Instant messaging, online status indicators, typing animations, and emoji reactions using Socket.io.
- 🤖 **AI Workout & Nutrition Coach**: Customized workout plans generated via a trained Random Forest model.
- 🏆 **Gamification & Leaderboard**: Level-up system (XP) with streak tracking and badge rewards to boost user engagement.
- 📊 **Comprehensive Dashboard**: Track daily calorie intake, active workout sessions, and weight progress with Recharts.
- 📧 **Email Notifications**: Integrated email engine for OTPs and match alerts.
- 📁 **Profile & Food Image Uploads**: Local file storage for customized user profiles.
- 🛡️ **Security Safeguards**: Rate-limiting limits on authentication routes, password salting, and safety blocks.

---

## 📸 Screenshots

*Include snapshots of key pages:*

### Dashboard Overview
`[Screenshot here]`

### Matchmaking & Real-Time Chat
`[Screenshot here]`

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `NODE_ENV` | App mode (`development` or `production`) | `development` |
| `PORT` | Backend server port | `5001` |
| `JWT_SECRET` | Secret key used for signing JWTs | `replace-with-a-long-random-secret` |
| `DB_PATH` | Local database path | `server/gymbuddy.db` |
| `ACCESS_TOKEN_TTL` | Lifespan of the JWT Access Token | `15m` |
| `REFRESH_TOKEN_DAYS`| Validity of Refresh Token in days | `7` |
| `SMTP_HOST` | Host address of the SMTP server for emails | (Optional) |
| `SMTP_PORT` | Port of the SMTP server | `587` |
| `SMTP_SECURE` | Use SSL/TLS for SMTP connection | `false` |
| `SMTP_USER` | Email username for SMTP login | (Optional) |
| `SMTP_PASS` | Email password for SMTP login | (Optional) |
| `ANTHROPIC_API_KEY` | Optional key to power premium coach features | (Optional) |
| `GOOGLE_MAPS_API_KEY`| API key to enable Maps geolocation lookup | (Optional) |

---

## 📂 Project Structure

```
.
├── client/                     # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom hooks (e.g. useWebRTC)
│   │   ├── utils/              # API and Socket helpers
│   │   └── App.tsx             # Main React entry point
│   ├── index.html
│   └── vite.config.ts          # Vite configuration
├── server/                     # Backend (Node.js + Express)
│   ├── index.js                # Server entry point
│   ├── db.js                   # SQLite database connection and schemas
│   ├── config.js               # Server environment config
│   ├── middleware/             # Auth, rate-limiter, error handler
│   ├── routes/                 # Express API endpoints
│   ├── utils/                  # Winston logger, AppError, etc.
│   └── ml/                     # Python scripts and trained .pkl files
├── shared/                     # Shared Types and Schemas
├── vercel.json                 # Vercel deployment configuration
├── package.json                # Project dependencies
└── README.md
```

---

## 🛠️ Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)

### Step-by-Step Installation

1. **Clone Repository**:
   ```bash
   git clone https://github.com/sgsatpute/fullstack-GymbuddyAi.git
   cd fullstack-GymbuddyAi
   ```

2. **Install Root and Project Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment variables**:
   Create a `.env` file in the root directory by copying the example:
   ```bash
   cp .env.example .env
   ```
   *(Update your secrets and keys inside `.env`)*

4. **Train the ML model**:
   ```bash
   cd server/ml
   pip install -r requirements.txt
   python train_model.py
   cd ../..
   ```

5. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   - Frontend is available at: [http://localhost:5173](http://localhost:5173)
   - Backend API is available at: [http://localhost:5001](http://localhost:5001)

---

## 📡 API Endpoints

All protected endpoints require a JWT token in the `Authorization: Bearer <token>` header or HttpOnly Cookie.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Log in and retrieve JWT tokens | No |
| `POST` | `/api/auth/logout` | Revoke active session / refresh token | Yes |
| `GET`  | `/api/profile` | Get the profile of the current user | Yes |
| `PUT`  | `/api/profile` | Update the current user profile data | Yes |
| `GET`  | `/api/leaderboard` | Retrieve top 10 users by XP | Yes |
| `GET`  | `/api/matches` | Get current user's matching partners | Yes |
| `POST` | `/api/matches/find` | Find or generate a workout partner match | Yes |
| `GET`  | `/api/chat/messages/:userId` | Get messaging history with a partner | Yes |
| `POST` | `/api/chat/messages` | Send a new direct message | Yes |
| `GET`  | `/api/health` | Service health status check | No |

---

## 📊 Database Schema Overview

We use **SQLite** (local development) and **PostgreSQL** (production deployment).

- **`users`**: Core user accounts including profiles, streaks, experience level (XP), and location details.
- **`messages` / `message_reactions`**: Private chat logs and emoji reaction relationships.
- **`match_feedback`**: Feeds labels (like/dislike) to enhance matching models.
- **`checkins`**: Daily check-in timestamps, keeping track of activity streaks.
- **`workout_sessions`**: Session history logs (type, focus area, duration, intensity, notes).
- **`meal_entries`**: Daily food tracking with macro ratios (protein, carbs, fat, fiber).
- **`badges`**: Game achievements unlocked by users.
- **`blocks`**: Security list keeping track of blocks or reports against other users.
- **`refresh_tokens` / `password_reset_otps`**: Security models managing tokens and reset requests.

---

## 🚀 Deployment Instructions

### Frontend (Vercel)
1. Import the repository into Vercel.
2. In Project Settings, set Build command as `npm run build` and Output Directory as `dist/public`.
3. Set environment variable: `VITE_API_URL` to your production backend URL.
4. Deploy!

### Backend & Database (Railway)
1. Create a new project on Railway.
2. Provision a **PostgreSQL** database service and connect a backend Node service linking to your GitHub repository.
3. Configure the environment variables in Railway (e.g. `JWT_SECRET`, `SMTP_USER`, `DATABASE_URL` for PostgreSQL connection).
4. Railway will automatically build and deploy the backend.

---

## 🔮 Future Improvements

1. **Interactive WebRTC Video Calls**: Implement real-time video coaching between partners.
2. **Push Notifications**: Enable mobile web-push alerts for new partner matches.
3. **Advanced Diet Recognition**: Scan food items directly from uploaded images using computer vision.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more details.
