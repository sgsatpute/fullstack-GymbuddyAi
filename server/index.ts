import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

/**
 * DATABASE INITIALIZATION
 * 
 * Using better-sqlite3 for synchronous SQLite operations.
 * Database file: gymbuddy.db (persistent, survives server restarts)
 */
const dbPath = path.join(__dirname, '../gymbuddy.db');
const db = new Database(dbPath);

// Initialize database schema if tables don't exist
function initializeDatabase() {
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

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

function calculateScore(user1: any, user2: any) {
  let score = 0;
  if (user1.preferredTime === user2.preferredTime) score += 40;
  if (user1.gym.toLowerCase() === user2.gym.toLowerCase()) score += 25;
  if (user1.goal === user2.goal) score += 20;
  if (user1.experience === user2.experience) score += 10;
  if (Math.abs(user1.age - user2.age) <= 5) score += 5;
  return Math.min(100, score);
}

function getClusterId(user: any) {
  const goalMap: any = { 'muscle': 1, 'fatloss': 2, 'fitness': 3 };
  const timeMap: any = { 'morning': 1, 'evening': 2, 'night': 3 };
  const expMap: any = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
  return (goalMap[user.goal] || 0) * 100 + (timeMap[user.preferredTime] || 0) * 10 + (expMap[user.experience] || 0);
}

// API Endpoints
app.post('/api/users/register', (req: any, res: any) => {
  try {
    const { name, age, email, gym, goal, experience, preferredTime } = req.body;
    if (!name || !age || !email || !gym || !goal || !experience || !preferredTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare(`
      INSERT INTO users (name, age, email, gym, goal, experience, preferredTime)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const info = stmt.run(name, age, email, gym, goal, experience, preferredTime);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json(user);
    } catch (dbError: any) {
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

app.get('/api/users', (req: any, res: any) => {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    res.json({ count: users.length, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/matches/:userId', (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allUsers = db.prepare('SELECT * FROM users WHERE id != ?').all(userId);
    const matches = allUsers
      .map((u: any) => ({ user: u, score: calculateScore(currentUser, u), clusterId: getClusterId(u), isClusterMatch: getClusterId(currentUser) === getClusterId(u) }))
      .filter((m: any) => m.score >= 70)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5)
      .map((m: any) => ({ user: m.user, score: Math.round(m.score), isClusterMatch: m.isClusterMatch, tags: m.isClusterMatch ? ['AI Recommended'] : [] }));

    res.json(matches);
  } catch (error) {
    console.error('Matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/checkin', (req: any, res: any) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = db.prepare('SELECT * FROM checkins WHERE userId = ? AND date = ?').get(userId, today);

    if (existingCheckin) {
      return res.json({ message: 'Already checked in today', success: false, streak: user.streak, consistency: user.consistency });
    }

    db.prepare('INSERT INTO checkins (userId, date) VALUES (?, ?)').run(userId, today);

    let newStreak = 1;
    if (user.lastCheckIn) {
      const lastDate = new Date(user.lastCheckIn);
      const currDate = new Date(today);
      const diffDays = Math.ceil((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) newStreak = user.streak + 1;
      else newStreak = 1;
    }

    const baseIncrease = 5;
    const streakBonus = Math.floor(newStreak / 10);
    const newConsistency = Math.min(100, user.consistency + baseIncrease + streakBonus);

    db.prepare('UPDATE users SET streak = ?, consistency = ?, lastCheckIn = ? WHERE id = ?').run(newStreak, newConsistency, new Date().toISOString(), userId);

    res.json({ success: true, streak: newStreak, consistency: newConsistency, message: `Streak: ${newStreak} days! Consistency: ${newConsistency}/100` });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req: any, res: any) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

initializeDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏋️ GymBuddy AI running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${dbPath} (persistent)`);
});
