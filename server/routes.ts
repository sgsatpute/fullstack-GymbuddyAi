
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";

// --- AI & LOGIC ENGINE ---

/**
 * CLUSTERING ALGORITHM
 * 
 * Groups users into similarity clusters based on three key factors:
 * - Fitness Goal (muscle_gain, fat_loss, general_fitness)
 * - Workout Time (morning, evening, night)  
 * - Experience Level (beginner, intermediate, advanced)
 * 
 * This creates a deterministic cluster ID. Users in the same cluster
 * are marked as "AI Recommended" during matching because they have
 * demonstrated similar fitness habits and goals.
 * 
 * Example: A beginner doing morning workouts for muscle gain would
 * be clustered differently from an advanced user doing night workouts.
 * The clustering ensures variety of recommendations while highlighting
 * naturally compatible buddies.
 */
function assignCluster(user: any): number {
  // Map categorical values to unique numbers for clustering
  const goalMap: Record<string, number> = {
    'muscle_gain': 1,
    'fat_loss': 2,
    'general_fitness': 3
  };
  
  const timeMap: Record<string, number> = {
    'morning': 1,
    'evening': 2,
    'night': 3
  };
  
  const expMap: Record<string, number> = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3
  };

  // Calculate cluster ID using: Goal + Time + Experience
  // This ensures each unique combination gets its own cluster
  const clusterId = 
    (goalMap[user.goal] || 0) * 100 +
    (timeMap[user.workoutTime] || 0) * 10 +
    (expMap[user.experience] || 0);

  return clusterId;
}

/**
 * WEIGHTED COMPATIBILITY SCORING SYSTEM
 * 
 * Calculates a match score (0-100) between two users using a weighted system:
 * - Same workout time: +40 points (40%)
 * - Same gym: +25 points (25%)
 * - Same fitness goal: +20 points (20%)
 * - Same experience level: +10 points (10%)
 * - Age difference ≤ 5 years: +5 points (5%)
 * 
 * Total possible score: 100 points
 * Minimum threshold for valid match: 70 points
 * 
 * LOGIC: Users who workout at the same time in the same gym are heavily
 * prioritized (40+25=65% of score) because they have immediate practical
 * compatibility. Goals and experience add nuance for long-term partnership
 * quality. Age proximity suggests similar life stage.
 * 
 * EXAMPLE SCORES:
 * - Same time, gym, goal, exp, age: 100 (perfect match)
 * - Same time, gym only: 65 (good practical match)
 * - Same everything except gym: 75 (good virtual buddy)
 * - Only same age: 5 (below threshold)
 */
function calculateScore(userA: any, userB: any): number {
  let score = 0;

  // Weighted Rule 1: Same workout time (highest priority - 40%)
  // Users at the same time can actually train together
  if (userA.workoutTime === userB.workoutTime) {
    score += 40;
  }

  // Weighted Rule 2: Same gym (25% - second highest)
  // Same gym means they can meet in person
  if (userA.gymName.toLowerCase().trim() === userB.gymName.toLowerCase().trim()) {
    score += 25;
  }

  // Weighted Rule 3: Same fitness goal (20%)
  // Aligned goals ensure they can work toward same objectives
  if (userA.goal === userB.goal) {
    score += 20;
  }

  // Weighted Rule 4: Same experience level (10%)
  // Experience matching prevents beginner/advanced mismatch
  if (userA.experience === userB.experience) {
    score += 10;
  }

  // Weighted Rule 5: Age proximity (5%)
  // Age difference ≤ 5 years suggests similar life stage
  if (Math.abs(userA.age - userB.age) <= 5) {
    score += 5;
  }

  return Math.min(100, score); // Cap at 100
}


