/**
 * GymBuddy AI - Backend Server
 * 
 * RESTful API for finding gym workout buddies using AI-powered matching.
 * 
 * This server coordinates three key modules:
 * - db.ts: Centralized database operations
 * - matching.ts: All matching algorithms and AI logic
 * - index.ts: HTTP routes and request handling
 * 
 * Architecture keeps concerns separated for clarity and maintainability.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeDatabase,
  registerUser,
  getUserById,
  getAllUsers,
  getUsersExcluding,
  hasCheckedInToday,
  recordCheckIn,
  updateUserStreak,
  User,
} from './db';
import { calculateScore, getClusterId, findMatches } from './matching';

/**
 * HELPER: Enrich user object with calculated clusterId
 * clusterId is deterministic based on user's goal, preferredTime, and experience
 * It's not stored in DB (to avoid schema changes) but calculated on-the-fly
 */
function enrichUserWithClusterId(user: User): any {
  return {
    ...user,
    clusterId: getClusterId(user),
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

/**
 * POST /api/users/register
 * Register a new user with their fitness profile
 */
app.post('/api/users/register', (req: any, res: any) => {
  try {
    const { name, age, email, gym, goal, experience, preferredTime } = req.body;
    if (!name || !age || !email || !gym || !goal || !experience || !preferredTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = registerUser(name, age, email, gym, goal, experience, preferredTime);
    res.status(201).json(enrichUserWithClusterId(user));
  } catch (error: any) {
    if (error.message.includes('already registered')) {
      res.status(409).json({ error: error.message });
    } else {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * GET /api/users
 * List all registered users with their cluster IDs
 */
app.get('/api/users', (req: any, res: any) => {
  try {
    const users = getAllUsers();
    const enrichedUsers = users.map(enrichUserWithClusterId);
    res.json({ count: enrichedUsers.length, users: enrichedUsers });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matches/:userId
 * 
 * AI-POWERED MATCHING ENGINE - Get compatible gym buddies
 * 
 * Returns top 5 matches with:
 * - Compatibility score (0-100) based on weighted features
 * - "AI Recommended" badge ONLY when users share same habit cluster
 * - Filters out low-quality matches (score < 70)
 * - Never returns user's own profile
 * 
 * All matching calculations happen on backend (not frontend).
 * This ensures:
 * - Secure: frontend cannot manipulate scores
 * - Consistent: all users see fair recommendations
 * - Transparent: scoring is auditable in matching.ts
 */
app.get('/api/matches/:userId', (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Load current user
    const currentUser = getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all candidates EXCEPT current user (prevents self-matching)
    const candidates = getUsersExcluding(userId);
    
    // Run matching pipeline: score, filter, rank, tag
    const matches = findMatches(currentUser, candidates);

    res.json(matches);
  } catch (error) {
    console.error('Matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/checkin/:userId
 * 
 * WORKOUT CONSISTENCY TRACKING
 * 
 * Record a workout check-in for today.
 * Updates:
 * - Streak: consecutive workout days (resets on missed day)
 * - Consistency: 0-100 reliability score
 * 
 * Only one check-in per day. Consistency affects match recommendations
 * (see calculateScore in matching.ts - consistency bonus is +0 to +10).
 * 
 * All data persisted to SQLite (survives server restarts).
 */
app.post('/api/checkin/:userId', (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid userId' });

    const user = getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // RULE 1: Only one check-in per day
    if (hasCheckedInToday(userId)) {
      return res.json({
        message: 'Already checked in today',
        success: false,
        streak: user.streak,
        consistency: user.consistency,
      });
    }

    // Record today's check-in
    recordCheckIn(userId);

    // RULE 2: Streak logic
    let newStreak = 1;
    if (user.lastCheckIn) {
      const lastDate = new Date(user.lastCheckIn);
      const currDate = new Date();
      const diffDays = Math.ceil((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak = user.streak + 1;
      } else {
        newStreak = 1; // Reset on missed day
      }
    }

    // RULE 3: Consistency scoring
    const baseIncrease = 5;
    const streakBonus = Math.floor(newStreak / 10);
    const newConsistency = Math.min(100, user.consistency + baseIncrease + streakBonus);

    // Persist to database
    updateUserStreak(userId, newStreak, newConsistency);

    // Return enriched user with clusterId
    const updatedUser = getUserById(userId);
    res.json({
      success: true,
      streak: newStreak,
      consistency: newConsistency,
      message: `Streak: ${newStreak} days! Consistency: ${newConsistency}/100`,
      user: updatedUser ? enrichUserWithClusterId(updatedUser) : null,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /
 * Serve frontend (SPA)
 */
app.get('/', (req: any, res: any) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start server
initializeDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏋️ GymBuddy AI running on http://localhost:${PORT}`);
  console.log(`📁 Using persistent SQLite database`);
  console.log(`✓ All matching calculations on backend (secure & consistent)`);
});
