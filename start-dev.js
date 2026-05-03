#!/usr/bin/env node

/**
 * Local Development Starter
 * Runs the full stack locally on your machine
 * 
 * Usage: node start-dev.js
 * or npm run dev-local (if added to package.json)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n🚀 Starting GymBuddy AI (Local Development)\n');
console.log('=' .repeat(60));

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('\n⚠️  No .env file found!');
  console.log('Creating from .env.example...\n');
  
  const exampleEnv = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
  fs.writeFileSync(envPath, exampleEnv);
  
  console.log('✅ Created .env file');
  console.log('⚠️  Please fill in SMTP credentials if you want email to work\n');
}

console.log('Starting services...\n');

// Start the dev server
console.log('📱 Frontend: http://localhost:5173');
console.log('🖥️  Backend:  http://localhost:5001');
console.log('📊 Metrics:  http://localhost:5001/api/health\n');
console.log('Press CTRL+C to stop all services\n');
console.log('=' .repeat(60) + '\n');

// Start dev process
const devProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

devProcess.on('error', (error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping development server...');
  devProcess.kill();
  process.exit(0);
});
