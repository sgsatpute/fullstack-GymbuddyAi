import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, (req, res) => {
  const users = db.prepare(`
    SELECT name, xp, level
    FROM users
    ORDER BY xp DESC
    LIMIT 10
  `).all();

  res.json(users);
});

export default router;
