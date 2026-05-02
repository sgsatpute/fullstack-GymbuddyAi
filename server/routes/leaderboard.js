import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { getLevelProgress } from "../utils/gamification.js";

const router = express.Router();

router.get("/", auth, (req, res) => {
  const leaders = db.prepare(`
    SELECT id, name, gym, goal, xp, level, streak, consistency
    FROM users
    ORDER BY xp DESC, streak DESC, consistency DESC
    LIMIT 10
  `).all();

  const rankedUsers = db.prepare(`
    SELECT id, xp, streak, consistency
    FROM users
    ORDER BY xp DESC, streak DESC, consistency DESC
  `).all();

  const currentUserIndex = rankedUsers.findIndex((user) => user.id === req.user.id);
  const currentUser = leaders.find((user) => user.id === req.user.id)
    ?? db.prepare(`
      SELECT id, name, gym, goal, xp, level, streak, consistency
      FROM users
      WHERE id = ?
    `).get(req.user.id);

  res.json({
    leaders: leaders.map((user, index) => ({
      ...user,
      rank: index + 1,
      levelProgress: getLevelProgress(user.xp ?? 0),
    })),
    currentUserRank: currentUser
      ? {
          ...currentUser,
          rank: currentUserIndex >= 0 ? currentUserIndex + 1 : null,
          levelProgress: getLevelProgress(currentUser.xp ?? 0),
        }
      : null,
  });
});

export default router;
