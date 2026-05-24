import db from "../db.js";

function toDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

function canUseFreezeThisWeek(user) {
  if (!user?.lastStreakFreezeAt) {
    return true;
  }

  const lastUsed = new Date(user.lastStreakFreezeAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 7;
}

export function updateStreak(userId, activityDate = toDateString()) {
  const user = db.prepare(`
    SELECT streak, lastCheckIn, lastStreakFreezeAt
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.lastCheckIn === activityDate) {
    return {
      streak: Number(user.streak ?? 0),
      reset: false,
      usedFreeze: false,
    };
  }

  const yesterday = shiftDate(activityDate, -1);
  const twoDaysAgo = shiftDate(activityDate, -2);

  let nextStreak = 1;
  let usedFreeze = false;
  if (user.lastCheckIn === yesterday) {
    nextStreak = Number(user.streak ?? 0) + 1;
  } else if (user.lastCheckIn === twoDaysAgo && canUseFreezeThisWeek(user)) {
    nextStreak = Number(user.streak ?? 0) + 1;
    usedFreeze = true;
    db.prepare(`
      INSERT OR IGNORE INTO streak_freezes (userId, usedForDate, createdAt)
      VALUES (?, ?, ?)
    `).run(userId, yesterday, new Date().toISOString());
  }

  db.prepare(`
    UPDATE users
    SET streak = ?, lastCheckIn = ?, lastActiveAt = ?
    WHERE id = ?
  `).run(nextStreak, activityDate, new Date().toISOString(), userId);

  if (usedFreeze) {
    db.prepare(`
      UPDATE users
      SET lastStreakFreezeAt = ?
      WHERE id = ?
    `).run(new Date().toISOString(), userId);
  }

  return {
    streak: nextStreak,
    reset: nextStreak === 1 && user.lastCheckIn !== yesterday,
    usedFreeze,
  };
}

export function getStreakStatus(userId) {
  const user = db.prepare(`
    SELECT streak, lastCheckIn, lastStreakFreezeAt
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const hoursUntilBreak = Math.max(
    0,
    Math.ceil((nextMidnight.getTime() - now.getTime()) / (1000 * 60 * 60))
  );

  return {
    streak: Number(user.streak ?? 0),
    isAtRisk: user.lastCheckIn !== toDateString(),
    hoursUntilBreak,
    freezeAvailable: canUseFreezeThisWeek(user),
  };
}

export function streakFreeze(userId) {
  const status = getStreakStatus(userId);
  if (!status.freezeAvailable) {
    return {
      success: false,
      message: "Streak freeze already used this week.",
      ...status,
    };
  }

  const protectedDate = shiftDate(toDateString(), -1);
  db.prepare(`
    INSERT OR IGNORE INTO streak_freezes (userId, usedForDate, createdAt)
    VALUES (?, ?, ?)
  `).run(userId, protectedDate, new Date().toISOString());

  db.prepare(`
    UPDATE users
    SET lastStreakFreezeAt = ?
    WHERE id = ?
  `).run(new Date().toISOString(), userId);

  return {
    success: true,
    message: "Streak freeze applied for the last missed day.",
    ...getStreakStatus(userId),
  };
}
