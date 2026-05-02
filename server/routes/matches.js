import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildMatch(me, other) {
  let score = 25;
  const reasons = [];

  if (normalize(me.gym) && normalize(me.gym) === normalize(other.gym)) {
    score += 28;
    reasons.push("Same gym or training location");
  }

  if (normalize(me.goal) && normalize(me.goal) === normalize(other.goal)) {
    score += 22;
    reasons.push("Aligned fitness goal");
  }

  if (normalize(me.experience) && normalize(me.experience) === normalize(other.experience)) {
    score += 16;
    reasons.push("Similar experience level");
  }

  if (
    normalize(me.preferredTime) &&
    normalize(me.preferredTime) === normalize(other.preferredTime)
  ) {
    score += 16;
    reasons.push("Workout schedules line up");
  }

  if (Number.isFinite(me.age) && Number.isFinite(other.age)) {
    const ageGap = Math.abs(me.age - other.age);
    if (ageGap <= 3) {
      score += 8;
      reasons.push("Very similar age range");
    } else if (ageGap <= 6) {
      score += 4;
    }
  }

  const streakGap = Math.abs((me.streak ?? 0) - (other.streak ?? 0));
  if (streakGap <= 3) {
    score += 5;
    reasons.push("Consistency is on a similar track");
  }

  const compatibility = Math.min(99, Math.max(0, score));
  let tier = "Potential fit";

  if (compatibility >= 85) {
    tier = "Elite match";
  } else if (compatibility >= 72) {
    tier = "Strong match";
  } else if (compatibility >= 60) {
    tier = "Good fit";
  }

  return {
    score: compatibility,
    reasons,
    tier,
    canChat: compatibility >= 60,
  };
}

router.get("/", auth, (req, res) => {
  const userId = req.user.id;

  const me = db.prepare(`
    SELECT id, name, age, gym, goal, experience, preferredTime, streak, consistency, xp, level, bio
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!me) {
    return res.status(404).json({ error: "User not found" });
  }

  const required = ["age", "gym", "goal", "experience", "preferredTime"];
  const incomplete = required.some((key) => me[key] === null || me[key] === undefined || me[key] === "");

  if (incomplete) {
    return res.status(400).json({ error: "PROFILE_INCOMPLETE" });
  }

  const others = db.prepare(`
    SELECT id, name, age, gym, goal, experience, preferredTime, streak, consistency, xp, level, bio
    FROM users
    WHERE id != ?
      AND age IS NOT NULL
      AND gym IS NOT NULL
      AND goal IS NOT NULL
      AND experience IS NOT NULL
      AND preferredTime IS NOT NULL
  `).all(userId);

  const matches = others
    .map((other) => {
      const match = buildMatch(me, other);
      return {
        user: other,
        ...match,
      };
    })
    .sort((a, b) => b.score - a.score);

  res.json(matches);
});

export default router;
