import db from "../db.js";

const ACTIVITY_TYPES = new Set([
  "login",
  "workout_logged",
  "message_sent",
  "checkin",
  "meal_logged",
]);

function getWindowStart(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function serializeMetadata(metadata) {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === "string") {
    return metadata;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

export function trackActivity(userId, activityType, metadata = null) {
  const normalizedType = String(activityType ?? "").trim().toLowerCase();
  if (!ACTIVITY_TYPES.has(normalizedType)) {
    return null;
  }

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO activity_log (userId, actionType, metadata, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(userId, normalizedType, serializeMetadata(metadata), now);

  db.prepare(`
    UPDATE users
    SET lastActiveAt = ?, lastSeenAt = ?
    WHERE id = ?
  `).run(now, now, userId);

  return now;
}

export function getUserActivityScore(userId) {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS totalActions,
      COUNT(DISTINCT substr(createdAt, 1, 10)) AS activeDays
    FROM activity_log
    WHERE userId = ? AND createdAt >= ?
  `).get(userId, getWindowStart(7));

  const totalActions = Number(row?.totalActions ?? 0);
  const activeDays = Number(row?.activeDays ?? 0);

  return {
    score: Math.min(100, activeDays * 10 + totalActions * 6),
    totalActions,
    activeDays,
    activeLast7Days: activeDays > 0 || totalActions > 0,
  };
}

export function wasUserActiveLast7Days(userId) {
  return getUserActivityScore(userId).activeLast7Days;
}
