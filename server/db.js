import Database from "better-sqlite3";
import config from "./config.js";

const db = new Database(config.dbPath);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

function getColumnNames(tableName) {
  return new Set(
    db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((column) => column.name)
  );
}

function ensureColumns(tableName, columns) {
  const existing = getColumnNames(tableName);

  for (const [columnName, definition] of Object.entries(columns)) {
    if (!existing.has(columnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
    }
  }
}

function createIndexes(indexStatements) {
  for (const statement of indexStatements) {
    db.exec(statement);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

ensureColumns("users", {
  age: "age INTEGER",
  gym: "gym TEXT",
  goal: "goal TEXT",
  experience: "experience TEXT",
  preferredTime: "preferredTime TEXT",
  consistency: "consistency INTEGER DEFAULT 0",
  streak: "streak INTEGER DEFAULT 0",
  xp: "xp INTEGER DEFAULT 0",
  level: "level INTEGER DEFAULT 1",
  lastCheckIn: "lastCheckIn TEXT",
  bio: "bio TEXT DEFAULT ''",
  avatarUrl: "avatarUrl TEXT",
  city: "city TEXT",
  lastCheckinTime: "lastCheckinTime TEXT",
  locationLabel: "locationLabel TEXT",
  locationPlaceId: "locationPlaceId TEXT",
  locationLat: "locationLat REAL",
  locationLng: "locationLng REAL",
  lastActiveAt: "lastActiveAt TEXT",
  lastSeenAt: "lastSeenAt TEXT",
  streakFreezeCount: "streakFreezeCount INTEGER DEFAULT 0",
  lastStreakFreezeAt: "lastStreakFreezeAt TEXT",
});

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId INTEGER NOT NULL,
    receiverId INTEGER NOT NULL,
    message TEXT NOT NULL,
    seen INTEGER DEFAULT 0,
    seenAt TEXT,
    deliveredAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES users(id),
    FOREIGN KEY (receiverId) REFERENCES users(id)
  )
`);

ensureColumns("messages", {
  seen: "seen INTEGER DEFAULT 0",
  seenAt: "seenAt TEXT",
  deliveredAt: "deliveredAt TEXT",
});

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
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userA) REFERENCES users(id),
    FOREIGN KEY (userB) REFERENCES users(id)
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
  CREATE TABLE IF NOT EXISTS coach_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

ensureColumns("coach_messages", {
  tokens: "tokens INTEGER DEFAULT 0",
});

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
  CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    badgeId TEXT NOT NULL,
    badgeName TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xpReward INTEGER DEFAULT 0,
    earnedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(userId, badgeId)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_xp_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    totalAfter INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
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
  CREATE TABLE IF NOT EXISTS match_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viewerId INTEGER NOT NULL,
    viewedId INTEGER NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('view', 'like', 'pass', 'message')),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (viewerId) REFERENCES users(id),
    FOREIGN KEY (viewedId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS workout_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    planData TEXT NOT NULL,
    generatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    isActive INTEGER DEFAULT 1,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    mood INTEGER NOT NULL,
    energy INTEGER NOT NULL,
    soreness INTEGER NOT NULL,
    aiAdvice TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    weight REAL NOT NULL,
    bodyFat REAL,
    chest REAL,
    waist REAL,
    hips REAL,
    arms REAL,
    mood INTEGER NOT NULL,
    energy INTEGER NOT NULL,
    sleepHours REAL NOT NULL,
    waterGlasses INTEGER NOT NULL,
    loggedAt TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT NOT NULL,
    adminId INTEGER NOT NULL,
    inviteCode TEXT NOT NULL UNIQUE,
    maxMembers INTEGER NOT NULL DEFAULT 6,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (adminId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joinedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupId) REFERENCES groups(id),
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(groupId, userId)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS group_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    senderId INTEGER NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupId) REFERENCES groups(id),
    FOREIGN KEY (senderId) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS group_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    endDate TEXT NOT NULL,
    winnerId INTEGER,
    weeklyReset INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupId) REFERENCES groups(id),
    FOREIGN KEY (winnerId) REFERENCES users(id)
  )
`);

ensureColumns("group_challenges", {
  weeklyReset: "weeklyReset INTEGER DEFAULT 0",
});

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    data TEXT,
    read INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

ensureColumns("notifications", {
  data: "data TEXT",
});

db.exec(`
  CREATE TABLE IF NOT EXISTS streak_freezes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    usedForDate TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(userId, usedForDate)
  )
`);

createIndexes([
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)",
  "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(lastActiveAt)",
  "CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(senderId, receiverId, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_messages_receiver_seen ON messages(receiverId, seen, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(userId, checkInDate)",
  "CREATE INDEX IF NOT EXISTS idx_coach_messages_user_created ON coach_messages(userId, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(userId, sessionDate)",
  "CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON meal_entries(userId, mealDate)",
  "CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(userId, earnedAt)",
  "CREATE INDEX IF NOT EXISTS idx_user_xp_log_user ON user_xp_log(userId, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON activity_log(userId, createdAt)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_unique_action ON blocks(accuserId, accusedId, type)",
  "CREATE INDEX IF NOT EXISTS idx_blocks_lookup ON blocks(accuserId, accusedId, type)",
  "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(userId)",
  "CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id ON password_reset_otps(userId)",
  "CREATE INDEX IF NOT EXISTS idx_match_interactions_viewer ON match_interactions(viewerId, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_match_interactions_viewed ON match_interactions(viewedId, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_workout_plans_user_active ON workout_plans(userId, isActive, generatedAt)",
  "CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_created ON daily_checkins(userId, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_body_metrics_user_logged ON body_metrics(userId, loggedAt)",
  "CREATE INDEX IF NOT EXISTS idx_groups_admin ON groups(adminId, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(groupId, joinedAt)",
  "CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(userId, joinedAt)",
  "CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(groupId, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_group_challenges_group ON group_challenges(groupId, endDate)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(userId, read, createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_streak_freezes_user ON streak_freezes(userId, createdAt)",
]);

console.log("Database ready for GymBuddy AI.");

export default db;
