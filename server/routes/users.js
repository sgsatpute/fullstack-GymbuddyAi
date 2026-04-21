// server/routes/users.js
import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET logged-in user
router.get("/me", auth, (req, res) => {
  const user = db.prepare(`
    SELECT 
      id,
      name,
      age,
      gym,
      goal,
      experience,
      preferredTime,
      streak,
      consistency,
      xp,
      level
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const profileComplete =
    user.age &&
    user.gym &&
    user.goal &&
    user.experience &&
    user.preferredTime;

  res.json({ ...user, profileComplete });
});

// UPDATE profile
router.post("/profile", auth, (req, res) => {
  const { age, gym, goal, experience, preferredTime } = req.body;

  if (!age || !gym || !goal || !experience || !preferredTime) {
    return res.status(400).json({ error: "All profile fields required" });
  }

  db.prepare(`
    UPDATE users
    SET age = ?, gym = ?, goal = ?, experience = ?, preferredTime = ?
    WHERE id = ?
  `).run(age, gym, goal, experience, preferredTime, req.user.id);

  res.json({ success: true });
});

export default router;
