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

if (!userCols.some((column) => column.name === "avatarUrl")) {
  db.exec("ALTER TABLE users ADD COLUMN avatarUrl TEXT");
  console.log("Added avatarUrl column");
}

if (!userCols.some((column) => column.name === "city")) {
  db.exec("ALTER TABLE users ADD COLUMN city TEXT");
  console.log("Added city column");
}

if (!userCols.some((column) => column.name === "lastCheckinTime")) {
  db.exec("ALTER TABLE users ADD COLUMN lastCheckinTime TEXT");
  console.log("Added lastCheckinTime column");
}

if (!userCols.some((column) => column.name === "locationLabel")) {
  db.exec("ALTER TABLE users ADD COLUMN locationLabel TEXT");
  console.log("Added locationLabel column");
}

if (!userCols.some((column) => column.name === "locationPlaceId")) {
  db.exec("ALTER TABLE users ADD COLUMN locationPlaceId TEXT");
  console.log("Added locationPlaceId column");
}

if (!userCols.some((column) => column.name === "locationLat")) {
  db.exec("ALTER TABLE users ADD COLUMN locationLat REAL");
  console.log("Added locationLat column");
}

if (!userCols.some((column) => column.name === "locationLng")) {
  db.exec("ALTER TABLE users ADD COLUMN locationLng REAL");
  console.log("Added locationLng column");
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
  CREATE TABLE IF NOT EXISTS message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (messageId) REFERENCES messages(id),
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(messageId, userId, emoji)
  )
`);

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
  CREATE TABLE IF NOT EXISTS coach_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    sessionDate TEXT NOT NULL,
    workoutType TEXT NOT NULL,
    focusArea TEXT NOT NULL,
    durationMinutes INTEGER NOT NULL,
    intensity TEXT NOT NULL,
    energy INTEGER DEFAULT 3,
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date
  ON workout_sessions(userId, sessionDate)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS meal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    mealDate TEXT NOT NULL,
    mealType TEXT NOT NULL,
    title TEXT NOT NULL,
    calories INTEGER NOT NULL DEFAULT 0,
    proteinGrams REAL NOT NULL DEFAULT 0,
    carbsGrams REAL NOT NULL DEFAULT 0,
    fatGrams REAL NOT NULL DEFAULT 0,
    fiberGrams REAL NOT NULL DEFAULT 0,
    notes TEXT,
    imageUrl TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date
  ON meal_entries(userId, mealDate)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    badgeType TEXT NOT NULL,
    earnedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(userId, badgeType)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    actionType TEXT NOT NULL,
    metadata TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accuserId INTEGER NOT NULL,
    accusedId INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('block', 'report')),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accuserId) REFERENCES users(id),
    FOREIGN KEY (accusedId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_unique_action
  ON blocks(accuserId, accusedId, type)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_blocks_lookup
  ON blocks(accuserId, accusedId, type)
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

console.log("Database ready (users, chat, ML, workouts, sessions, password reset, safety)");

export default db;
