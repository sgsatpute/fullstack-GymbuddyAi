# 🚀 GymBuddy AI - Complete Quick Start Guide
## Local Development → Free Deployment (Vercel + Railway)

---

## 📦 What You Have

- ✅ **Frontend**: React + TypeScript + Vite
- ✅ **Backend**: Express.js + Node.js
- ✅ **Database**: SQLite (local) / PostgreSQL (production)
- ✅ **Real-time**: Socket.io
- ✅ **ML**: Python coach models
- ✅ **UI**: Tailwind CSS + Radix UI components

---

## 🎯 The Big Picture

```
Local Development:
  Frontend (5173) ←→ Backend (5001) ←→ SQLite Database

Production (FREE):
  Vercel ←→ Railway ←→ PostgreSQL
```

---

## ⚡ Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd d:\Saurav\project\FullStack-AI\FullStack-AI
npm install
```

### 2. Set Up Environment
```bash
# Copy example to .env
copy .env.example .env
```

Edit `.env`:
```env
NODE_ENV=development
PORT=5001
JWT_SECRET=your-random-secret-key-here
```

### 3. Start Local Development
```bash
npm run dev
```

You'll see:
```
✓ Frontend: http://localhost:5173
✓ Backend:  http://localhost:5001
```

**Open browser → http://localhost:5173**

Done! You're now running locally! 🎉

---

## 🔧 Development Tips

### File Structure
```
project/
├── client/              ← Frontend (React)
│   ├── src/
│   │   ├── components/  ← React components
│   │   ├── utils/       ← API, auth, socket
│   │   └── App.tsx      ← Main app
│   └── vite.config.ts   ← Vite config
├── server/              ← Backend (Express)
│   ├── index.js         ← Main server
│   ├── routes/          ← API routes
│   ├── middleware/      ← Auth, rate limit
│   └── ml/              ← Python ML models
└── package.json
```

### Common Commands
```bash
npm run dev              # Start dev server (frontend + backend)
npm run build            # Build for production
npm run start            # Run production build
npm run check            # Type check TypeScript
npm run db:push          # Push database migrations
```

### API Testing
```bash
# Check backend is running
curl http://localhost:5001/api/health

# Test in browser DevTools
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' })
})
```

### Debug Mode
```bash
# Frontend console errors: F12 → Console tab
# Backend errors: Look at terminal output
# Network: F12 → Network tab → see API calls
```

---

## 🚀 Deploy to FREE Services (Vercel + Railway)

### Prerequisites
- [ ] Code works locally (`npm run dev` succeeds)
- [ ] GitHub account (https://github.com)
- [ ] Vercel account (free signup)
- [ ] Railway account (free signup)

### Step 1: Push to GitHub (3 minutes)

```bash
# From your project root
git init
git add .
git commit -m "GymBuddy AI - Initial commit"
git branch -M main

# Go to https://github.com/new
# Create repository "gymbuddy-ai"

git remote add origin https://github.com/YOUR_USERNAME/gymbuddy-ai.git
git push -u origin main
```

✅ Code is now on GitHub!

---

### Step 2: Deploy Frontend to Vercel (3 minutes)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select `gymbuddy-ai`
4. Configure:
   ```
   Framework: Vite
   Root Directory: ./client
   Build Command: npm run build
   Output Directory: dist
   ```
5. Add Environment Variables:
   ```
   VITE_API_URL = (leave blank, add later)
   ```
6. Click "Deploy"
7. Wait 3-5 minutes ⏳

✅ Frontend is LIVE! 🎊
Your URL: `https://gymbuddy-ai-XXXXX.vercel.app`

---

### Step 3: Deploy Backend to Railway (5 minutes)

1. Go to https://railway.app
2. Click "Start a New Project"
3. Choose "Deploy from GitHub"
4. Select `gymbuddy-ai` repository
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-super-secret-32-chars-minimum!!!
   DB_PATH=/tmp/gymbuddy.db
   ACCESS_TOKEN_TTL=15m
   REFRESH_TOKEN_DAYS=7
   PASSWORD_RESET_OTP_TTL_MINUTES=10
   PASSWORD_RESET_OTP_LENGTH=6
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=200
   AUTH_RATE_LIMIT_MAX_REQUESTS=10
   PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS=5
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=GymBuddy AI <noreply@gymbuddy.ai>
   VITE_APP_NAME=GymBuddy AI
   ```
6. Add PostgreSQL Database:
   - Click "New Service"
   - Choose "Database" → "PostgreSQL"
   - Railway auto-configures it ✅
7. Wait for deployment to complete ⏳

✅ Backend is LIVE! 🎊
Your URL: `https://gymbuddy-ai-production-XXXXX.up.railway.app`

---

