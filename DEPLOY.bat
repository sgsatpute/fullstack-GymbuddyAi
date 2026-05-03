@echo off
REM Quick Deployment Guide for Windows Users

setlocal enabledelayedexpansion

echo.
echo ============================================
echo GymBuddy AI - Vercel + Railway Deployment
echo ============================================
echo.

echo STEP 1: Push to GitHub
echo =====================
echo.
echo Run these commands:
echo.
echo   git init
echo   git add .
echo   git commit -m "Initial commit: GymBuddy AI"
echo   git branch -M main
echo   git remote add origin https://github.com/YOUR_USERNAME/gymbuddy-ai.git
echo   git push -u origin main
echo.
pause

cls
echo STEP 2: Deploy Frontend to Vercel
echo ==================================
echo.
echo 1. Go to https://vercel.com/dashboard
echo 2. Click "Add New" -^> "Project"
echo 3. Import your GitHub repository
echo 4. Configure:
echo    - Root Directory: ./client
echo    - Build Command: npm run build
echo    - Output Directory: dist
echo.
echo 5. Environment Variables:
echo    - VITE_API_URL: https://YOUR-RAILWAY-DOMAIN.up.railway.app
echo.
echo 6. Click "Deploy"
echo.
echo Your Frontend URL: https://YOUR-PROJECT.vercel.app
echo.
pause

cls
echo STEP 3: Deploy Backend to Railway
echo ==================================
echo.
echo 1. Go to https://railway.app
echo 2. Login/Signup
echo 3. New Project -^> Deploy from GitHub
echo 4. Select your repository
echo.
echo 5. Add Environment Variables:
echo.
echo    NODE_ENV=production
echo    PORT=5001
echo    JWT_SECRET=your-super-secret-key
echo    SMTP_HOST=smtp.gmail.com
echo    SMTP_PORT=587
echo    SMTP_USER=your-email@gmail.com
echo    SMTP_PASS=your-app-password
echo.
echo 6. Railway will start deployment automatically
echo.
echo Your Backend URL: https://YOUR-PROJECT.up.railway.app
echo.
pause

cls
echo STEP 4: Update Frontend Environment
echo ====================================
echo.
echo Go back to Vercel:
echo 1. Project Settings -^> Environment Variables
echo 2. Update VITE_API_URL with your Railway domain
echo 3. Redeploy the project
echo.
pause

cls
echo ✨ DEPLOYMENT COMPLETE!
echo.
echo Frontend: https://YOUR-PROJECT.vercel.app
echo Backend:  https://YOUR-PROJECT.up.railway.app
echo.
echo For more info, see: VERCEL_DEPLOYMENT.md
echo.
pause
