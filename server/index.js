import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

/**
 * DATABASE INITIALIZATION
 * 
 * Using better-sqlite3 for synchronous SQLite operations.
 * Database file: gymbuddy.db (persistent, survives server restarts)
 * 
 * Schema:
 * - users: Core user profile data
 * - checkins: Daily workout check-ins for streak/consistency tracking
 * - blocks: User blocking for safety
 */
const dbPath = path.join(__dirname, 'gymbuddy.db');
const db = new Database(dbPath);

// Initialize database schema if tables don't exist
function initializeDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      email TEXT UNIQUE NOT NULL,
      gym TEXT NOT NULL,
      goal TEXT NOT NULL,
      experience TEXT NOT NULL,
      preferredTime TEXT NOT NULL,
      consistency INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      lastCheckIn TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create checkins table for tracking consistency
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Create blocks table for safety features
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accuserId INTEGER NOT NULL,
      accusedId INTEGER NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (accuserId) REFERENCES users(id),
      FOREIGN KEY (accusedId) REFERENCES users(id)
    )
  `);

  console.log('✓ Database initialized with persistent storage');
}

/**
 * HELPER FUNCTIONS
 */

// Calculate compatibility score between two users
// Weighted scoring system:
// - Same workout time: +40 points
// - Same gym: +25 points
// - Same goal: +20 points
// - Same experience: +10 points
// - Age difference ≤ 5 years: +5 points
function calculateScore(user1, user2) {
  let score = 0;
  
  if (user1.preferredTime === user2.preferredTime) score += 40;
  if (user1.gym.toLowerCase() === user2.gym.toLowerCase()) score += 25;
  if (user1.goal === user2.goal) score += 20;
  if (user1.experience === user2.experience) score += 10;
  if (Math.abs(user1.age - user2.age) <= 5) score += 5;
  
  return Math.min(100, score);
}

// Assign cluster ID based on user's fitness profile
// Cluster = (goal*100) + (time*10) + (experience)
// This creates deterministic grouping for "AI Recommended" matching
function getClusterId(user) {
  const goalMap = { 'muscle': 1, 'fatloss': 2, 'fitness': 3 };
  const timeMap = { 'morning': 1, 'evening': 2, 'night': 3 };
  const expMap = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
  
  return (goalMap[user.goal] || 0) * 100 + 
         (timeMap[user.preferredTime] || 0) * 10 + 
         (expMap[user.experience] || 0);
}

/**
 * API ENDPOINTS
 */

// POST /users/register
// Register a new user with profile information
// Request body: { name, age, email, gym, goal, experience, preferredTime }
// Response: { id, name, email, ... } or error
app.post('/api/users/register', (req, res) => {
  try {
    const { name, age, email, gym, goal, experience, preferredTime, gender } = req.body;

    // Validation
    if (!name || !age || !email || !gym || !goal || !experience || !preferredTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert user into database
    const stmt = db.prepare(`
      INSERT INTO users (name, age, email, gym, goal, experience, preferredTime)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const info = stmt.run(name, age, email, gym, goal, experience, preferredTime);
      
      // Fetch and return the created user
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      
      res.status(201).json({
        id: user.id,
        name: user.name,
        age: user.age,
        email: user.email,
        gym: user.gym,
        goal: user.goal,
        experience: user.experience,
        preferredTime: user.preferredTime,
        consistency: user.consistency,
        streak: user.streak,
        createdAt: user.createdAt
      });
    } catch (dbError) {
      if (dbError.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Email already registered' });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users
// Fetch all registered users with their matching scores
// Returns: Array of users with compatibility scores for logged-in user
// For now, returns all users (no auth yet)
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    
    res.json({
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        age: u.age,
        email: u.email,
        gym: u.gym,
        goal: u.goal,
        experience: u.experience,
        preferredTime: u.preferredTime,
        consistency: u.consistency,
        streak: u.streak,
        clusterId: getClusterId(u),
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/matches/:userId
// Get compatible matches for a user based on weighted scoring
app.get('/api/matches/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Fetch current user
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch all other users
    const allUsers = db.prepare('SELECT * FROM users WHERE id != ?').all(userId);
    
    // Calculate scores and filter
    const matches = allUsers
      .map(u => ({
        user: u,
        score: calculateScore(currentUser, u),
        clusterId: getClusterId(u),
        isClusterMatch: getClusterId(currentUser) === getClusterId(u)
      }))
      .filter(m => m.score >= 70) // Only show matches with 70+ score
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 5) // Top 5 matches
      .map(m => ({
        user: m.user,
        score: Math.round(m.score),
        isClusterMatch: m.isClusterMatch,
        tags: m.isClusterMatch ? ['AI Recommended'] : []
      }));

    res.json(matches);
  } catch (error) {
    console.error('Matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/checkin
// Record a daily workout check-in
// Updates: streak (if consecutive), consistency score
app.post('/api/checkin', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Fetch user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already checked in today
    const existingCheckin = db.prepare(
      'SELECT * FROM checkins WHERE userId = ? AND date = ?'
    ).get(userId, today);

    if (existingCheckin) {
      return res.json({
        message: 'Already checked in today',
        streak: user.streak,
        consistency: user.consistency
      });
    }

    // Record check-in
    db.prepare('INSERT INTO checkins (userId, date) VALUES (?, ?)').run(userId, today);

    // Calculate new streak
    let newStreak = 1;
    if (user.lastCheckIn) {
      const lastDate = new Date(user.lastCheckIn);
      const currDate = new Date(today);
      const diffDays = Math.ceil((currDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak = user.streak + 1;
      } else {
        newStreak = 1; // Reset streak if skipped
      }
    }

    // Update consistency (max 100)
    const baseIncrease = 5;
    const streakBonus = Math.floor(newStreak / 10);
    const newConsistency = Math.min(100, user.consistency + baseIncrease + streakBonus);

    // Update user
    db.prepare(
      'UPDATE users SET streak = ?, consistency = ?, lastCheckIn = ? WHERE id = ?'
    ).run(newStreak, newConsistency, new Date().toISOString(), userId);

    res.json({
      success: true,
      streak: newStreak,
      consistency: newConsistency,
      message: `Streak: ${newStreak} days! Consistency: ${newConsistency}/100`
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve index.html for SPA routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Initialize and start server
initializeDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏋️  GymBuddy AI running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${dbPath} (persistent)`);
});
