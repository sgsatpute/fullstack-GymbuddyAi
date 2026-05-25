import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { awardEligibleBadges } from "../utils/badges.js";
import { logActivity } from "../utils/activity.js";
import { getBlockedUserIds, isBlockedBetweenUsers } from "../utils/relationships.js";
import { awardXP, XP_REWARDS } from "../utils/xpSystem.js";

const router = express.Router();

function buildConversationSummaries(userId) {
  const blockedUserIds = new Set(getBlockedUserIds(userId));
  const messages = db.prepare(`
    SELECT id, senderId, receiverId, message, seen, createdAt
    FROM messages
    WHERE senderId = ? OR receiverId = ?
    ORDER BY datetime(createdAt) DESC, id DESC
  `).all(userId, userId);

  const summaries = new Map();

  for (const message of messages) {
    const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;

    if (blockedUserIds.has(otherUserId)) {
      continue;
    }

    const existing = summaries.get(otherUserId);

    if (!existing) {
      summaries.set(otherUserId, {
        userId: otherUserId,
        lastMessage: message.message,
        lastMessageAt: message.createdAt,
        lastMessageTime: message.createdAt,
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
    SELECT id, name, gym, goal, experience, preferredTime, level, xp, bio, avatarUrl
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

function attachReactions(messages) {
  const messageIds = messages.map((message) => message.id).filter(Boolean);
  if (messageIds.length === 0) {
    return messages.map((message) => ({ ...message, reactions: [] }));
  }

  const placeholders = messageIds.map(() => "?").join(", ");
  const reactionRows = db.prepare(`
    SELECT messageId, emoji, COUNT(*) AS count
    FROM message_reactions
    WHERE messageId IN (${placeholders})
    GROUP BY messageId, emoji
    ORDER BY messageId ASC, count DESC
  `).all(...messageIds);

  const reactionsByMessageId = new Map();
  for (const row of reactionRows) {
    const existing = reactionsByMessageId.get(row.messageId) ?? [];
    existing.push({
      emoji: row.emoji,
      count: row.count,
    });
    reactionsByMessageId.set(row.messageId, existing);
  }

  return messages.map((message) => ({
    ...message,
    reactions: reactionsByMessageId.get(message.id) ?? [],
  }));
}

router.get("/", auth, (req, res) => {
  res.json(buildConversationSummaries(req.user.id));
});

router.get("/conversations", auth, (req, res) => {
  res.json(buildConversationSummaries(req.user.id));
});

router.get("/unread-count", auth, (req, res) => {
  const count = db.prepare(`
    SELECT COUNT(*) AS count
    FROM messages
    WHERE receiverId = ? AND COALESCE(seen, 0) = 0
  `).get(req.user.id)?.count ?? 0;

  res.json({ count });
});

router.post("/reactions", auth, (req, res) => {
  try {
    const messageId = Number(req.body?.messageId);
    const emoji = String(req.body?.emoji ?? "").trim();

    if (!Number.isInteger(messageId) || !emoji) {
      return res.status(400).json({ error: "messageId and emoji are required" });
    }

    const message = db.prepare(`
      SELECT id, senderId, receiverId
      FROM messages
      WHERE id = ?
    `).get(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId !== req.user.id && message.receiverId !== req.user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }

    db.prepare(`
      INSERT OR IGNORE INTO message_reactions (messageId, userId, emoji)
      VALUES (?, ?, ?)
    `).run(messageId, req.user.id, emoji);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to save reaction" });
  }
});

router.get("/:userId", auth, (req, res) => {
  const me = req.user.id;
  const other = Number(req.params.userId);

  if (!Number.isInteger(other)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  if (isBlockedBetweenUsers(me, other)) {
    return res.status(403).json({ error: "This conversation is unavailable." });
  }

  const participant = db.prepare(`
    SELECT id, name, gym, goal, experience, preferredTime, level, xp, bio, avatarUrl
    FROM users
    WHERE id = ?
  `).get(other);

  if (!participant) {
    return res.status(404).json({ error: "User not found" });
  }

  db.prepare(`
    UPDATE messages
    SET seen = 1, seenAt = ?
    WHERE receiverId = ? AND senderId = ?
  `).run(new Date().toISOString(), me, other);

  const messages = db.prepare(`
    SELECT id, senderId, receiverId, message, seen, createdAt
    FROM messages
    WHERE
      (senderId = ? AND receiverId = ?)
      OR
      (senderId = ? AND receiverId = ?)
    ORDER BY datetime(createdAt) ASC, id ASC
  `).all(me, other, other, me);

  res.json({
    participant,
    messages: attachReactions(messages),
  });
});

router.post("/:userId", auth, (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = Number(req.params.userId);
    const { message } = req.body ?? {};

    if (!Number.isInteger(receiverId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    if (receiverId === senderId) {
      return res.status(400).json({ error: "You cannot message yourself" });
    }

    if (isBlockedBetweenUsers(senderId, receiverId)) {
      return res.status(403).json({ error: "Messaging is disabled for this user." });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message required" });
    }

    const cleanMessage = String(message).trim();

    db.prepare(`
      INSERT INTO messages (senderId, receiverId, message)
      VALUES (?, ?, ?)
    `).run(senderId, receiverId, cleanMessage);

    const xpAward = awardXP(senderId, XP_REWARDS.message_sent, "message_sent");

    db.prepare(`
      INSERT INTO match_feedback (userA, userB, label)
      VALUES (?, ?, 1)
    `).run(senderId, receiverId);

    const newlyEarnedBadges = awardEligibleBadges(senderId);
    logActivity(senderId, "message_sent", { receiverId });

    res.json({
      ok: true,
      xpGained: xpAward.xpGained,
      newlyEarnedBadges,
    });
  } catch {
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