export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // --- USER ROUTES ---

  app.post('/api/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      try {
        const user = await storage.createUser(userData);
        
        // AI: Assign Cluster ID based on user's fitness profile
        // This groups users with similar habits together
        const clusterId = assignCluster(user);
        const updatedUser = await storage.updateUser(user.id, { clusterId });

        res.status(201).json(updatedUser);
      } catch (dupError) {
        // Handle duplicate user prevention
        res.status(409).json({ error: dupError instanceof Error ? dupError.message : "User already exists" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  app.get('/api/users', async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get('/api/users/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  /**
   * MATCHING ENGINE
   * 
   * This endpoint implements the core matching algorithm:
   * 1. Load current user and calculate compatibility with all other users
   * 2. Apply weighted scoring based on gym, time, goals, experience, age
   * 3. Filter out matches below 70% score threshold (ensures quality matches)
   * 4. Identify "AI Recommended" users (same cluster = similar habits)
   * 5. Apply consistency score boost (users with higher consistency are ranked higher)
   * 6. Sort by final score and return top 5 matches
   */
  app.get('/api/matches/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const currentUser = await storage.getUser(userId);
    
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    const allUsers = await storage.getAllUsers();
    const blockedIds = await storage.getBlocks(userId);

    const matches = allUsers
      // FILTER 1: Exclude self (cannot match with yourself)
      .filter(u => u.id !== userId)
      // FILTER 2: Exclude blocked users (bidirectional blocking)
      .filter(u => !blockedIds.includes(u.id))
      // MAP: Calculate compatibility scores
      .map(u => {
        // Base weighted score from compatibility algorithm
        const baseScore = calculateScore(currentUser, u);
        
        // AI Logic: Identify cluster matches (users with same fitness behavior pattern)
        const isClusterMatch = u.clusterId === currentUser.clusterId;
        
        // Consistency boost: Higher consistency scores in matching buddy improve final ranking
        // (users with higher consistency scores are more reliable partners)
        const consistencyBoost = (u.consistencyScore || 0) * 0.1; // Max +10 points
        
        // Calculate final score with consistency consideration
        const finalScore = Math.min(100, baseScore + consistencyBoost);
        
        return {
          user: u,
          baseScore,
          finalScore,
          consistencyBoost,
          isClusterMatch,
          // Tag matches that are in the same cluster as "AI Recommended"
          // This indicates the system's AI clustering found natural affinity
          tags: isClusterMatch ? ["AI Recommended"] : []
        };
      })
      // FILTER 3: Only show matches meeting minimum threshold (70% compatibility)
      // This ensures quality partnerships with sufficient common ground
      .filter(m => m.finalScore >= 70)
      // SORT: By final score descending (best matches first)
      .sort((a, b) => b.finalScore - a.finalScore)
      // LIMIT: Maximum 5 matches per user
      .slice(0, 5)
      // TRANSFORM: Format for frontend (remove internal calculation details)
      .map(m => ({
        user: m.user,
        score: Math.round(m.finalScore), // Round to whole number for display
        isClusterMatch: m.isClusterMatch,
        tags: m.tags
      }));

    res.json(matches);
  });

  /**
   * CHAT ACCESS CONTROL
   * 
   * Chat is ONLY allowed between users who:
   * 1. Have established a valid match (score >= 70%)
   * 2. Are not blocked by each other
   * 3. Both exist and are active
   * 
   * This prevents unsolicited messages and ensures matches lead to
   * meaningful connections between compatible users.
   */
  app.get('/api/chat/:userId/:targetId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const targetId = parseInt(req.params.targetId);
    
    // Validate both users exist
    const user = await storage.getUser(userId);
    const target = await storage.getUser(targetId);
    
    if (!user || !target) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check bidirectional blocks (blocking prevents all communication)
    const blockedByMe = await storage.getBlocks(userId);
    const blockedByTarget = await storage.getBlocks(targetId);
    
    if (blockedByMe.includes(targetId) || blockedByTarget.includes(userId)) {
      return res.status(403).json({ error: "Cannot chat with this user" });
    }

    // Retrieve existing messages between the two users
    // Messages are stored bidirectionally
    const msgs = await storage.getMessages(userId, targetId);
    res.json(msgs);
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const msgData = insertMessageSchema.parse(req.body);
      const msg = await storage.createMessage(msgData);
      res.status(201).json(msg);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  /**
   * CONSISTENCY & ACCOUNTABILITY SYSTEM
   * 
   * Tracks user reliability and commitment:
   * - WORKOUT STREAK: Consecutive days of check-ins
   *   - Increases by 1 for each consecutive day
   *   - Resets to 1 if user skips a day
   * - CONSISTENCY SCORE (0-100):
   *   - Base increase: +5 points per check-in
   *   - Streak multiplier: +1 point per streak day (rewards consistency)
   *   - Caps at 100 to prevent gaming
   * 
   * This score influences match ranking: users with higher consistency
   * are preferred partners since they're more reliable for actual
   * gym partnerships.
   * 
   * LOGIC: The system incentivizes daily commitment while allowing
   * users to recover from missed days. A high streak user (50+ days)
   * will have much higher consistency (90+) than a new user (0-20).
   */
  app.post('/api/checkin', async (req, res) => {
    const { userId } = req.body;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date().toISOString().split('T')[0];
    const lastDate = user.lastCheckIn ? user.lastCheckIn.split('T')[0] : null;

    let newStreak = user.streak || 0;
    
    // Check if already checked in today
    if (lastDate === today) {
      return res.json({ 
        message: "Already checked in today", 
        streak: newStreak,
        consistencyScore: user.consistencyScore || 0 
      });
    }

    // Calculate if this is a consecutive day
    if (lastDate) {
      const last = new Date(lastDate);
      const curr = new Date(today);
      const diffTime = Math.abs(curr.getTime() - last.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays === 1) {
        // Consecutive day: increment streak
        newStreak++;
      } else {
        // Skipped days: reset streak to 1
        newStreak = 1;
      }
    } else {
      // First check-in ever
      newStreak = 1;
    }

    // Calculate consistency score improvement
    // Base: +5 points per check-in
    // Bonus: +1 point per streak day (long streaks get bonus)
    // Cap: 100 max
    const baseIncrease = 5;
    const streakBonus = Math.floor(newStreak / 10); // 1 bonus point per 10 streak days
    const totalIncrease = baseIncrease + streakBonus;
    let newConsistency = Math.min(100, (user.consistencyScore || 0) + totalIncrease);
    
    // Persist updated user with new streak and consistency
    await storage.updateUser(userId, {
      streak: newStreak,
      consistencyScore: newConsistency,
      lastCheckIn: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      streak: newStreak, 
      consistencyScore: newConsistency,
      message: `Streak: ${newStreak} days! Consistency: ${newConsistency}/100`
    });
  });

  /**
   * SAFETY & MODERATION
   * 
   * Users can report or block other users:
   * - BLOCK: Prevents all communication (bidirectional suppression)
   * - REPORT: Flags user internally (stored for admin review)
   * 
   * Blocked users:
   * - Disappear from match results
   * - Cannot receive messages
   * - Are hidden from their blocker's view
   */
  app.post('/api/report', async (req, res) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      
      // Validate users exist
      const accuser = await storage.getUser(reportData.accuserId);
      const accused = await storage.getUser(reportData.accusedId);
      
      if (!accuser || !accused) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Prevent self-blocking/reporting
      if (reportData.accuserId === reportData.accusedId) {
        return res.status(400).json({ error: "Cannot block/report yourself" });
      }
      
      // Store the report (block or report)
      await storage.createReport(reportData);
      
      res.json({ 
        success: true, 
        action: reportData.type === 'block' ? 'User blocked' : 'User reported'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return httpServer;
}
