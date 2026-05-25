import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const currentTimestamp = sql`CURRENT_TIMESTAMP`;

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    age: integer("age"),
    email: text("email").notNull(),
    passwordHash: text("passwordHash").notNull(),
    gym: text("gym"),
    goal: text("goal"),
    experience: text("experience"),
    preferredTime: text("preferredTime"),
    consistency: integer("consistency").default(0),
    streak: integer("streak").default(0),
    xp: integer("xp").default(0),
    level: integer("level").default(1),
    bio: text("bio").default(""),
    avatarUrl: text("avatarUrl"),
    city: text("city"),
    locationLabel: text("locationLabel"),
    locationPlaceId: text("locationPlaceId"),
    locationLat: real("locationLat"),
    locationLng: real("locationLng"),
    lastCheckIn: text("lastCheckIn"),
    lastCheckinTime: text("lastCheckinTime"),
    lastActiveAt: text("lastActiveAt"),
    lastSeenAt: text("lastSeenAt"),
    streakFreezeCount: integer("streakFreezeCount").default(0),
    lastStreakFreezeAt: text("lastStreakFreezeAt"),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
    lastActiveIdx: index("users_last_active_idx").on(table.lastActiveAt),
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    senderId: integer("senderId").notNull().references(() => users.id),
    receiverId: integer("receiverId").notNull().references(() => users.id),
    message: text("message").notNull(),
    seen: integer("seen").default(0),
    seenAt: text("seenAt"),
    deliveredAt: text("deliveredAt"),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    pairIdx: index("messages_pair_idx").on(table.senderId, table.receiverId, table.createdAt),
    receiverSeenIdx: index("messages_receiver_seen_idx").on(table.receiverId, table.seen, table.createdAt),
  })
);

export const groups = sqliteTable(
  "groups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    goal: text("goal").notNull(),
    adminId: integer("adminId").notNull().references(() => users.id),
    inviteCode: text("inviteCode").notNull(),
    maxMembers: integer("maxMembers").default(6),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    inviteCodeIdx: uniqueIndex("groups_invite_code_idx").on(table.inviteCode),
    adminIdx: index("groups_admin_idx").on(table.adminId, table.createdAt),
  })
);

export const groupMembers = sqliteTable(
  "group_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("groupId").notNull().references(() => groups.id),
    userId: integer("userId").notNull().references(() => users.id),
    role: text("role").default("member"),
    joinedAt: text("joinedAt").default(currentTimestamp),
  },
  (table) => ({
    groupUserIdx: uniqueIndex("group_members_group_user_idx").on(table.groupId, table.userId),
    groupIdx: index("group_members_group_idx").on(table.groupId, table.joinedAt),
    userIdx: index("group_members_user_idx").on(table.userId, table.joinedAt),
  })
);

export const groupMessages = sqliteTable(
  "group_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("groupId").notNull().references(() => groups.id),
    senderId: integer("senderId").notNull().references(() => users.id),
    content: text("content").notNull(),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    groupIdx: index("group_messages_group_idx").on(table.groupId, table.createdAt),
  })
);

export const groupChallenges = sqliteTable(
  "group_challenges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("groupId").notNull().references(() => groups.id),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(),
    endDate: text("endDate").notNull(),
    winnerId: integer("winnerId").references(() => users.id),
    weeklyReset: integer("weeklyReset").default(0),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    groupIdx: index("group_challenges_group_idx").on(table.groupId, table.endDate),
  })
);

export const bodyMetrics = sqliteTable(
  "body_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    weight: real("weight").notNull(),
    bodyFat: real("bodyFat"),
    chest: real("chest"),
    waist: real("waist"),
    hips: real("hips"),
    arms: real("arms"),
    mood: integer("mood").notNull(),
    energy: integer("energy").notNull(),
    sleepHours: real("sleepHours").notNull(),
    waterGlasses: integer("waterGlasses").notNull(),
    loggedAt: text("loggedAt").notNull(),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userLoggedIdx: index("body_metrics_user_logged_idx").on(table.userId, table.loggedAt),
  })
);

export const coachMessages = sqliteTable(
  "coach_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    role: text("role").notNull(),
    content: text("content").notNull(),
    tokens: integer("tokens").default(0),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userCreatedIdx: index("coach_messages_user_created_idx").on(table.userId, table.createdAt),
  })
);

