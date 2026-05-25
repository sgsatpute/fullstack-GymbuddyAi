import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { awardEligibleBadges, getBadgeStatusList, getUserBadges } from "../utils/badges.js";
import { getStreakStatus, streakFreeze } from "../utils/streakSystem.js";
import { getLeaderboardByXp, getLevelProgress } from "../utils/xpSystem.js";

const router = express.Router();

router.get("/profile", auth, (req, res) => {
  try {
    awardEligibleBadges(req.user.id);

    const user = db.prepare(`
      SELECT xp, level, streak
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      xp: Number(user.xp ?? 0),
      level: Number(user.level ?? 1),
      levelInfo: getLevelProgress(Number(user.xp ?? 0)),
      streak: Number(user.streak ?? 0),
      streakStatus: getStreakStatus(req.user.id),
      badges: getUserBadges(req.user.id),
    });
  } catch {
    return res.status(500).json({ error: "Failed to load gamification profile" });
  }
});

router.get("/badges", auth, (req, res) => {
  try {
    awardEligibleBadges(req.user.id);
    res.json(getBadgeStatusList(req.user.id));
  } catch {
    res.status(500).json({ error: "Failed to load badges" });
  }
});

router.post("/streak-freeze", auth, (req, res) => {
  try {
    res.json(streakFreeze(req.user.id));
  } catch {
    res.status(500).json({ error: "Failed to apply streak freeze" });
  }
});

router.get("/leaderboard/xp", auth, (_req, res) => {
  try {
    res.json(getLeaderboardByXp(100));
  } catch {
    res.status(500).json({ error: "Failed to load XP leaderboard" });
  }
});

export default router;
