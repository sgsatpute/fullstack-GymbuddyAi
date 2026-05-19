import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/", auth, (req, res) => {
  const accuserId = req.user.id;
  const accusedId = Number(req.body?.accusedId);
  const type = String(req.body?.type ?? "").trim().toLowerCase();

  if (!Number.isInteger(accusedId)) {
    return res.status(400).json({ error: "Invalid accused user id" });
  }

  if (accusedId === accuserId) {
    return res.status(400).json({ error: "You cannot report yourself" });
  }

  if (!["block", "report"].includes(type)) {
    return res.status(400).json({ error: "Type must be block or report" });
  }

  const accused = db.prepare(`
    SELECT id
    FROM users
    WHERE id = ?
  `).get(accusedId);

  if (!accused) {
    return res.status(404).json({ error: "User not found" });
  }

  db.prepare(`
    INSERT OR IGNORE INTO blocks (accuserId, accusedId, type)
    VALUES (?, ?, ?)
  `).run(accuserId, accusedId, type);

  res.json({ success: true });
});

export default router;
