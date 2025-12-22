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

/**
 * WEIGHTED SCORING ENGINE - AI-Style Recommendation Logic
 * 
 * This implements a multi-feature scoring system similar to collaborative filtering
 * used in recommendation engines (Netflix, Spotify, etc.). Each feature is weighted
 * by importance, allowing the algorithm to make nuanced compatibility decisions.
 * 
 * Weights chosen based on habit alignment impact:
 * - Same workout time: 40 pts (MOST IMPORTANT - coordination is critical for gym buddies)
 * - Same gym: 25 pts (Location compatibility enables consistent meetups)
 * - Same fitness goal: 20 pts (Motivational alignment keeps both engaged)
 * - Same experience level: 10 pts (Prevents injury, enables balanced workouts)
 * - Similar age (≤5yr diff): 5 pts (Social comfort & relatability)
 * 
 * CONSISTENCY BOOST (NEW):
 * - Consistency score incorporated into match quality
 * - Higher consistency = more reliable workout partner
 * - Scales from 0-10 bonus points (consistency/10)
 * 
 * Total max score: 110 (40+25+20+10+5+10), normalized to 0-100 range
 * Minimum match threshold: 70 (only high-confidence recommendations)
 * 
 * @param user1 Current user seeking matches
 * @param user2 Potential match candidate
 * @returns Compatibility score (0-100)
 */
function calculateScore(user1: any, user2: any) {
  let score = 0;
  
  // +40: Same workout time is THE most important factor
  // A buddy who works out at the same time can actually meet you at the gym
  if (user1.preferredTime === user2.preferredTime) score += 40;
  
  // +25: Same gym location ensures physical compatibility
  // Even perfect timing doesn't matter if you're in different cities
  if (user1.gym.toLowerCase() === user2.gym.toLowerCase()) score += 25;
  
  // +20: Same goal creates shared motivation and workout focus
  // Someone building muscle needs different workouts than someone losing fat
  if (user1.goal === user2.goal) score += 20;
  
  // +10: Same experience level prevents injury & unsafe practices
  // A beginner needs guidance; an advanced lifter needs challenge
  if (user1.experience === user2.experience) score += 10;
  
  // +5: Similar age creates social comfort
  // Age within 5 years suggests compatible life stage & energy levels
  if (Math.abs(user1.age - user2.age) <= 5) score += 5;
  
  // CONSISTENCY BOOST: +0 to +10 based on candidate's workout consistency
  // Users with high consistency are MORE RELIABLE gym partners
  // This is how real dating apps work: they boost reliable, active users
  // Example: consistency=80 → +8 bonus points
  // This ensures we recommend partners who actually show up to workouts
  const consistencyBonus = Math.round(user2.consistency / 10);
  score += consistencyBonus;
  
  // Cap at 100 (even if all features align, score is normalized)
  return Math.min(100, score);
}

/**
 * HABIT-BASED CLUSTERING - Segmentation for AI Recommendations
 * 
 * Clustering is a fundamental ML technique that groups similar items together.
 * Here we create "habit clusters" - segments of users with compatible lifestyles.
 * 
 * Users in the SAME CLUSTER get an "AI Recommended" badge because they represent
 * optimal matches (both have same habits AND high compatibility score).
 * 
 * Cluster formula: goalCode*100 + timeCode*10 + experienceCode
 * Example: muscle_morning_advanced = (1*100) + (1*10) + (3) = 113
 * Example: fatLoss_night_beginner = (2*100) + (3*10) + (1) = 231
 * 
 * This creates deterministic, interpretable groupings (no black-box clustering).
 * Users with identical lifestyle patterns naturally fall into same cluster.
 * 
 * @param user Fitness profile to cluster
 * @returns Cluster ID (numeric identifier for habit segment)
 */
