import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { buildAchievements, getLevelProgress } from "../utils/gamification.js";

const router = express.Router();

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    age: user.age,
    gym: user.gym,
    goal: user.goal,
    experience: user.experience,
    preferredTime: user.preferredTime,
    consistency: user.consistency ?? 0,
    streak: user.streak ?? 0,
    xp: user.xp ?? 0,
    level: user.level ?? 1,
    bio: user.bio ?? "",
    createdAt: user.createdAt,
    lastCheckIn: user.lastCheckIn,
  };
}

function getUserMetrics(userId) {
  const messagesSent =
    db.prepare("SELECT COUNT(*) AS count FROM messages WHERE senderId = ?").get(userId)?.count ?? 0;
  const unreadMessages =
    db.prepare("SELECT COUNT(*) AS count FROM messages WHERE receiverId = ? AND COALESCE(seen, 0) = 0").get(userId)?.count ?? 0;
  const totalCheckins =
    db.prepare("SELECT COUNT(*) AS count FROM checkins WHERE userId = ?").get(userId)?.count ?? 0;
  const conversationCount =
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM (
        SELECT CASE
          WHEN senderId = ? THEN receiverId
          ELSE senderId
        END AS otherUserId
        FROM messages
        WHERE senderId = ? OR receiverId = ?
        GROUP BY otherUserId
      )
    `).get(userId, userId, userId)?.count ?? 0;

  return {
    messagesSent,
    unreadMessages,
    totalCheckins,
    conversationCount,
  };
}

function buildProfilePayload(user, options = {}) {
  const today = getTodayDate();
  const checkedInToday = user.lastCheckIn === today;
  const metrics = getUserMetrics(user.id);
  const progress = getLevelProgress(user.xp ?? 0);
  const achievements = buildAchievements({
    streak: user.streak ?? 0,
    messagesSent: metrics.messagesSent,
    totalCheckins: metrics.totalCheckins,
    consistency: user.consistency ?? 0,
    level: user.level ?? progress.level,
  });

  return {
    ...normalizePublicUser(user),
    checkedInToday,
    achievements,
    levelProgress: progress,
    stats: metrics,
    ...(options.includePrivate
      ? { email: user.email }
      : {}),
    ...(options.profileComplete !== undefined
      ? { profileComplete: options.profileComplete }
      : {}),
  };
}

router.get("/me", auth, (req, res) => {
  const user = db.prepare(`
    SELECT
      id,
      name,
      age,
      email,
      gym,
      goal,
      experience,
      preferredTime,
      streak,
      consistency,
      xp,
      level,
      bio,
      createdAt,
      lastCheckIn
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const profileComplete = Boolean(
    user.age &&
      user.gym &&
      user.goal &&
      user.experience &&
      user.preferredTime
  );

  res.json(
    buildProfilePayload(user, {
      includePrivate: true,
      profileComplete,
    })
  );
});

router.get("/:id", auth, (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

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
      level,
      bio,
      createdAt,
      lastCheckIn
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const messagesWithViewer =
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM messages
      WHERE
        (senderId = ? AND receiverId = ?)
        OR
        (senderId = ? AND receiverId = ?)
    `).get(req.user.id, userId, userId, req.user.id)?.count ?? 0;

  const sharedGym =
    db.prepare(`
      SELECT CASE
        WHEN viewer.gym IS NOT NULL AND viewed.gym IS NOT NULL AND LOWER(viewer.gym) = LOWER(viewed.gym)
        THEN 1 ELSE 0 END AS sameGym
      FROM users viewer
      JOIN users viewed ON viewed.id = ?
      WHERE viewer.id = ?
    `).get(userId, req.user.id)?.sameGym ?? 0;

  res.json({
    ...buildProfilePayload(user),
    relationship: {
      isSelf: req.user.id === userId,
      hasMessaged: messagesWithViewer > 0,
      sameGym: Boolean(sharedGym),
    },
  });
});

router.post("/profile", auth, (req, res) => {
  const { age, gym, goal, experience, preferredTime, bio } = req.body;

  if (!age || !gym || !goal || !experience || !preferredTime) {
    return res.status(400).json({ error: "All profile fields required" });
  }

  db.prepare(`
    UPDATE users
    SET age = ?,
        gym = ?,
        goal = ?,
        experience = ?,
        preferredTime = ?,
        bio = ?
    WHERE id = ?
  `).run(
    age,
    String(gym).trim(),
    String(goal).trim(),
    String(experience).trim(),
    String(preferredTime).trim(),
    String(bio ?? "").trim(),
    req.user.id
  );

  res.json({ success: true });
});

export default router;
