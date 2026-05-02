import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { execFile } from "child_process";
import path from "path";

const router = express.Router();

router.get("/today", auth, async (req, res) => {
  const user = db.prepare(`
    SELECT streak, consistency, goal
    FROM users WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const engagement = user.streak >= 5 ? "high" : user.streak >= 2 ? "medium" : "low";
  const goalMap = { muscle: 0, fatloss: 1, fitness: 2 };
  const engMap = { low: 0, medium: 1, high: 2 };

  const features = [
    user.streak ?? 0,
    user.consistency ?? 0,
    goalMap[user.goal] ?? 2,
    engMap[engagement],
  ];

  const script = path.resolve(process.cwd(), "server", "ml", "coach_predict.py");

  execFile("python", [script, JSON.stringify(features)], (error, stdout) => {
    if (error) {
      return res.json({
        message: "Recovery is still progress. Keep the habit alive with light movement today.",
      });
    }

    const actionMap = {
      train_hard: "Your momentum is strong today. Go for a focused strength session.",
      train_light: "Keep the streak alive with a lighter workout and crisp form.",
      cardio: "A cardio-focused session is a great fit for today’s energy.",
      walk: "Active recovery works today. A solid walk still counts.",
      mobility: "Mobility and stretching will help you stay consistent long-term.",
      rest: "Recovery day. Rest well so you can come back stronger tomorrow.",
    };

    res.json({
      message:
        actionMap[stdout.trim()] ??
        "Stay consistent today, even if the session is short.",
    });
  });
});

export default router;
