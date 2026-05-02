import Database from "better-sqlite3";
import config from "./config.js";

const db = new Database(config.dbPath);

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

const userCols = db.prepare("PRAGMA table_info(users)").all();

if (!userCols.some((column) => column.name === "xp")) {
  db.exec("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0");
  console.log("Added xp column");
}

if (!userCols.some((column) => column.name === "level")) {
  db.exec("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1");
  console.log("Added level column");
}

if (!userCols.some((column) => column.name === "lastCheckIn")) {
  db.exec("ALTER TABLE users ADD COLUMN lastCheckIn TEXT");
  console.log("Added lastCheckIn column");
}

if (!userCols.some((column) => column.name === "bio")) {
  db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''");
  console.log("Added bio column");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId INTEGER NOT NULL,
    receiverId INTEGER NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

const messageCols = db.prepare("PRAGMA table_info(messages)").all();
if (!messageCols.some((column) => column.name === "seen")) {
  db.exec("ALTER TABLE messages ADD COLUMN seen INTEGER DEFAULT 0");
  console.log("Added seen column");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS match_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userA INTEGER NOT NULL,
    userB INTEGER NOT NULL,
    label INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    checkInDate TEXT NOT NULL,
    xpAwarded INTEGER DEFAULT 10,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(userId, checkInDate)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_checkins_user_date
  ON checkins(userId, checkInDate)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    tokenHash TEXT NOT NULL UNIQUE,
    tokenFamily TEXT NOT NULL,
    userAgent TEXT,
    ipAddress TEXT,
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    revokedAt TEXT,
    replacedByTokenHash TEXT,
    lastUsedAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens(userId)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    codeHash TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    consumedAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id
  ON password_reset_otps(userId)
`);

console.log("Database ready (users, chat, ML, sessions, password reset)");

export default db;