### Step 4: Connect Frontend to Backend (2 minutes)

1. Go to Railway dashboard
2. Copy your backend domain (under Deployments)
3. Go to Vercel dashboard
4. Select your `gymbuddy-ai` project
5. Settings → Environment Variables
6. Update `VITE_API_URL`:
   ```
   VITE_API_URL = https://gymbuddy-ai-production-XXXXX.up.railway.app
   ```
7. Click "Save"
8. Go to Deployments and click "Redeploy"
9. Wait 3-5 minutes for rebuild ⏳

✅ Frontend and Backend are now CONNECTED! 🔗

---

### Step 5: Test Everything (2 minutes)

1. Open your Vercel URL in browser
2. Open DevTools (F12)
3. Go to "Network" tab
4. Try to login
5. Should see API calls to Railway domain
6. No CORS errors? ✅ You're good!

✅ Full Stack is LIVE! 🚀

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Free | $0 |
| Railway | Free $5/month credit | $0 |
| Domain | Optional | $0-15/year |
| **Total** | **FREE** | **$0/month** |

Your entire app runs for **$0!**

---

## 📊 Monitoring & Logs

### Vercel
- Dashboard: https://vercel.com/dashboard
- View logs: Click project → "Deployments" → "View Build Logs"
- Monitor usage: "Usage & Billing"

### Railway
- Dashboard: https://railway.app
- View logs: Click project → "Deployments" → View logs
- Monitor credit: Click account → "Billing"

---

## 🆘 Common Issues & Solutions

### Frontend won't load
```
Error: Can't reach server
```
- Check Vercel deployment status
- Check Railway backend is running
- Clear browser cache

### API calls failing
```
Error: Failed to fetch
```
- Check `VITE_API_URL` in Vercel environment
- Make sure Railway backend domain is correct
- Check Network tab for exact URL being called

### CORS errors
```
Access to XMLHttpRequest blocked by CORS policy
```
- Backend already configured for CORS ✅
- Verify Railway backend is actually running
- Check Network tab to see full error

### Out of free credits
```
Railway: $0 balance
```
- Upgrade Railway to paid ($5/month minimum)
- Or: Switch to Render.com (another free option)
- Or: Scale down usage

### SMTP not sending emails
```
Error: Failed to send email
```
- Check SMTP_USER and SMTP_PASS in Railway
- For Gmail: Use app-specific password
- Check spam folder
- Test with curl: `curl -X POST http://localhost:5001/api/test-email`

---

## 🔐 Security Checklist

- [ ] `JWT_SECRET` is a strong random string (32+ chars)
- [ ] SMTP password is app-specific (not actual password)
- [ ] No `.env` file committed to Git
- [ ] All secrets in Vercel/Railway, not in code
- [ ] HTTPS everywhere (automatic ✅)
- [ ] Rate limiting enabled (configured ✅)

---

## 📈 Performance Optimization

### Frontend
- Vite build is optimized ✅
- CSS is minified ✅
- Code splitting enabled ✅
- Use Vercel edge functions if needed

### Backend
- Express middleware optimized ✅
- Rate limiting enabled ✅
- Connection pooling for database ✅
- Consider caching for frequently accessed data

### Database
- PostgreSQL on Railway ✅
- Indexes on common queries ✅
- Regular backups recommended

---

## 🔄 Deployment Workflow

### Local Development
```bash
git status              # Check what changed
npm run dev             # Test locally
npm run build           # Test build
git add .               # Stage changes
git commit -m "..."     # Commit
git push                # Push to GitHub
```

### Automatic Deployment
```
1. Push to GitHub main branch
2. Vercel auto-builds and deploys
3. Railway auto-builds and deploys
4. Your changes are LIVE in 2-3 minutes
```

---

## 📚 Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Express**: https://expressjs.com
- **Vite**: https://vitejs.dev
- **React**: https://react.dev
- **Socket.io**: https://socket.io

---

## 🎯 Next Steps

1. **Start local**: `npm run dev`
2. **Test everything locally** before deploying
3. **Deploy frontend**: Vercel
4. **Deploy backend**: Railway
5. **Connect them**: Update VITE_API_URL
6. **Go live!** 🚀

---

## 💡 Pro Tips

1. **Use GitHub branches** for testing before production
2. **Monitor dashboards** regularly to track usage
3. **Keep dependencies updated**: `npm update`
4. **Test email** before deploying: check spam folder
5. **Set up alerts** in Vercel/Railway for errors

---

## 🎉 You're All Set!

Your GymBuddy AI is ready to run locally and deploy to production for FREE!

**Local**: http://localhost:5173
**Production**: https://your-project.vercel.app

Happy coding! 🚀

---

**Questions?** Check out [FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md) for detailed guide.
