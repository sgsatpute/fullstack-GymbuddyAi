import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "gymbuddy.db");
const db = new Database(dbPath);

/* =========================
   USERS TABLE (BASE)
   ========================= */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    gym TEXT,
    goal TEXT,
    experience TEXT,
    preferredTime TEXT,
    consistency INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

/* =========================
   🔥 SAFE GAMIFICATION UPGRADE
   ========================= */
const userCols = db.prepare(`PRAGMA table_info(users)`).all();

if (!userCols.some(c => c.name === "xp")) {
  db.exec(`ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0`);
  console.log("✓ Added xp column");
}

if (!userCols.some(c => c.name === "level")) {
  db.exec(`ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1`);
  console.log("✓ Added level column");
}

/* =========================
   MESSAGES TABLE
   ========================= */
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId INTEGER NOT NULL,
    receiverId INTEGER NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

/* =========================
   SAFE ADD COLUMN (seen)
   ========================= */
const msgCols = db.prepare(`PRAGMA table_info(messages)`).all();
if (!msgCols.some(c => c.name === "seen")) {
  db.exec(`ALTER TABLE messages ADD COLUMN seen INTEGER DEFAULT 0`);
  console.log("✓ Added seen column");
}

/* =========================
   ML FEEDBACK (CREDIBILITY)
   ========================= */
db.exec(`
  CREATE TABLE IF NOT EXISTS match_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userA INTEGER NOT NULL,
    userB INTEGER NOT NULL,
    label INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log("✓ Database ready (users + gamification + chat + ML)");

export default db;
