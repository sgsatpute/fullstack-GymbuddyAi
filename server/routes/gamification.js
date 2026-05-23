/**
 * PROMPT 8: Gamification Routes
 * XP, levels, badges, and streaks
 */

import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

const LEVEL_THRESHOLDS = {
  1: 0, 2: 500, 3: 1500, 4: 3000, 5: 5000, 6: 8000,
};

function calculateLevel(xp) {
  for (let level = 6; level >= 1; level--) {
    if (xp >= LEVEL_THRESHOLDS[level]) return level;
  }
  return 1;
}

// POST /api/xp/award - Award XP for actions
router.post("/award", auth, (req, res) => {
  try {
    const userId = req.user.id;
    const { eventType, xpAmount } = req.body;

    if (!xpAmount || xpAmount <= 0) {
      return res.status(400).json({ error: "Invalid XP amount" });
    }

    const user = db.prepare("SELECT xp, level FROM users WHERE id = ?").get(userId);
    const oldLevel = user?.level || 1;
    const oldXp = user?.xp || 0;
    const newXp = oldXp + xpAmount;
    const newLevel = calculateLevel(newXp);
    const leveledUp = newLevel > oldLevel;

    db.prepare("UPDATE users SET xp = ?, level = ? WHERE id = ?").run(
      newXp,
      newLevel,
      userId
    );

    res.json({
      success: true,
      xp: newXp,
      level: newLevel,
      levelUp: leveledUp,
      newLevel: leveledUp ? newLevel : null,
      xpGained: xpAmount,
    });
  } catch (error) {
    console.error("XP award error:", error);
    res.status(500).json({ error: "Failed to award XP" });
  }
});

// GET /api/xp/leaderboard - Get top users by XP
router.get("/leaderboard", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const leaderboard = db
      .prepare(`
        SELECT id, name, xp, level, avatarUrl
        FROM users
        ORDER BY xp DESC
        LIMIT ?
      `)
      .all(limit);

    const withRank = leaderboard.map((user, i) => ({
      ...user,
      rank: i + 1,
    }));

    res.json({ leaderboard: withRank });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// POST /api/badges/sync - Sync earned badges
router.post("/sync", auth, (req, res) => {
  try {
    const userId = req.user.id;
    const { badges } = req.body;

    if (!Array.isArray(badges)) {
      return res.status(400).json({ error: "Badges must be array" });
    }

    const existingBadges = db
      .prepare("SELECT badgeType FROM badges WHERE userId = ?")
      .all(userId)
      .map((b) => b.badgeType);

    const newBadges = badges.filter((b) => !existingBadges.includes(b));

    if (newBadges.length > 0) {
      const insertBadge = db.prepare(`
        INSERT OR IGNORE INTO badges (userId, badgeType, earnedAt)
        VALUES (?, ?, datetime('now'))
      `);

      for (const badge of newBadges) {
        insertBadge.run(userId, badge);
      }
    }

    res.json({
      success: true,
      totalBadges: existingBadges.length + newBadges.length,
      newBadgesEarned: newBadges,
    });
  } catch (error) {
    console.error("Badge sync error:", error);
    res.status(500).json({ error: "Failed to sync badges" });
  }
});

// GET /api/badges - Get user's badges
router.get("/", auth, (req, res) => {
  try {
    const userId = req.user.id;

    const badges = db
      .prepare(`
        SELECT badgeType, earnedAt
        FROM badges
        WHERE userId = ?
        ORDER BY earnedAt DESC
      `)
      .all(userId);

    res.json({ badges, count: badges.length });
  } catch (error) {
    console.error("Badge fetch error:", error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

// GET /api/stats - Get user gamification stats
router.get("/stats", auth, (req, res) => {
  try {
    const userId = req.user.id;

    const user = db
      .prepare("SELECT xp, level, streak, consistency FROM users WHERE id = ?")
      .get(userId);

    const badges = db
      .prepare("SELECT COUNT(*) as count FROM badges WHERE userId = ?")
      .get(userId);

    const nextLevelXp = LEVEL_THRESHOLDS[user.level + 1] || LEVEL_THRESHOLDS[6];
    const xpToNextLevel = Math.max(0, nextLevelXp - user.xp);
    const levelProgress = Math.round(
      ((user.xp - LEVEL_THRESHOLDS[user.level]) /
        (nextLevelXp - LEVEL_THRESHOLDS[user.level])) *
        100
    );

    res.json({
      xp: user.xp,
      level: user.level,
      levelProgress,
      xpToNextLevel,
      streak: user.streak,
      consistency: user.consistency,
      badgesEarned: badges.count,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
