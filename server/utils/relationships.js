import db from "../db.js";

export function getBlockedUserIds(userId) {
  return db.prepare(`
    SELECT DISTINCT
      CASE
        WHEN accuserId = ? THEN accusedId
        ELSE accuserId
      END AS userId
    FROM blocks
    WHERE type = 'block' AND (accuserId = ? OR accusedId = ?)
  `).all(userId, userId, userId)
    .map((row) => row.userId);
}

export function isBlockedBetweenUsers(userA, userB) {
  const row = db.prepare(`
    SELECT id
    FROM blocks
    WHERE type = 'block'
      AND (
        (accuserId = ? AND accusedId = ?)
        OR
        (accuserId = ? AND accusedId = ?)
      )
    LIMIT 1
  `).get(userA, userB, userB, userA);

  return Boolean(row);
}
