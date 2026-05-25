import db from "../db.js";
import { awardEligibleBadges } from "./badges.js";
import { broadcast, createNotification, emitToUser } from "./realtime.js";

export const XP_REWARDS = {
  login: 5,
  log_workout: 50,
  log_nutrition: 20,
  message_sent: 5,
  get_matched: 100,
  complete_profile: 200,
  "7day_streak_bonus": 500,
};

export const LEVELS = [
  { level: 1, minXp: 0, maxXp: 499, title: "Gym Newbie" },
  { level: 2, minXp: 500, maxXp: 1499, title: "Regular" },
  { level: 3, minXp: 1500, maxXp: 3499, title: "Dedicated" },
  { level: 4, minXp: 3500, maxXp: 6999, title: "Athlete" },
  { level: 5, minXp: 7000, maxXp: 14999, title: "Elite" },
  { level: 6, minXp: 15000, maxXp: Number.MAX_SAFE_INTEGER, title: "Legend" },
];

function getLevelForXp(xp) {
  return LEVELS.findLast((level) => xp >= level.minXp) ?? LEVELS[0];
}

function getTodayStartIso() {
  return new Date().toISOString().slice(0, 10);
}

function getRemainingMessageXpBudget(userId) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM user_xp_log
    WHERE userId = ? AND reason = 'message_sent' AND substr(createdAt, 1, 10) = ?
  `).get(userId, getTodayStartIso());

  return Math.max(0, 50 - Number(row?.total ?? 0));
}

export function getLevelProgress(totalXp) {
  const current = getLevelForXp(totalXp);
  const next = LEVELS.find((level) => level.level === current.level + 1) ?? null;
  const xpIntoLevel = totalXp - current.minXp;
  const span = next ? next.minXp - current.minXp : Math.max(1, current.maxXp - current.minXp + 1);

  return {
    level: current.level,
    title: current.title,
    totalXp,
    xpIntoLevel,
    nextLevel: next?.level ?? null,
    nextTitle: next?.title ?? null,
    xpToNextLevel: next ? Math.max(0, next.minXp - totalXp) : 0,
    progressPercent: next ? Math.min(100, Math.round((xpIntoLevel / span) * 100)) : 100,
  };
}

function writeXpLog(userId, amount, reason, totalAfter, createdAt) {
  db.prepare(`
    INSERT INTO user_xp_log (userId, amount, reason, totalAfter, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, amount, reason, totalAfter, createdAt);
}

export function awardXP(userId, requestedAmount, reason) {
  const normalizedReason = String(reason ?? "").trim() || "manual";
  let amount = Math.max(0, Number(requestedAmount) || 0);
  if (amount <= 0) {
    const currentUser = db.prepare("SELECT xp FROM users WHERE id = ?").get(userId);
    return {
      xpGained: 0,
      newTotal: Number(currentUser?.xp ?? 0),
      levelUp: false,
      newLevel: Number(db.prepare("SELECT level FROM users WHERE id = ?").get(userId)?.level ?? 1),
      badgesEarned: [],
    };
  }

  if (normalizedReason === "message_sent") {
    amount = Math.min(amount, getRemainingMessageXpBudget(userId));
  }

  const user = db.prepare(`
    SELECT id, name, xp, level
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const createdAt = new Date().toISOString();
  const startingXp = Number(user.xp ?? 0);
  let newTotal = startingXp + amount;
  let levelInfo = getLevelForXp(newTotal);

  db.prepare(`
    UPDATE users
    SET xp = ?, level = ?, lastActiveAt = ?
    WHERE id = ?
  `).run(newTotal, levelInfo.level, createdAt, userId);

  if (amount > 0) {
    writeXpLog(userId, amount, normalizedReason, newTotal, createdAt);
  }

  const badgesEarned = awardEligibleBadges(userId);
  if (badgesEarned.length > 0) {
    for (const badge of badgesEarned) {
      if (badge.xpReward > 0) {
        newTotal += badge.xpReward;
        levelInfo = getLevelForXp(newTotal);
        writeXpLog(userId, badge.xpReward, `badge:${badge.id}`, newTotal, createdAt);
      }

      createNotification(userId, {
        type: "badge_earned",
        title: "New achievement unlocked",
        body: `${badge.icon} ${badge.name}: ${badge.description}`,
        link: "/profile/me",
        data: badge,
      });

      emitToUser(userId, "badge-earned", badge);
    }

    db.prepare(`
      UPDATE users
      SET xp = ?, level = ?, lastActiveAt = ?
      WHERE id = ?
    `).run(newTotal, levelInfo.level, createdAt, userId);
  }

  const previousLevel = Number(user.level ?? 1);
  const levelUp = levelInfo.level > previousLevel;

  emitToUser(userId, "xp-gained", {
    xpGained: amount,
    newTotal,
    reason: normalizedReason,
    createdAt,
  });

  if (levelUp) {
    const progress = getLevelProgress(newTotal);
    emitToUser(userId, "level-up", progress);
    createNotification(userId, {
      type: "level_up",
      title: `Level ${progress.level} unlocked`,
      body: `You are now a ${progress.title}.`,
      link: "/profile/me",
      data: progress,
    });
  }

  broadcast("leaderboard-update", {
    userId,
    xp: newTotal,
    level: levelInfo.level,
    title: levelInfo.title,
  });

  return {
    xpGained: amount,
    newTotal,
    levelUp,
    newLevel: levelInfo.level,
    badgesEarned,
  };
}

export function getLeaderboardByXp(limit = 50) {
  return db.prepare(`
    SELECT id, name, avatarUrl, xp, level, streak
    FROM users
    ORDER BY xp DESC, streak DESC, name ASC
    LIMIT ?
  `).all(limit)
    .map((user, index) => ({
      ...user,
      rank: index + 1,
      levelInfo: getLevelProgress(Number(user.xp ?? 0)),
    }));
}
