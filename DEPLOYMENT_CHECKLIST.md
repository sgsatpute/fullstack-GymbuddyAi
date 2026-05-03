# Deployment Checklist

## Pre-Deployment ✅

- [ ] Review `DEPLOYMENT_READY.md` (START HERE!)
- [ ] Read `VERCEL_DEPLOYMENT.md` for detailed guide
- [ ] Run `npm run build` locally and verify success
- [ ] Run `npm run start` locally and test the app
- [ ] All tests passing locally: `npm run check`

## Repository Setup ✅

- [ ] Create GitHub repository
- [ ] Push all code to GitHub (git push origin main)
- [ ] GitHub repository is public (or connected to Vercel)
- [ ] `.gitignore` excludes `.env` and `node_modules`
- [ ] Verify no sensitive data in codebase

## Vercel Frontend Deployment ✅

- [ ] Create Vercel account (https://vercel.com)
- [ ] Import GitHub repository
- [ ] Configure project:
  - [ ] Root Directory: `./client`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
  - [ ] Install Command: `npm install`
- [ ] Add environment variable:
  - [ ] `VITE_API_URL=https://YOUR-RAILWAY-BACKEND.up.railway.app`
- [ ] Deploy frontend
- [ ] Verify frontend is accessible at vercel URL

## Railway Backend Deployment ✅

- [ ] Create Railway account (https://railway.app)
- [ ] Create new project from GitHub
- [ ] Configure:
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm run start`
- [ ] Add all environment variables from `.env.production.example`:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=5001`
  - [ ] `JWT_SECRET` (strong random string)
  - [ ] `DB_PATH=/tmp/gymbuddy.db`
  - [ ] `ACCESS_TOKEN_TTL=15m`
  - [ ] `REFRESH_TOKEN_DAYS=7`
  - [ ] `PASSWORD_RESET_OTP_TTL_MINUTES=10`
  - [ ] `PASSWORD_RESET_OTP_LENGTH=6`
  - [ ] `RATE_LIMIT_WINDOW_MS=900000`
  - [ ] `RATE_LIMIT_MAX_REQUESTS=200`
  - [ ] `AUTH_RATE_LIMIT_MAX_REQUESTS=10`
  - [ ] `PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS=5`
  - [ ] `SMTP_HOST=smtp.gmail.com`
  - [ ] `SMTP_PORT=587`
  - [ ] `SMTP_SECURE=false`
  - [ ] `SMTP_USER=your-email@gmail.com`
  - [ ] `SMTP_PASS=your-app-password`
  - [ ] `SMTP_FROM=GymBuddy AI <no-reply@gymbuddy.ai>`
  - [ ] `VITE_APP_NAME=GymBuddy AI`
- [ ] (Optional) Add PostgreSQL database
- [ ] Deploy backend
- [ ] Note backend domain: `https://YOUR-PROJECT.up.railway.app`

## Post-Deployment Testing ✅

- [ ] Access frontend URL in browser
- [ ] Check browser console for errors
- [ ] Test API calls (Network tab shows correct domain)
- [ ] Verify login/auth works
- [ ] Test socket.io connection
- [ ] Check real-time features (chat, notifications)
- [ ] Verify CORS is working
- [ ] Test file uploads if applicable

## Production Configuration ✅

- [ ] `VITE_API_URL` set correctly in Vercel
- [ ] Backend environment variables all set in Railway
- [ ] SMTP credentials working (test sending email)
- [ ] JWT_SECRET is strong and random
- [ ] No sensitive data in logs
- [ ] HTTPS working (automatic with Vercel/Railway)
- [ ] CORS headers configured correctly

## Database Setup (If Using PostgreSQL) ✅

- [ ] PostgreSQL database created in Railway
- [ ] Database URL obtained
- [ ] Environment variable `DATABASE_URL` set in Railway
- [ ] Database migrations run: `npm run db:push`
- [ ] Verify database connection working

## Monitoring & Maintenance ✅

- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor Vercel dashboard for errors
- [ ] Monitor Railway dashboard for backend health
- [ ] Set up alerts for deployment failures
- [ ] Regular backups of database
- [ ] Monitor performance metrics
- [ ] Check logs regularly

## ML Models Deployment ✅

- [ ] Python scripts remain local for training
- [ ] Trained models exposed via API endpoints
- [ ] Consider cloud storage for model persistence
- [ ] Document ML model update process
- [ ] Version control for model files

## Security Final Check ✅

- [ ] No `.env` files committed to Git
- [ ] All secrets in environment variables only
- [ ] HTTPS enforced (automatic)
- [ ] Rate limiting enabled (already configured)
- [ ] CORS properly configured
- [ ] JWT secrets are strong (32+ characters)
- [ ] Regular security updates for dependencies

## Documentation ✅

- [ ] Document deployment steps for team
- [ ] Create runbook for common issues
- [ ] Document environment variables
- [ ] Document backup procedures
- [ ] Create incident response plan

## Launch! 🚀

- [ ] All above items completed
- [ ] Team notified of live URLs
- [ ] Domain configured (if using custom domain)
- [ ] Monitor first 24 hours closely
- [ ] Be ready to rollback if needed

---

## Quick Reference

**Frontend**: https://YOUR-PROJECT.vercel.app
**Backend**: https://YOUR-PROJECT.up.railway.app

**Emergency Rollback**:
- Vercel: Click "Deployments" → Previous version → "Promote"
- Railway: Click "Deployments" → Previous version → "View" → "Deploy"

**Need Help?**
- Vercel Support: https://vercel.com/support
- Railway Support: https://railway.app/support
- Check logs in respective dashboards