export const workoutPlans = sqliteTable(
  "workout_plans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    planData: text("planData").notNull(),
    generatedAt: text("generatedAt").default(currentTimestamp),
    isActive: integer("isActive").default(1),
  },
  (table) => ({
    userActiveIdx: index("workout_plans_user_active_idx").on(table.userId, table.isActive, table.generatedAt),
  })
);

export const dailyCheckins = sqliteTable(
  "daily_checkins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    mood: integer("mood").notNull(),
    energy: integer("energy").notNull(),
    soreness: integer("soreness").notNull(),
    aiAdvice: text("aiAdvice"),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userCreatedIdx: index("daily_checkins_user_created_idx").on(table.userId, table.createdAt),
  })
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    data: text("data"),
    read: integer("read").default(0),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userReadIdx: index("notifications_user_read_idx").on(table.userId, table.read, table.createdAt),
  })
);

export const userBadges = sqliteTable(
  "user_badges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    badgeId: text("badgeId").notNull(),
    badgeName: text("badgeName").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    xpReward: integer("xpReward").default(0),
    earnedAt: text("earnedAt").default(currentTimestamp),
  },
  (table) => ({
    userBadgeIdx: uniqueIndex("user_badges_user_badge_idx").on(table.userId, table.badgeId),
    userEarnedIdx: index("user_badges_user_earned_idx").on(table.userId, table.earnedAt),
  })
);

export const userXpLog = sqliteTable(
  "user_xp_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    totalAfter: integer("totalAfter").notNull(),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userCreatedIdx: index("user_xp_log_user_created_idx").on(table.userId, table.createdAt),
  })
);

export const checkins = sqliteTable(
  "checkins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    checkInDate: text("checkInDate").notNull(),
    xpAwarded: integer("xpAwarded").default(10),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userDateIdx: uniqueIndex("checkins_user_date_idx").on(table.userId, table.checkInDate),
  })
);

export const workoutSessions = sqliteTable(
  "workout_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    sessionDate: text("sessionDate").notNull(),
    workoutType: text("workoutType").notNull(),
    focusArea: text("focusArea").notNull(),
    durationMinutes: integer("durationMinutes").notNull(),
    intensity: text("intensity").notNull(),
    energy: integer("energy").default(3),
    notes: text("notes"),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userDateIdx: index("workout_sessions_user_date_idx").on(table.userId, table.sessionDate),
  })
);

export const mealEntries = sqliteTable(
  "meal_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    mealDate: text("mealDate").notNull(),
    mealType: text("mealType").notNull(),
    title: text("title").notNull(),
    calories: integer("calories").notNull().default(0),
    proteinGrams: real("proteinGrams").notNull().default(0),
    carbsGrams: real("carbsGrams").notNull().default(0),
    fatGrams: real("fatGrams").notNull().default(0),
    fiberGrams: real("fiberGrams").notNull().default(0),
    notes: text("notes"),
    imageUrl: text("imageUrl"),
    source: text("source").notNull().default("manual"),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userDateIdx: index("meal_entries_user_date_idx").on(table.userId, table.mealDate),
  })
);

export const activityLog = sqliteTable(
  "activity_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    actionType: text("actionType").notNull(),
    metadata: text("metadata"),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userCreatedIdx: index("activity_log_user_created_idx").on(table.userId, table.createdAt),
  })
);

export const matchInteractions = sqliteTable(
  "match_interactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    viewerId: integer("viewerId").notNull().references(() => users.id),
    viewedId: integer("viewedId").notNull().references(() => users.id),
    action: text("action").notNull(),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    viewerIdx: index("match_interactions_viewer_idx").on(table.viewerId, table.createdAt),
    viewedIdx: index("match_interactions_viewed_idx").on(table.viewedId, table.createdAt),
  })
);

export const streakFreezes = sqliteTable(
  "streak_freezes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull().references(() => users.id),
    usedForDate: text("usedForDate").notNull(),
    createdAt: text("createdAt").default(currentTimestamp),
  },
  (table) => ({
    userDateIdx: uniqueIndex("streak_freezes_user_date_idx").on(table.userId, table.usedForDate),
    userCreatedIdx: index("streak_freezes_user_created_idx").on(table.userId, table.createdAt),
  })
);
