import db from "../db.js";

export function logActivity(userId, actionType, metadata = null) {
  db.prepare(`
    INSERT INTO activity_log (userId, actionType, metadata)
    VALUES (?, ?, ?)
  `).run(
    userId,
    actionType,
    metadata ? JSON.stringify(metadata) : null
  );
}
