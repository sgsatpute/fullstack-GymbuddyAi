import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT id, type, title, body, link, read, createdAt
      FROM notifications
      WHERE userId = ?
      ORDER BY datetime(createdAt) DESC, id DESC
      LIMIT 50
    `).all(req.user.id);

    res.json(notifications);
  } catch {
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.put("/read-all", auth, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications
      SET read = 1
      WHERE userId = ?
    `).run(req.user.id);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

export default router;
