import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();
const JWT_SECRET = "supersecretkey";

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (name, email, passwordHash)
      VALUES (?, ?, ?)
    `).run(name, email, passwordHash);

    res.json({ success: true });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  /* =========================
     🔥 XP BONUS: LOGIN
     ========================= */
  db.prepare(`
    UPDATE users
    SET xp = COALESCE(xp, 0) + 2,
        level = CAST((COALESCE(xp, 0) + 2) / 100 AS INTEGER) + 1
    WHERE id = ?
  `).run(user.id);

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

export default router;
