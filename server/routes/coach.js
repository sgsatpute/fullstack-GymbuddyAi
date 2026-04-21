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

  const engagement = user.streak >= 5 ? "high" : user.streak >= 2 ? "medium" : "low";

  const goalMap = { muscle:0, fatloss:1, fitness:2 };
  const engMap = { low:0, medium:1, high:2 };

  const features = [
    user.streak,
    user.consistency,
    goalMap[user.goal],
    engMap[engagement]
  ];

  const script = path.join(process.cwd(), "ml", "coach_predict.py");

  execFile("python", [script, JSON.stringify(features)], (err, stdout) => {
    if (err) {
      return res.json({ message: "Rest day recommended 🧘" });
    }

    const actionMap = {
      train_hard: "🔥 Push yourself today. Strength workout recommended.",
      train_light: "💪 Light workout keeps momentum going.",
      cardio: "🏃 Cardio session recommended.",
      walk: "🚶 Active recovery walk today.",
      mobility: "🧘 Mobility & stretching day.",
      rest: "😴 Rest and recover."
    };

    res.json({ message: actionMap[stdout.trim()] });
  });
});

export default router;
