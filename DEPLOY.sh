#!/bin/bash
# Quick Deployment Guide for GymBuddy AI to Vercel + Railway

echo "🚀 GymBuddy AI Deployment Setup"
echo "================================"
echo ""
echo "This guide will help you deploy:"
echo "  ✓ Frontend to Vercel (Global CDN)"
echo "  ✓ Backend to Railway (Reliable Node.js Server)"
echo ""

# Step 1: Prepare GitHub Repository
echo "📋 STEP 1: Prepare Repository"
echo "Run these commands:"
echo ""
echo "  git init"
echo "  git add ."
echo "  git commit -m 'Initial commit: GymBuddy AI'"
echo "  git branch -M main"
echo "  git remote add origin https://github.com/YOUR_USERNAME/gymbuddy-ai.git"
echo "  git push -u origin main"
echo ""
echo "⏸️  Push to GitHub first, then continue..."
echo ""

# Step 2: Vercel Frontend
echo "📋 STEP 2: Deploy Frontend to Vercel"
echo "====================================="
echo ""
echo "1. Go to https://vercel.com/dashboard"
echo "2. Click 'Add New' → 'Project'"
echo "3. Import your GitHub repository"
echo "4. Configure:"
echo "   Project Name: gymbuddy-ai"
echo "   Root Directory: ./client"
echo "   Framework: Vite"
echo "   Build Command: npm run build"
echo "   Output Directory: dist"
echo "   Install Command: npm install"
echo ""
echo "5. Add Environment Variables:"
echo "   VITE_API_URL: https://YOUR-RAILWAY-DOMAIN.up.railway.app"
echo ""
echo "6. Click 'Deploy'"
echo ""
echo "✅ Your frontend URL: https://YOUR-PROJECT.vercel.app"
echo ""

# Step 3: Railway Backend
echo "📋 STEP 3: Deploy Backend to Railway"
echo "===================================="
echo ""
echo "1. Go to https://railway.app"
echo "2. Click 'Start a New Project' → 'Deploy from GitHub'"
echo "3. Authorize and select your repository"
echo "4. Railway will auto-detect Node.js"
echo "5. Configure variables:"
echo "   Settings → Variables → Raw Editor"
echo ""
echo "   Paste the following environment variables:"
cat > /tmp/railway-env.txt << 'EOF'
NODE_ENV=production
PORT=5001
JWT_SECRET=your-super-secret-key-min-32-characters-long
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
SMTP_PASS=your-app-specific-password
SMTP_FROM=GymBuddy AI <no-reply@gymbuddy.ai>
VITE_APP_NAME=GymBuddy AI
EOF
cat /tmp/railway-env.txt
echo ""
echo "6. Start the deployment"
echo "✅ Your backend URL: https://YOUR-PROJECT-up.railway.app"
echo ""

# Step 4: Connect Frontend to Backend
echo "📋 STEP 4: Update Vercel Environment Variables"
echo "=============================================="
echo ""
echo "After Railway deployment:"
echo "1. Go to Vercel project settings"
echo "2. Environment Variables"
echo "3. Update VITE_API_URL with your Railway domain"
echo "4. Redeploy"
echo ""

# Step 5: Testing
echo "📋 STEP 5: Test Your Deployment"
echo "=============================="
echo ""
echo "1. Visit your Vercel frontend URL"
echo "2. Check Network tab in DevTools"
echo "3. API calls should go to Railway domain"
echo "4. Socket.io connection should establish"
echo ""

# Step 6: Important Notes
echo "📋 IMPORTANT NOTES"
echo "=================="
echo ""
echo "⚠️  SQLite Database:"
echo "    - Current SQLite won't persist on Railway's free tier"
echo "    - Recommended: Add PostgreSQL database"
echo "    - In Railway: New → Database → PostgreSQL"
echo "    - Update connection string in environment"
echo ""
echo "⚠️  Python ML Models:"
echo "    - Keep scripts for training locally"
echo "    - Expose trained models via API endpoints"
echo "    - Store models in AWS S3 or similar"
echo ""
echo "🔐 Security:"
echo "    - Never commit .env files"
echo "    - Use strong JWT_SECRET (32+ characters)"
echo "    - Rotate secrets after deployment"
echo ""

echo "✨ Deployment Complete!"
echo ""
echo "Frontend: https://YOUR-PROJECT.vercel.app"
echo "Backend:  https://YOUR-PROJECT-up.railway.app"
echo ""
echo "For detailed documentation, see: VERCEL_DEPLOYMENT.md"
