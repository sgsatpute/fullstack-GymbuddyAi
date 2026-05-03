#!/usr/bin/env node

/**
 * Quick Deploy Script for GymBuddy AI
 * Deploys to Vercel (frontend) + Railway (backend) with FREE tier
 * 
 * Usage: node deploy.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🚀 GymBuddy AI - FREE Tier Deployment Script\n');
console.log('=' .repeat(50));

// Check prerequisites
const checks = {
  git: () => {
    try {
      execSync('git --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
  node: () => {
    try {
      execSync('node --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
  npm: () => {
    try {
      execSync('npm --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
  github: () => fs.existsSync(path.join(process.cwd(), '.git')),
};

console.log('\n✅ Pre-flight Checks:');
let allGood = true;
for (const [tool, check] of Object.entries(checks)) {
  const result = check();
  console.log(`  ${result ? '✓' : '✗'} ${tool.toUpperCase()}`);
  if (!result) allGood = false;
}

if (!allGood) {
  console.log('\n❌ Please install missing tools first!');
  process.exit(1);
}

console.log('\n📋 Pre-Deployment Checklist:\n');

const tasks = [
  {
    name: 'Git initialized',
    check: () => fs.existsSync(path.join(process.cwd(), '.git')),
    fix: () => {
      console.log('  → Initializing Git...');
      execSync('git init');
    },
  },
  {
    name: 'Code committed to Git',
    check: () => {
      try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        return status.trim() === '';
      } catch {
        return false;
      }
    },
    fix: () => {
      console.log('  → Committing changes...');
      execSync('git add .');
      execSync('git commit -m "Pre-deployment commit"');
    },
  },
  {
    name: 'Project builds successfully',
    check: () => {
      try {
        console.log('  → Testing build...');
        execSync('npm run build', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
  },
];

for (const task of tasks) {
  if (task.check()) {
    console.log(`  ✓ ${task.name}`);
  } else {
    console.log(`  ✗ ${task.name}`);
    if (task.fix) task.fix();
  }
}

console.log('\n' + '='.repeat(50));
console.log('\n📖 DEPLOYMENT INSTRUCTIONS:\n');

console.log('1️⃣  PUSH TO GITHUB');
console.log('   ─────────────────');
console.log('   git push -u origin main\n');

console.log('2️⃣  DEPLOY FRONTEND TO VERCEL');
console.log('   ────────────────────────────');
console.log('   a) Go to https://vercel.com/new');
console.log('   b) Import your GitHub repository');
console.log('   c) Root: ./client');
console.log('   d) Build: npm run build');
console.log('   e) Output: dist');
console.log('   f) Env: VITE_API_URL = (leave blank for now)\n');

console.log('3️⃣  DEPLOY BACKEND TO RAILWAY');
console.log('   ────────────────────────────');
console.log('   a) Go to https://railway.app');
console.log('   b) New Project → Deploy from GitHub');
console.log('   c) Select your repository');
console.log('   d) Add environment variables (see FREE_DEPLOYMENT.md)\n');

console.log('4️⃣  CONNECT FRONTEND TO BACKEND');
console.log('   ──────────────────────────────');
console.log('   a) Get Railway backend domain');
console.log('   b) In Vercel: Settings → Environment Variables');
console.log('   c) Set VITE_API_URL = https://your-railway-domain');
console.log('   d) Redeploy in Vercel\n');

console.log('5️⃣  TEST & VERIFY');
console.log('   ───────────────');
console.log('   a) Visit your Vercel URL');
console.log('   b) Check Network tab for API calls');
console.log('   c) Test login/features\n');

console.log('=' .repeat(50));
console.log('\n💡 For detailed guide, see: FREE_DEPLOYMENT.md\n');

console.log('Ready to deploy? Follow the steps above! 🚀\n');
