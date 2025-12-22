
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";

// --- AI & LOGIC ENGINE ---

// 1. Clustering Logic
// Groups users by Goal + WorkoutTime + Experience
function assignCluster(user: any): number {
  // Simple heuristic hash for clustering
  // This simulates an AI "Grouping" users with similar traits
  let hash = 0;
  const str = user.goal + user.workoutTime + user.experience;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 100; // 100 clusters
}

// 2. Compatibility Scoring System
// Returns score 0-100
function calculateScore(userA: any, userB: any): number {
  let score = 0;

  // STRICT RULE: Same workout time → 40%
  if (userA.workoutTime === userB.workoutTime) score += 40;

  // STRICT RULE: Same gym → 25%
  if (userA.gymName.toLowerCase().trim() === userB.gymName.toLowerCase().trim()) score += 25;

  // STRICT RULE: Same fitness goal → 20%
  if (userA.goal === userB.goal) score += 20;

  // STRICT RULE: Same experience level → 10%
  if (userA.experience === userB.experience) score += 10;

  // STRICT RULE: Age difference ≤ 5 years → 5%
  if (Math.abs(userA.age - userB.age) <= 5) score += 5;

  return score;
}


export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // --- USER ROUTES ---

  app.post('/api/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // AI: Assign Cluster ID immediately
      const clusterId = assignCluster(user);
      await storage.updateUser(user.id, { clusterId });

      res.status(201).json(user);
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

  // --- MATCHING ENGINE ROUTE ---

  app.get('/api/matches/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const currentUser = await storage.getUser(userId);
    
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    const allUsers = await storage.getAllUsers();
    const blockedIds = await storage.getBlocks(userId);

    const matches = allUsers
      .filter(u => u.id !== userId) // Not self
      .filter(u => !blockedIds.includes(u.id)) // Not blocked
      .map(u => {
        const score = calculateScore(currentUser, u);
        
        // AI Recommendation Logic:
        // Boost score slightly if they are in the same cluster (Simulating AI preference)
        const isClusterMatch = u.clusterId === currentUser.clusterId;
        
        return {
          user: u,
          score,
          isClusterMatch,
          tags: isClusterMatch ? ["AI Recommended", "High Compatibility"] : []
        };
      })
      .filter(m => m.score >= 70) // STRICT RULE: Score >= 70%
      .sort((a, b) => b.score - a.score) // Sort by score desc
      .slice(0, 5); // STRICT RULE: Top 5 matches

    res.json(matches);
  });

  // --- CHAT ROUTES ---

  app.get('/api/chat/:userId/:targetId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const targetId = parseInt(req.params.targetId);
    
    // Check blocks
    const blockedByMe = await storage.getBlocks(userId);
    const blockedByTarget = await storage.getBlocks(targetId);
    
    if (blockedByMe.includes(targetId) || blockedByTarget.includes(userId)) {
      return res.status(403).json({ error: "Cannot chat with this user" });
    }

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

  // --- CHECK-IN & CONSISTENCY ---

  app.post('/api/checkin', async (req, res) => {
    const { userId } = req.body;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date().toISOString().split('T')[0];
    const lastDate = user.lastCheckIn ? user.lastCheckIn.split('T')[0] : null;

    let newStreak = user.streak || 0;
    
    if (lastDate === today) {
      return res.json({ message: "Already checked in today", streak: newStreak });
    }

    // Check if consecutive day
    if (lastDate) {
      const last = new Date(lastDate);
      const curr = new Date(today);
      const diffTime = Math.abs(curr.getTime() - last.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays === 1) {
        newStreak++;
      } else {
        newStreak = 1; // Reset streak
      }
    } else {
      newStreak = 1;
    }

    // Update consistency score (Simple logic: max 100, increases with streak)
    let newConsistency = Math.min(100, (user.consistencyScore || 0) + 5);
    
    await storage.updateUser(userId, {
      streak: newStreak,
      consistencyScore: newConsistency,
      lastCheckIn: new Date().toISOString()
    });

    res.json({ success: true, streak: newStreak, consistencyScore: newConsistency });
  });

  // --- SAFETY ---

  app.post('/api/report', async (req, res) => {
    const reportData = insertReportSchema.parse(req.body);
    await storage.createReport(reportData);
    res.json({ success: true });
  });

  return httpServer;
}
