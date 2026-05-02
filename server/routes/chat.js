import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

function buildConversationSummaries(userId) {
  const messages = db.prepare(`
    SELECT id, senderId, receiverId, message, seen, createdAt
    FROM messages
    WHERE senderId = ? OR receiverId = ?
    ORDER BY datetime(createdAt) DESC, id DESC
  `).all(userId, userId);

  const summaries = new Map();

  for (const message of messages) {
    const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
    const existing = summaries.get(otherUserId);

    if (!existing) {
      summaries.set(otherUserId, {
        userId: otherUserId,
        lastMessage: message.message,
        lastMessageAt: message.createdAt,
        lastMessageSenderId: message.senderId,
        unreadCount: message.receiverId === userId && !message.seen ? 1 : 0,
      });
      continue;
    }

    if (message.receiverId === userId && !message.seen) {
      existing.unreadCount += 1;
    }
  }

  const otherUserIds = [...summaries.keys()];
  if (otherUserIds.length === 0) {
    return [];
  }

  const placeholders = otherUserIds.map(() => "?").join(", ");
  const users = db.prepare(`
    SELECT id, name, gym, goal, experience, preferredTime, level, xp, bio
    FROM users
    WHERE id IN (${placeholders})
  `).all(...otherUserIds);

  const userMap = new Map(users.map((user) => [user.id, user]));

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      user: userMap.get(summary.userId),
    }))
    .filter((summary) => Boolean(summary.user))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

router.get("/", auth, (req, res) => {
  res.json(buildConversationSummaries(req.user.id));
});

router.get("/:userId", auth, (req, res) => {
  const me = req.user.id;
  const other = Number(req.params.userId);

  if (!Number.isInteger(other)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const participant = db.prepare(`
    SELECT id, name, gym, goal, experience, preferredTime, level, xp, bio
    FROM users
    WHERE id = ?
  `).get(other);

  if (!participant) {
    return res.status(404).json({ error: "User not found" });
  }

  db.prepare(`
    UPDATE messages
    SET seen = 1
    WHERE receiverId = ? AND senderId = ?
  `).run(me, other);

  const messages = db.prepare(`
    SELECT id, senderId, receiverId, message, seen, createdAt
    FROM messages
    WHERE
      (senderId = ? AND receiverId = ?)
      OR
      (senderId = ? AND receiverId = ?)
    ORDER BY datetime(createdAt) ASC, id ASC
  `).all(me, other, other, me);

  res.json({ participant, messages });
});

router.post("/:userId", auth, (req, res) => {
  const senderId = req.user.id;
  const receiverId = Number(req.params.userId);
  const { message } = req.body;

  if (!Number.isInteger(receiverId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message required" });
  }

  db.prepare(`
    INSERT INTO messages (senderId, receiverId, message)
    VALUES (?, ?, ?)
  `).run(senderId, receiverId, String(message).trim());

  db.prepare(`
    UPDATE users
    SET xp = COALESCE(xp, 0) + 1,
        level = CAST((COALESCE(xp, 0) + 1) / 100 AS INTEGER) + 1
    WHERE id = ?
  `).run(senderId);

  db.prepare(`
    INSERT INTO match_feedback (userA, userB, label)
    VALUES (?, ?, 1)
  `).run(senderId, receiverId);

  res.json({ ok: true });
});

export default router;
