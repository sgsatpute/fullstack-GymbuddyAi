# Vercel Deployment Guide for GymBuddy AI

## ⚠️ Important Considerations

This is a **full-stack application** with a Node.js backend, React frontend, WebSockets, SQLite database, and Python ML models. Vercel has limitations for certain aspects:

### Challenges:
1. **SQLite Database**: File-based databases don't persist in Vercel's serverless environment (ephemeral `/tmp`)
2. **WebSockets (Socket.io)**: Difficult to manage in serverless functions due to 10-second timeout limits
3. **Python ML Models**: Not directly supported on Vercel
4. **Long-running processes**: Vercel functions timeout after 60 seconds

## 🎯 Recommended Deployment Strategies

### Option 1: Recommended - Separate Frontend & Backend (Most Reliable)
**Deploy Frontend to Vercel + Backend to Railway/Render**

**Advantages:**
- Frontend gets Vercel's global CDN and edge infrastructure
- Backend has proper Node.js server environment
- WebSockets work reliably
- Database persistence guaranteed
- ML models can run properly

**Steps:**

#### Frontend on Vercel:
1. Push your project to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set root directory to `./client`
5. Set build command to `npm run build`
6. Set output directory to `dist`
7. Add environment variable: `VITE_API_URL=https://your-backend-url.com`

#### Backend on Railway/Render:
1. Push the full repository to GitHub
2. Go to [railway.app](https://railway.app) or [render.com](https://render.com)
3. Create new project → Deploy from GitHub
4. Select your repository
5. Configure:
   - Build command: `npm install`
   - Start command: `npm run start`
   - Environment variables from `.env.production.example`

### Option 2: Full Stack on Vercel (Workaround)
**Limitations:** WebSockets won't work, polling only, database won't persist

## 📋 Deployment Steps for Option 1 (Recommended)

### 1. Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/repo.git
git push -u origin main
```

### 2. Deploy Frontend to Vercel
- Visit https://vercel.com/new
- Import your GitHub repository
- Project settings:
  - **Root Directory**: `./client`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Environment Variables**:
    - `VITE_API_URL`: `https://your-backend-url.com`

### 3. Deploy Backend to Railway
- Visit https://railway.app/dashboard
- Click "New Project" → "Deploy from GitHub"
- Select your repository
- Configure:
  - **Root Directory**: `.`
  - **Build Command**: `npm install`
  - **Start Command**: `npm run start`
  - **Environment Variables** (add all from `.env.production.example`):
    ```
    NODE_ENV=production
    PORT=5001
    JWT_SECRET=<long-random-string>
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your-email@gmail.com
    SMTP_PASS=your-app-password
    ... (all other vars)
    ```
  - **SQL Database**: Add PostgreSQL or MongoDB (Railway provides this)

### 4. Update Client API Configuration
Update `client/src/utils/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
```

Update `client/src/utils/socket.ts`:
```typescript
import io from 'socket.io-client';
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
export const socket = io(SOCKET_URL);
```

### 5. Handle Database Migration to PostgreSQL
Update your database configuration to use PostgreSQL instead of SQLite:
```javascript
// server/db.js - Replace better-sqlite3 with PostgreSQL
import pg from 'pg';
// Configure your Drizzle ORM for PostgreSQL
```

## 🔐 Environment Variables to Set

Required in production:
- `JWT_SECRET`: Long random string (32+ chars)
- `SMTP_USER`: Your email
- `SMTP_PASS`: App-specific password
- `DATABASE_URL`: PostgreSQL connection string (from Railway)
- `VITE_API_URL`: Your backend domain

## 📊 ML Models Deployment
For Python ML models in `server/ml/`:
- Option A: Keep them on backend only (called via API)
- Option B: Use Railway's Python support
- Option C: Deploy separately to Modal or Hugging Face Spaces

## 🚀 Quick Start Commands

```bash
# Local development
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Database migrations
npm run db:push
```

## ✅ Verification Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Render
- [ ] Environment variables configured
- [ ] Database migrated to PostgreSQL
- [ ] CORS configured in backend
- [ ] API URL pointing to backend
- [ ] Socket.io connection working
- [ ] ML models accessible via API

## 🔗 Useful Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Socket.io with Vercel](https://socket.io/docs/v4/serverless-compatibility/)

## 💡 Alternative: Docker Container on Railway
For the full stack, consider containerizing:
```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "run", "start"]
```

---

**Questions?** Check the Vercel/Railway dashboards or feel free to update the configuration!
