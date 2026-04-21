// server/routes/matches.js
import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

const WEIGHTS = {
  gym: 0.35,
  goal: 0.30,
  experience: 0.20,
  preferredTime: 0.15,
};

function scoreUser(me, other) {
  let score = 0;
  let reasons = [];

  if (me.gym && me.gym === other.gym) {
    score += WEIGHTS.gym;
    reasons.push("Same gym");
  }

  if (me.goal && me.goal === other.goal) {
    score += WEIGHTS.goal;
    reasons.push("Same fitness goal");
  }

  if (me.experience && me.experience === other.experience) {
    score += WEIGHTS.experience;
    reasons.push("Same experience level");
  }

  if (me.preferredTime && me.preferredTime === other.preferredTime) {
    score += WEIGHTS.preferredTime;
    reasons.push("Same workout time");
  }

  return {
    score: Math.round(score * 100),
    reasons,
  };
}

router.get("/", auth, (req, res) => {
  const userId = req.user.id;

  const me = db.prepare(`
    SELECT id, gym, goal, experience, preferredTime, age
    FROM users WHERE id = ?
  `).get(userId);

  if (!me) {
    return res.status(404).json({ error: "User not found" });
  }

  // Check completeness
  const required = ["age", "gym", "goal", "experience", "preferredTime"];
  const incomplete = required.some(k => me[k] === null || me[k] === undefined || me[k] === "");

  if (incomplete) {
    return res.status(400).json({ error: "PROFILE_INCOMPLETE" });
  }

  const others = db.prepare(`
    SELECT id, name, gym, goal, experience, preferredTime
    FROM users WHERE id != ?
  `).all(userId);

  const matches = others.map(u => {
    const { score, reasons } = scoreUser(me, u);
    return {
      user: { id: u.id, name: u.name },
      score,
      reasons,
      canChat: score >= 60,
    };
  });

  matches.sort((a, b) => b.score - a.score);
  res.json(matches);
});

export default router;
