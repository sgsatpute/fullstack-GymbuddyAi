import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/* =========================
   GET CHAT (MARK SEEN)
   ========================= */
router.get("/:userId", auth, (req, res) => {
  const me = req.user.id;
  const other = Number(req.params.userId);

  db.prepare(`
    UPDATE messages
    SET seen = 1
    WHERE receiverId = ? AND senderId = ?
  `).run(me, other);

  const messages = db.prepare(`
    SELECT senderId, receiverId, message, seen, createdAt
    FROM messages
    WHERE
      (senderId = ? AND receiverId = ?)
      OR
      (senderId = ? AND receiverId = ?)
    ORDER BY createdAt ASC
  `).all(me, other, other, me);

  res.json(messages);
});

/* =========================
   SEND MESSAGE + XP + ML FEEDBACK
   ========================= */
router.post("/:userId", auth, (req, res) => {
  const senderId = req.user.id;
  const receiverId = Number(req.params.userId);
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message required" });
  }

  db.prepare(`
    INSERT INTO messages (senderId, receiverId, message)
    VALUES (?, ?, ?)
  `).run(senderId, receiverId, message);

  /* 🔥 XP BONUS: CHAT MESSAGE */
  db.prepare(`
    UPDATE users
    SET xp = COALESCE(xp, 0) + 1,
        level = CAST((COALESCE(xp, 0) + 1) / 100 AS INTEGER) + 1
    WHERE id = ?
  `).run(senderId);

  /* 🔥 ML FEEDBACK (SAFE, SILENT) */
  db.prepare(`
    INSERT INTO match_feedback (userA, userB, label)
    VALUES (?, ?, 1)
  `).run(senderId, receiverId);

  res.json({ ok: true });
});

export default router;
