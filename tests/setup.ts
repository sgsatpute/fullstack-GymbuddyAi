import fs from "fs";
import path from "path";
import { beforeEach } from "vitest";

// 1. Initialize environment variables BEFORE importing db or app
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-that-is-at-least-thirty-two-bytes-long-123456";
process.env.DB_PATH = "server/gymbuddy.test.db";

const dbPath = path.resolve(process.cwd(), "server", "gymbuddy.test.db");
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
  } catch (err) {
    // Ignore if file is locked or already removed
  }
}

// 2. Import db after env setup so server/config.js sees test values.
const { default: db } = await import("../server/db.js");

// 3. Clear all tables before each test case
beforeEach(() => {
  const tables = [
    "users",
    "messages",
    "message_reactions",
    "match_feedback",
    "checkins",
    "coach_messages",
    "workout_sessions",
    "meal_entries",
    "badges",
    "user_badges",
    "user_xp_log",
    "activity_log",
    "blocks",
    "refresh_tokens",
    "password_reset_otps",
    "match_interactions",
    "workout_plans",
    "daily_checkins",
    "body_metrics",
    "group_messages",
    "group_challenges",
    "group_members",
    "groups",
    "notifications",
    "streak_freezes",
  ];

  db.exec("PRAGMA foreign_keys = OFF;");
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
  db.exec("PRAGMA foreign_keys = ON;");
});