function getClusterId(user: any) {
  // Map categorical values to numeric codes
  // These represent distinct lifestyle segments
  const goalMap: any = { 'muscle': 1, 'fatloss': 2, 'fitness': 3 };
  const timeMap: any = { 'morning': 1, 'evening': 2, 'night': 3 };
  const expMap: any = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
  
  // Weighted positional encoding creates unique cluster per lifestyle
  // Hundreds place: fitness goal (most important distinction)
  // Tens place: workout time (secondary distinction)
  // Ones place: experience level (tertiary distinction)
  // 
  // This ensures users with IDENTICAL fitness habits cluster together
  // Example: All morning muscle-builders have clusterId 111
  return (goalMap[user.goal] || 0) * 100 + 
         (timeMap[user.preferredTime] || 0) * 10 + 
         (expMap[user.experience] || 0);
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

/**
 * GET /api/matches/:userId
 * 
 * AI-POWERED MATCHING ENGINE - Multi-Stage Recommendation Pipeline
 * 
 * This endpoint implements a real recommendation system with 4 stages:
 * 
 * 1. EXCLUSION RULE: Never match user with themselves
 *    - Prevents returning the current user as their own match
 * 
 * 2. SCORING STAGE: Calculate compatibility scores
 *    - Uses weighted feature matching (see calculateScore())
 *    - Also computes cluster membership for each candidate
 * 
 * 3. FILTERING STAGE: Confidence threshold (score >= 70)
 *    - 70+ = "high confidence" match in recommendation systems
 *    - Eliminates low-quality matches
 *    - Prevents wasting user time on poor recommendations
 * 
 * 4. RANKING + LIMITING STAGE: Top 5, sorted by score DESC
 *    - Sorts by score descending (best matches first)
 *    - Returns top 5 only (prevents recommendation overload)
 *    - Similar to Netflix "Top Recommendations" or LinkedIn "Suggested Jobs"
 * 
 * 5. TAGGING STAGE: "AI Recommended" badge for cluster matches
 *    - Only matches in same cluster get special badge
 *    - Indicates perfect habit alignment (rare, valuable recommendations)
 */
app.get('/api/matches/:userId', (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Load current user
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // STAGE 1: Exclude self from candidates (id != ?)
    const allUsers = db.prepare('SELECT * FROM users WHERE id != ?').all(userId);
    
    // STAGE 2 & 3: Score all candidates and filter by confidence threshold
    // STAGE 4: Sort by score DESC and take top 5
    // STAGE 5: Tag cluster matches with "AI Recommended" badge
    const matches = allUsers
      // Score each candidate & compute cluster membership
      .map((u: any) => ({ 
        user: u, 
        score: calculateScore(currentUser, u), 
        clusterId: getClusterId(u), 
        isClusterMatch: getClusterId(currentUser) === getClusterId(u) 
      }))
      // Filter: only high-confidence matches (score >= 70)
      .filter((m: any) => m.score >= 70)
      // Rank: sort by score descending (best matches first)
      .sort((a: any, b: any) => b.score - a.score)
      // Limit: take only top 5 matches (prevent recommendation overload)
      .slice(0, 5)
      // Tag: mark cluster matches with "AI Recommended" badge
      .map((m: any) => ({ 
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

/**
 * POST /api/checkin/:userId
 * 
 * WORKOUT CONSISTENCY TRACKING - Habit Formation & Reliability Scoring
 * 
 * This endpoint implements habit-tracking similar to fitness apps (Fitbit, Strava, Apple Health).
 * It's the core mechanism for measuring workout commitment and reliability.
 * 
 * TWO KEY METRICS:
 * 
 * 1. STREAK (Consecutive Workouts)
 *    - Measures commitment/discipline
 *    - Increments: consecutive days only (diff = 1 day)
 *    - Resets: if you skip a day (diff > 1 or no check-in)
 *    - Example: miss Friday → Sunday streak resets to 1
 *    - This gamification drives engagement (like Duolingo's streaks)
 * 
 * 2. CONSISTENCY SCORE (0-100)
 *    - Measures overall reliability as a gym buddy
 *    - +5 base per check-in (rewards showing up)
 *    - +1 bonus per 10-day streak (rewards consistency)
 *    - Capped at 100 (prevents inflation)
 *    - Example: 30-day streak → +5 (base) + +3 (streak bonus) = +8 per day
 *    - HIGH CONSISTENCY USERS get better match recommendations (see calculateScore)
 * 
 * STORAGE:
 *    - checkins table: date-based records (enforces 1 per day)
 *    - users.streak: running count of consecutive days
 *    - users.consistency: normalized 0-100 reliability score
 *    - users.lastCheckIn: ISO timestamp for consecutive day calculation
 * 
 * Why this matters for AI recommendations:
 *    - A 90-consistency user is more valuable than a 30-consistency user
 *    - Real gym buddies > flaky friends (even if less compatible)
 *    - Consistency is a strong behavioral signal of commitment
 */
app.post('/api/checkin/:userId', (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid userId' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // RULE 1: Only one check-in per day
    // This enforces the "daily" nature of habit tracking
    // Multiple check-ins per day don't provide additional value (you either worked out or didn't)
    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = db.prepare('SELECT * FROM checkins WHERE userId = ? AND date = ?').get(userId, today);

    if (existingCheckin) {
      return res.json({ 
        message: 'Already checked in today', 
        success: false, 
        streak: user.streak, 
        consistency: user.consistency 
      });
    }

    // Record today's check-in in the checkins table
    db.prepare('INSERT INTO checkins (userId, date) VALUES (?, ?)').run(userId, today);

    // RULE 2: Streak logic (consecutive days vs reset)
    // Streak is a powerful motivator: it creates a "don't break the chain" dynamic
    // This is why fitness apps show streaks prominently
    let newStreak = 1;
    if (user.lastCheckIn) {
      const lastDate = new Date(user.lastCheckIn);
      const currDate = new Date(today);
      // Calculate days between last check-in and today
      const diffDays = Math.ceil((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day! Increment streak
        newStreak = user.streak + 1;
      } else {
        // Missed day(s) - reset streak to 1
        // Even after 100 days, one missed day resets. This maintains discipline.
        newStreak = 1;
      }
    }

    // RULE 3: Consistency scoring
    // Base: +5 points per check-in (consistency never decreases)
    // Bonus: +1 point per 10-day streak (rewards long-term commitment)
    // Cap: 100 (prevents score inflation)
    // Example progression:
    //   Day 1: 0 + 5 = 5
    //   Day 10: 45 + 5 + 1 = 51
    //   Day 20: 51 + 5 + 2 = 58
    //   Day 100: 95 + 5 + 10 = 100 (capped)
    const baseIncrease = 5;
    const streakBonus = Math.floor(newStreak / 10);
    const newConsistency = Math.min(100, user.consistency + baseIncrease + streakBonus);

    // STORAGE: Persist all changes to SQLite
    // This ensures streak/consistency survive server restarts and are queryable for matching
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

app.get('/', (req: any, res: any) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

initializeDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏋️ GymBuddy AI running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${dbPath} (persistent)`);
});
